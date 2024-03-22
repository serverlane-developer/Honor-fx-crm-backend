import { Response } from "express";

import { v4 } from "uuid";
import moment from "moment";
import logger from "../../../utils/logger";
import { CustomerRequest } from "../../../@types/Express";

import * as depositRepo from "../../../db_services/deposit_repo";
import * as pgRepo from "../../../db_services/payin_gateway_repo";
import * as mt5UserRepo from "../../../db_services/mt5_user_repo";

import validators from "../../../validators";
import { knex } from "../../../data/knex";
import { Deposit } from "../../../@types/database";
import helpers from "../../../helpers/helpers";
import { Status } from "../../../@types/database/Deposit";
import { PayinServices, payinHelper } from "../../../services/payin";
import { count } from "../../../@types/Knex";
import depositHelper from "../../../helpers/deposit";

const createDeposit = async (req: CustomerRequest, res: Response) => {
  const { customer_id, requestId, customer, body } = req;
  const ip = helpers.getIp(req);
  const trx = await knex.transaction();
  try {
    const { amount, mt5_user_id, pg_id } = body;

    if (!customer_id || !customer) {
      await trx.rollback();
      return res.status(400).json({
        status: false,
        message: "Customer ID is required",
        data: null,
      });
    }
    const validator = validators.deposit.depositRequest.validate({
      amount,
      mt5_user_id,
      customer_id,
      pg_id,
    });
    if (validator.error) {
      await trx.rollback();
      const message = validator.error.message;
      logger.debug("Validation error while creating deposit", { body, message, requestId });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const mt5User = await mt5UserRepo.getMt5UserById(mt5_user_id);
    if (!mt5User) {
      await trx.rollback();
      const message = "MT5 User not found";
      logger.debug(message, { body, message, requestId });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    if (mt5User.customer_id !== customer_id) {
      await trx.rollback();
      const message = "MT5 User not found";
      logger.debug(message, { body, message, requestId });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const pg = await pgRepo.getPayinGatewayById(pg_id);
    if (!pg) {
      const message = "Payment Gateway nor found";
      logger.debug(message, { message, requestId });
      await trx.rollback();
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const pg_order_id = await depositRepo.getUniqueOrderId();
    if (!pg_order_id) {
      const message = "Error while generating Pg Order ID";
      logger.debug(message, { message, requestId });
      await trx.rollback();
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }
    const transaction_id = v4();
    const transaction: Partial<Deposit> = {
      amount,
      transaction_type: "normal",
      customer_id,
      ip,
      status: Status.PROCESSING,
      mt5_status: Status.PENDING,
      payin_status: Status.PROCESSING,
      pg_id,
      mt5_user_id,
      pg_order_id,
    };

    const { pg_service } = pg;

    const paymentData = payinHelper.createPayinData(pg_order_id, transaction, customer, pg, requestId);
    if (!paymentData) {
      const message = "Unable to create Payment Data to initate transaction on Gateway";
      logger.debug(message, { message, requestId, amount });
      await trx.rollback();
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const urlRes = await PayinServices[pg_service].getUrl(pg, paymentData, requestId);

    if (!urlRes.data) {
      const message = "Unable to create payin request object";
      logger.debug(message, { message, requestId, amount });
      await trx.rollback();
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    // if (!url.status || !url.url) {
    //   const message = "Unable to payin URL";
    //   logger.debug(message, { message, requestId, amount });
    //   await trx.rollback();
    //   return res.status(400).json({
    //     status: false,
    //     message,
    //     data: null,
    //   });
    // }

    await depositRepo.createTransaction(transaction, transaction_id, { trx });
    await trx.commit();

    await depositHelper.addTransactionOnMt5(transaction_id, mt5_user_id, requestId);

    return res.status(200).json({ status: true, message: "Deposit Created", data: urlRes.data });
  } catch (err) {
    await trx.rollback();
    const message = "Error while creating deposit";
    logger.error(message, { err, customer_id, requestId, body });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getDepositList = async (req: CustomerRequest, res: Response) => {
  const { customer_id, requestId, customer, params, query } = req;
  const { status } = params;
  try {
    if (!customer_id || !customer) {
      return res.status(400).json({
        status: false,
        message: "Customer ID is required",
        data: null,
      });
    }
    const validator = validators.withdraw.status.validate(status);
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Invalid Transaction Status", { message, requestId, params, customer_id, query });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }
    const { limit: qLimit, skip: qSkip, mt5_user_id: qMt5UserId, from_date: qFromDate, to_date: qToDate } = query;
    const limit = Number(qLimit || 0) || 0;
    const skip = Number(qSkip || 0) || 0;
    const mt5_user_id = String(qMt5UserId || "");
    const from_date = qFromDate ? moment(String(qFromDate || "")).format("YYYY-MM-DD 00:00:00") : null;
    const to_date = qToDate ? moment(String(qToDate || "")).format("YYYY-MM-DD 23:59:59") : null;

    const transactions = (await depositRepo.getCustomerTransactions({
      limit,
      skip,
      status,
      order: status === "pending" ? "created_at" : "updated_at",
      dir: status === "pending" ? "asc" : "desc",
      customer_id,
      mt5_user_id,
      from_date,
      to_date,
    })) as Partial<Deposit>[];
    let count = 0;

    if (transactions?.length) {
      const total = (await depositRepo.getCustomerTransactions({
        limit: null,
        skip: null,
        totalRecords: true,
        status,
        customer_id,
        mt5_user_id,
        from_date,
        to_date,
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
    logger.error(message, { err, requestId, params, query, customer_id });
    return res.status(500).json({
      status: false,
      message,
    });
  }
};

export default {
  createDeposit,
  getDepositList,
};
