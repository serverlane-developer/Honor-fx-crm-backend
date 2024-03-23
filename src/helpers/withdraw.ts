import { v4 } from "uuid";
import axios from "axios";
import { knex } from "../data/knex";

import { Status, payment_req_method } from "../@types/database/Withdraw";
import { requestId } from "../@types/Common";

import logger from "../utils/logger";

import { PayoutServices, payoutHelper } from "../services/payout";

import * as withdrawRepo from "../db_services/withdraw_repo";
import * as pgRepo from "../db_services/payout_gateway_repo";
import * as pgTransactionsRepo from "../db_services/pg_transaction_repo";
import * as customerRepo from "../db_services/customer_repo";
import * as paymentMethodRepo from "../db_services/customer_payment_method_repo";
import * as mt5UserRepo from "../db_services/mt5_user_repo";

import mt5 from "../services/mt5";
import { getPaymentMethod } from "./paymentMethodHelper";

const addTransactionOnMt5 = async (transaction_id: string, mt5_user_id: string, requestId: requestId) => {
  const trx = await knex.transaction();
  logger.debug("Adding Transaction on Mt5 Server", { requestId, transaction_id });
  try {
    const transaction = await withdrawRepo.getTransactionById(transaction_id, { trx });
    if (!transaction) {
      await trx.rollback();
      return { status: false, message: "Transaction not Found", data: null };
    }

    const mt5_user = await mt5UserRepo.getMt5UserById(mt5_user_id);
    if (!mt5_user) {
      await trx.rollback();
      return { status: false, message: "MT5 User not Found", data: null };
    }

    const response = await mt5.api.withdraw(mt5_user.mt5_id, transaction.amount, requestId);
    if (!response.status || !response.result) {
      await withdrawRepo.updateTransaction(
        { transaction_id },
        {
          status: Status.FAILED,
          mt5_status: Status.FAILED,
          mt5_message: response.message,
          payout_status: Status.FAILED,
        },
        { trx }
      );
      await trx.commit();
      return { status: false, data: response, message: "Failed to withdraw from Mt5" };
    }

    const { dealid, equity, freemargin, margin } = response.result;
    await withdrawRepo.updateTransaction(
      { transaction_id },
      {
        dealid: String(dealid),
        equity: String(equity),
        freemargin: String(freemargin),
        margin: String(margin),
        status: Status.PROCESSING,
        mt5_status: Status.SUCCESS,
        mt5_message: response.message,
        payout_status: Status.PENDING,
      },
      { trx }
    );

    await trx.commit();
    return { status: true, data: response, message: "Added Transaction on MT5 Server" };
  } catch (err) {
    await trx.rollback();
    let message = "Error while adding Transaction on Mt5 Server";
    if (axios.isAxiosError(err)) {
      message = err.response?.data?.error || JSON.stringify(err.response?.data);
    } else if (err instanceof Error) {
      message = err.message;
    }

    logger.error(message, { err, requestId, transaction_id });
    return { status: false, message, data: null };
  }
};

const addTransactionOnGateway = async (transaction_id: string, requestId: requestId) => {
  const trx = await knex.transaction();
  logger.debug("Adding Transaction on Gateway", { requestId, transaction_id });
  const pg_order_id = v4();
  let initiated = false;
  try {
    const transaction = await withdrawRepo.getTransactionById(transaction_id, { trx });

    if (!transaction) {
      const message = "Transaction not found";
      logger.debug(message, { message, requestId });
      await trx.rollback();
      return {
        status: false,
        message,
        data: null,
      };
    }

    if (transaction?.status !== "pending" || transaction?.pg_task !== false || transaction?.pg_order_id) {
      const message = "Looks like Transaction is already on gateway";
      logger.debug(message, { message, requestId });
      await trx.rollback();
      return {
        status: false,
        message,
        data: null,
      };
    }

    if (transaction.mt5_status !== Status.SUCCESS) {
      const message = "Transaction is not yet successful on mt5";
      logger.debug(message, { requestId, transaction });
      return {
        status: false,
        message,
        data: null,
      };
    }

    const { customer_id, payment_method_id } = transaction;
    const customer = await customerRepo.getCustomerById(customer_id);
    if (!customer) {
      const message = "Customer not found";
      logger.debug(message, { message, requestId });
      await trx.rollback();
      return {
        status: false,
        message,
        data: null,
      };
    }

    const customerPaymentMethod = await paymentMethodRepo.getPaymentMethodById(payment_method_id);
    if (!customerPaymentMethod) {
      const message = "Payment Method not found";
      logger.debug(message, { message, requestId });
      await trx.rollback();
      return {
        status: false,
        message,
        data: null,
      };
    }
    const decryptedPaymentMethod = getPaymentMethod(customerPaymentMethod, "decrypt");

    const amount = Number(transaction?.amount);

    const { pg_id } = transaction;
    if (!pg_id) {
      const message = "No Payment Gateway found on Transaction";
      logger.debug(message, { message, requestId });
      await trx.rollback();
      return {
        status: false,
        message,
        data: null,
      };
    }

    const pg = await pgRepo.getPayoutGatewayById(pg_id, { trx });
    if (!pg) {
      const message = "Payment gateway not found";
      logger.debug(message, { message, requestId });
      await trx.rollback();
      return {
        status: false,
        message,
        data: null,
      };
    }

    const threshold = Number(pg.threshold_limit);
    if (amount > threshold) {
      const message = "Amount is More than Payment Gateway threshold";
      logger.debug(message, { message, requestId, threshold, amount });
      await trx.rollback();
      return {
        status: false,
        message,
        data: null,
      };
    }

    const paymentMethod = pgRepo.getPaymentMethod(pg, amount);
    if (!paymentMethod) {
      const message = "Payment Gateway has no Payment Methods for this amount";
      logger.debug(message, { message, requestId, amount, paymentMethod, pg });
      await trx.rollback();
      return {
        status: false,
        message,
        data: null,
      };
    }

    const { pg_service } = pg;

    const paymentData = payoutHelper.createPaymentData(
      pg_order_id,
      transaction,
      customer,
      decryptedPaymentMethod,
      paymentMethod,
      requestId
    );
    if (!paymentData) {
      const message = "Unable to create Payment Data to initate transaction on Gateway";
      logger.debug(message, { message, requestId, amount });
      await trx.rollback();
      return {
        status: false,
        message,
        data: null,
      };
    }

    const transferRes = await PayoutServices[pg_service].accountTransfer(pg, paymentData, requestId);
    initiated = true;

    if (transferRes.status) {
      logger.debug(`Account Transfer Success`, { requestId, transfer: transferRes });
      const payment_order_id = transferRes?.data?.rrn;

      const updatedTxn = await withdrawRepo.updateTransaction(
        {
          transaction_id,
        },
        {
          status: Status.PROCESSING,
          payment_status: transferRes.payment_status,
          pg_order_id,
          pg_id,
          pg_task: true,
          ...(payment_order_id && { payment_order_id }),
        },
        { trx }
      );
      logger.debug(`Updated Withdraw Transaction`, { data: updatedTxn, requestId });

      const pgTransactionObject = {
        transaction_id,
        payment_status: transferRes.payment_status,
        pg_id,
        payment_req_method: paymentMethod,
        under_processing: true,
        pg_order_id,
        ...(payment_order_id && { payment_order_id }),
      };

      const pgTransaction = await pgTransactionsRepo.createPgTransaction(pgTransactionObject, pg_order_id, { trx });
      logger.debug(`PG Transaction object`, { data: pgTransaction, requestId });
    } else {
      logger.debug(`Account Transfer Failed`, { requestId, transfer: transferRes });
      const updatedTxn = await withdrawRepo.updateTransaction(
        { transaction_id },
        {
          status: Status.PENDING,
          payment_fail_count: Number(transaction.payment_fail_count || 0) + 1,
          pg_task: false,
          api_error: transferRes.message,
          pg_order_id: null,
        },
        { trx }
      );
      logger.debug(`Updated Withdraw Transaction`, { data: updatedTxn, requestId });

      const pgTransactionObject = {
        transaction_id,
        payment_status: transferRes.payment_status,
        pg_id,
        payment_req_method: paymentMethod,
        api_error: transferRes.message,
        payment_fail_count: transaction.payment_fail_count === null ? 1 : Number(transaction.payment_fail_count) + 1,
      };

      const pgTransaction = await pgTransactionsRepo.createPgTransaction(pgTransactionObject, pg_order_id, { trx });
      logger.debug(`PG Transaction object`, { data: pgTransaction, requestId });
    }
    const message = `Transaction Initiated on Gateway`;
    logger.debug(message, { requestId, transaction, transferRes });
    await trx.commit();
    return { status: true, message, data: transferRes };
  } catch (err) {
    logger.error("Error while adding transaction on gateway", { requestId, err });
    if (!initiated) await trx.rollback();
    else {
      // const isGatewayException = (err as { gatewayException?: boolean }).gatewayException;
      let message = `Something went Wrong!\nFailed on Payment Gateway`;
      if (err instanceof Error && err.message) message = err.message;
      const updatedTxn = await withdrawRepo.updateTransaction(
        { transaction_id },
        {
          status: Status.PROCESSING,
          api_error: message + `\nFailed on Payment Gateway | Request Id: ${requestId}`,
          pg_task: true,
          pg_order_id,
          payout_message: "NOT SURE IF PAYMENT IS COMPLETED!!!. CHECK PAYEMENT STATUS IN PAYMENT GATEWAY DASHBOARD",
          payment_status: "PENDING",
        },
        { trx }
      );

      if (updatedTxn) {
        const pgTransactionObject = {
          transaction_id,
          payment_status: "PENDING",
          pg_id: updatedTxn.pg_id as string,
          payment_req_method: updatedTxn.payment_req_method as payment_req_method,
          under_processing: true,
          payment_fail_count: 1,
        };
        await pgTransactionsRepo.createPgTransaction(pgTransactionObject, pg_order_id, { trx });
      }
      return { status: false, message, data: null };
    }
    const message = "Error while adding Transaction";
    logger.error(message, { err, requestId, transaction_id });
    return { status: false, message, data: null };
  }
};

export default { addTransactionOnMt5, addTransactionOnGateway };
