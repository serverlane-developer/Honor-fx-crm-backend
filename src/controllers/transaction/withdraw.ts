import { Response } from "express";
import moment from "moment-timezone";
import { AdminRequest } from "../../@types/Express";
import logger from "../../utils/logger";
import withdrawHelper from "../../helpers/withdraw";

import * as withdrawRepo from "../../db_services/withdraw_repo";
import * as pgTransactionsRepo from "../../db_services/pg_transaction_repo";
import * as pgRepo from "../../db_services/payout_gateway_repo";
import { PayoutServices, payoutHelper } from "../../services/payout";
import validators from "../../validators";
import { Withdraw } from "../../@types/database";
import { count } from "../../@types/Knex";
import { Status } from "../../@types/database/Withdraw";
import config from "../../config";
import { getPaymentMethod } from "../../helpers/paymentMethodHelper";

const updatePaymentStatus = async (req: AdminRequest, res: Response) => {
  const { params, requestId, user_id } = req;
  const { pg_order_id } = params;
  try {
    const transaction = await withdrawRepo.getTransactionByFilter({ pg_order_id });

    if (!transaction) {
      const message = "Transaction not found in database";
      logger.debug(message, { requestId, transaction, user_id, params });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    if (!transaction.pg_id) {
      const message = "Transaction was not sent to Gateway";
      logger.debug(message, { requestId, transaction, user_id, params });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    if (transaction.mt5_status !== Status.SUCCESS) {
      const message = "Transaction is not yet successful on mt5";
      logger.debug(message, { requestId, transaction, user_id, params });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const pg = await pgRepo.getPayoutGatewayByFilter({ pg_id: transaction.pg_id });
    if (!pg) {
      const message = "Payment Gateway not found";
      logger.debug(message, { requestId, transaction, user_id, params });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }
    const { pg_service } = pg;

    const data = await PayoutServices[pg_service].getTransationStatus(pg, pg_order_id, requestId);

    const paymentStatus = await payoutHelper.updatePaymentStatus(data, pg_order_id, requestId, pg_service, false);

    logger.debug("UPDATED PAYMENT STATUS", { paymentStatus, requestId });

    return res.status(200).json({
      status: true,
      message: paymentStatus.message,
      data: null,
    });
  } catch (err) {
    const message = "Error while updating payment status";
    logger.error(message, { err, requestId });
    return res.status(500).json({
      status: false,
      message,
    });
  }
};

const getTransactions = async (req: AdminRequest, res: Response) => {
  const { params, requestId, user_id, query } = req;
  const { status } = params;
  try {
    const validator = validators.withdraw.status.validate(status);
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Invalid Transaction Status", { message, requestId, params, user_id, query });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }
    const { limit: qLimit, skip: qSkip, search: qSearch } = query;
    const limit = Number(qLimit || 0) || 0;
    const skip = Number(qSkip || 0) || 0;
    const search = String(qSearch || "");

    let transactions = (await withdrawRepo.getAllTransactions({
      limit,
      skip,
      status,
      order: status === "pending" ? "created_at" : "updated_at",
      dir: status === "pending" ? "asc" : "desc",
      search,
    })) as Partial<Withdraw>[];
    let count = 0;

    if (transactions?.length) {
      transactions = transactions.map((transaction) => {
        transaction = getPaymentMethod(transaction, "decrypt");
        transaction.payment_creation_date =
          transaction.payment_creation_date || moment(transaction?.created_at).tz(config.TIMEZONE).format("lll");
        return transaction;
      });
      const total = (await withdrawRepo.getAllTransactions({
        limit: null,
        skip: null,
        totalRecords: true,
        status,
        search,
      })) as count;
      count = Number(total?.count);
    }

    return res
      .header("Access-Control-Expose-Headers", "x-total-count")
      .setHeader("x-total-count", count)
      .status(200)
      .json({
        status: true,
        message: "Transactions Fetched Successfully",
        data: { transactions },
      });
  } catch (err) {
    const message = "Error while getting transactions";
    logger.error(message, { err, requestId, params, query, user_id });
    return res.status(500).json({
      status: false,
      message,
    });
  }
};

const retryPayout = async (req: AdminRequest, res: Response) => {
  const { params, requestId, user_id, query } = req;
  const { transaction_id } = params;
  try {
    const validator = validators.common.uuid.required().validate(transaction_id);
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Invalid Transaction ID to retry on gateway", { message, requestId, params, user_id, query });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const retryRes = await withdrawHelper.addTransactionOnGateway(transaction_id, requestId);

    return res.status(200).json({
      status: true,
      message: "Transactions Retried on Gateway",
      data: retryRes,
    });
  } catch (err) {
    const message = "Error while retrying transactions";
    logger.error(message, { err, requestId, params, user_id });
    return res.status(500).json({
      status: false,
      message,
    });
  }
};

const getTransactionHistory = async (req: AdminRequest, res: Response) => {
  const { params, requestId, user_id, query } = req;
  const { transaction_id } = params;
  try {
    const validator = validators.common.uuid.validate(transaction_id);
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Invalid Transaction Id", { message, requestId, params, user_id, query });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }
    const { limit: qLimit, skip: qSkip } = query;
    const limit = Number(qLimit || 0) || 0;
    const skip = Number(qSkip || 0) || 0;

    const history = (await withdrawRepo.getTransactionHistory({
      limit,
      skip,
      id: transaction_id,
    })) as Partial<Withdraw>[];
    let count = 0;

    if (history?.length) {
      const total = (await withdrawRepo.getTransactionHistory({
        limit: null,
        skip: null,
        totalRecords: true,
        id: transaction_id,
      })) as count;
      count = Number(total?.count);
    }

    return res
      .header("Access-Control-Expose-Headers", "x-total-count")
      .setHeader("x-total-count", count)
      .status(200)
      .json({
        status: true,
        message: "Transaction History Fetched Successfully",
        data: history,
      });
  } catch (err) {
    const message = "Error while getting Transaction History";
    logger.error(message, { err, requestId, params, query, user_id });
    return res.status(500).json({
      status: false,
      message,
    });
  }
};

const getPaymentHistory = async (req: AdminRequest, res: Response) => {
  const { params, requestId, user_id, query } = req;
  const { transaction_id } = params;
  try {
    const validator = validators.common.uuid.validate(transaction_id);
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Invalid Transaction Id", { message, requestId, params, user_id, query });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const transaction = await withdrawRepo.getTransactionById(transaction_id);
    if (!transaction) {
      const message = "Transaction not found in database";
      logger.debug(message, { requestId, transaction, user_id, params });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const history = await pgTransactionsRepo.getPgOrderIdHistory(transaction_id);

    return res.status(200).json({
      status: true,
      message: "Payment Transaction History Fetched Successfully",
      data: history,
    });
  } catch (err) {
    const message = "Error while getting Payment Transaction History";
    logger.error(message, { err, requestId, params, query, user_id });
    return res.status(500).json({
      status: false,
      message,
    });
  }
};

const updateMultiplePaymentStatus = async (req: AdminRequest, res: Response) => {
  const { body, requestId, user_id } = req;
  const { pg_order_ids } = body;
  try {
    if (!(pg_order_ids || []).filter((x: string) => x).length) {
      const message = "Pg Order Ids are required to update status";
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const result = [];

    let pg_order_id = "";
    for (let i = 0; i < pg_order_ids.length; i++) {
      pg_order_id = pg_order_ids[i];
      const transaction = await withdrawRepo.getTransactionByFilter({ pg_order_id });

      if (!transaction) {
        const message = "Transaction not found in database";
        result.push({
          status: false,
          message,
          data: null,
        });
        continue;
      }

      if (!transaction.pg_id) {
        const message = "Transaction was not sent to Gateway";
        result.push({
          status: false,
          message,
          data: null,
        });
        continue;
      }

      const pg = await pgRepo.getPayoutGatewayByFilter({ pg_id: transaction.pg_id });
      if (!pg) {
        const message = "Payment Gateway not found";
        result.push({
          status: false,
          message,
          data: null,
        });
        continue;
      }
      const { pg_service } = pg;

      const data = await PayoutServices[pg_service].getTransationStatus(pg, pg_order_id, requestId);

      const paymentStatus = await payoutHelper.updatePaymentStatus(data, pg_order_id, requestId, pg_service);

      logger.debug("UPDATED PAYMENT STATUS", { paymentStatus, requestId });
      result.push({
        status: true,
        message: "Updated Payements Status",
        data: paymentStatus,
      });
    }

    const count = pg_order_ids.length;
    const successful = result.filter((x) => x.status).length;
    const failed = count - successful;

    return res.status(200).json({
      status: true,
      message: `Updated Payments Status | ${successful} successfull | ${failed} failed`,
      data: result,
    });
  } catch (err) {
    const message = "Error while updating multiple payment status";
    logger.error(message, { err, requestId, body, user_id });
    return res.status(500).json({
      status: false,
      message,
    });
  }
};

const updatePgTransactionStatus = async (req: AdminRequest, res: Response) => {
  const { params, requestId, user_id } = req;
  const { pg_order_id } = params;
  try {
    const transaction = await pgTransactionsRepo.getPgTransactionById(pg_order_id);

    if (!transaction) {
      const message = "Transaction not found in database";
      logger.debug(message, { requestId, transaction, user_id, params });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    if (!transaction.pg_id) {
      const message = "Transaction was not sent to Gateway";
      logger.debug(message, { requestId, transaction, user_id, params });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const pg = await pgRepo.getPayoutGatewayByFilter({ pg_id: transaction.pg_id });
    if (!pg) {
      const message = "Payment Gateway not found";
      logger.debug(message, { requestId, transaction, user_id, params });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }
    const { pg_service } = pg;

    const data = await PayoutServices[pg_service].getTransationStatus(pg, pg_order_id, requestId);

    const paymentStatus = await payoutHelper.updatePaymentStatus(data, pg_order_id, requestId, pg_service, true);

    logger.debug("UPDATED PG TRANSACTION STATUS", { paymentStatus, requestId, data });

    return res.status(200).json({
      status: true,
      message: paymentStatus.message,
      data: null,
    });
  } catch (err) {
    const message = "Error while updating pg transaction status";
    logger.error(message, { err, requestId });
    return res.status(500).json({
      status: false,
      message,
    });
  }
};

const resolveTransaction = async (req: AdminRequest, res: Response) => {
  const { params, requestId, user_id, body } = req;
  const { transaction_id } = params;
  try {
    const { status, message } = body;
    const validator = validators.withdraw.updateTransactionStatus
      .required()
      .validate({ transaction_id, status, message });
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("approve transaction, id validation error", { message, requestId, params, user_id });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const transaction = await withdrawRepo.getTransactionByFilter({ transaction_id });
    if (!transaction) {
      const message = "Transaction not found in database";
      logger.debug(message, { requestId, transaction, user_id, params });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    if (transaction.status !== Status.PENDING) {
      const message = "Transaction is not pending";
      logger.debug(message, { requestId, transaction, user_id, params });
      return res.status(400).json({
        status: true,
        message,
        data: null,
      });
    }

    if (transaction.mt5_status !== Status.PENDING) {
      const message = "Transaction was resolved from mt5";
      logger.debug(message, { requestId, transaction, user_id, params });
      return res.status(400).json({
        status: true,
        message,
        data: null,
      });
    }

    if (status === Status.FAILED) {
      await withdrawRepo.updateTransaction(
        { transaction_id },
        {
          status: Status.FAILED,
          mt5_status: Status.FAILED,
          payout_status: Status.FAILED,
          updated_by: user_id,
          admin_message: message,
        }
      );
      return res.status(200).json({
        status: true,
        message: "Successfully rejected transaction",
        data: null,
      });
    }

    const response = await withdrawHelper.addTransactionOnMt5(
      transaction_id,
      transaction.mt5_user_id,
      user_id as string,
      requestId
    );
    const isSuccess = response.status;
    if (isSuccess) {
      await withdrawHelper.addTransactionOnGateway(transaction_id, requestId);
    }
    return res.status(isSuccess ? 200 : 400).json({
      status: isSuccess,
      message: response.message,
      data: response.data,
    });
  } catch (err) {
    const message = "Error while marking transaction as Acknowledged";
    logger.error(message, { err, requestId, transaction_id, user_id });
    return res.status(500).json({
      status: false,
      message,
    });
  }
};

export default {
  updatePaymentStatus,
  updateMultiplePaymentStatus,
  updatePgTransactionStatus,
  getTransactions,
  retryPayout,
  getTransactionHistory,
  getPaymentHistory,
  resolveTransaction,
};
