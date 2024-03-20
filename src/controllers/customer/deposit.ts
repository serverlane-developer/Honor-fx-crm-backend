import { Response } from "express";

import { v4 } from "uuid";
import logger from "../../utils/logger";
import { CustomerRequest } from "../../@types/Express";

import * as depositRepo from "../../db_services/deposit_repo";
import * as pgRepo from "../../db_services/payin_gateway_repo";
import * as mt5UserRepo from "../../db_services/mt5_user_repo";

import validators from "../../validators";
import { knex } from "../../data/knex";
import { Deposit } from "../../@types/database";
import helpers from "../../helpers/helpers";
import { Status } from "../../@types/database/Deposit";

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

    const transaction_id = v4();
    const transaction: Partial<Deposit> = {
      amount,
      transaction_type: "normal",
      customer_id,
      ip,
      status: Status.PENDING,
      mt5_status: Status.PENDING,
      payin_status: Status.PENDING,
      pg_id,
      mt5_user_id,
    };

    await depositRepo.createTransaction(transaction, transaction_id, { trx });
    await trx.commit();

    return res.status(200).json({ status: true, message: "Deposit Created.", data: transaction });
  } catch (err) {
    if (!trx.isCompleted()) await trx.rollback();
    const message = "Error while creating deposit";
    logger.error(message, { err, customer_id, requestId, body });
    return res.status(500).json({ status: false, message, data: null });
  }
};

export default {
  createDeposit,
};
