import { Response } from "express";

import { v4 } from "uuid";
import logger from "../../../utils/logger";
import { CustomerRequest } from "../../../@types/Express";

import * as paymentMethodRepo from "../../../db_services/customer_payment_method_repo";
import * as withdrawRepo from "../../../db_services/withdraw_repo";
import * as pgRepo from "../../../db_services/payout_gateway_repo";
import * as mt5UserRepo from "../../../db_services/mt5_user_repo";

import validators from "../../../validators";
import { knex } from "../../../data/knex";
import { Withdraw } from "../../../@types/database";
import helpers from "../../../helpers/helpers";
import { Status } from "../../../@types/database/Withdraw";

const createWithdraw = async (req: CustomerRequest, res: Response) => {
  const { customer_id, requestId, customer, body } = req;
  const ip = helpers.getIp(req);
  const trx = await knex.transaction();
  try {
    const { amount, payment_method_id, pg_id, mt5_user_id } = body;

    if (!customer_id || !customer) {
      await trx.rollback();
      return res.status(400).json({
        status: false,
        message: "Customer ID is required",
        data: null,
      });
    }
    const validator = validators.withdraw.withdrawRequest.validate({
      amount,
      payment_method_id,
      customer_id,
      pg_id,
      mt5_user_id,
    });
    if (validator.error) {
      await trx.rollback();
      const message = validator.error.message;
      logger.debug("Validation error while creating withdraw", { body, message, requestId });
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

    const paymentMethod = await paymentMethodRepo.getPaymentMethodById(payment_method_id);
    if (!paymentMethod) {
      await trx.rollback();
      const message = "Payment Method not found";
      logger.debug(message, { body, message, requestId });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const pg = await pgRepo.getPayoutGatewayById(pg_id);
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

    const threshold = Number(pg.threshold_limit);
    if (amount > threshold) {
      const message = "Amount is More than Payment Gateway threshold";
      logger.debug(message, { message, requestId, threshold, amount });
      await trx.rollback();
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const payment_req_method = pgRepo.getPaymentMethod(pg, amount);
    if (!payment_req_method) {
      const message = "Payment Gateway has no Payment Methods for this amount";
      logger.debug(message, { message, requestId, amount, payment_req_method, pg });
      await trx.rollback();
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const transaction_id = v4();
    const transaction: Partial<Withdraw> = {
      amount,
      transaction_type: "normal",
      customer_id,
      ip,
      status: Status.PENDING,
      mt5_status: Status.PENDING,
      payout_message: Status.PENDING,
      pg_id,
      payment_method_id,
      mt5_user_id,
    };

    await withdrawRepo.createTransaction(transaction, transaction_id, { trx });
    await trx.commit();

    // const mt5Result = await withdrawHelper.addTransactionOnMt5(transaction_id, requestId);
    // if (!mt5Result.status) {
    //   return res
    //     .status(400)
    //     .json({ status: false, message: "Error Withdraw from MT5", data: { transaction, mt5Result } });
    // }
    // const payoutResult = await withdrawHelper.addTransactionOnGateway(transaction_id, requestId);
    // if (!payoutResult.status) {
    //   return res.status(400).json({
    //     status: false,
    //     message: "Withdraw Successful form MT5 but error on payout",
    //     data: { transaction, mt5Result, payoutResult },
    //   });
    // }

    return res.status(200).json({ status: true, message: "Withdraw Created.", data: transaction });
  } catch (err) {
    if (!trx.isCompleted()) await trx.rollback();
    const message = "Error while creating withdraw";
    logger.error(message, { err, customer_id, requestId, body });
    return res.status(500).json({ status: false, message, data: null });
  }
};

export default {
  createWithdraw,
};
