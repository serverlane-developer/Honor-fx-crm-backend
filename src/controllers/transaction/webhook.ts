import { Response } from "express";
import { Request } from "../../@types/Express";
import logger from "../../utils/logger";

import { PayoutServices, payoutHelper } from "../../services/payout";
// import ismartpayService from "../../services/payout/ismartpay";
import zapayService from "../../services/payout/zapay";

import * as transanctionRepo from "../../db_services/withdraw_repo";
import * as pgRepo from "../../db_services/payout_gateway_repo";

import validators from "../../validators/common";
import { ISmartPay, PayAnyTime, ZaPay } from "../../@types/Payout";

import hashHelper from "../../helpers/hash";

const paycoons = async (req: Request, res: Response) => {
  const { body, requestId } = req;
  try {
    const id = body?.payout_ref || body?.transferId || body?.id;
    logger.debug("PAYCOONS WEBHOOK RECEIVED TO UPDATE PAYMENT STATUS", { body, id, requestId });

    /** PAYCOONS Webhook Response
    {
      status: "true",
      response_code: "1",
      message: "Transaction Successfull",
      payout_ref: "2154785412544",
      Amount: "100",
      rrn: "325487745521",
    }
    {
      status: "false",
      response_code: "2",
      message: "Transaction Failed",
      payout_ref: "1235478",
    }
     */

    const uuidValidator = validators.uuid.required().validate(id);

    if (uuidValidator.error?.message) {
      const message = "Invalid ID";
      logger.debug(message, { requestId, body });
      return res.status(400).json({ status: false, data: null, message });
    }

    const transaction = await transanctionRepo.getTransactionByFilter({ pg_order_id: id });

    if (!transaction) {
      const message = "Transaction not found in database";
      logger.debug(message, { requestId, transaction, body });
      return res.status(400).json({
        status: false,
        message,
        data: {},
      });
    }

    if (!transaction.pg_id) {
      const message = "Payment Gateway not found on Transaction";
      logger.debug(message, { requestId, transaction, body });
      return res.status(400).json({
        status: false,
        message,
        data: {},
      });
    }

    const pg = await pgRepo.getPayoutGatewayById(transaction.pg_id);
    if (!pg) {
      const message = "Payment Gateway not found";
      logger.debug(message, { requestId, transaction, body });
      return res.status(400).json({
        status: false,
        message,
        data: {},
      });
    }

    // const data = body;
    const data = await PayoutServices.PAYCOONS.getTransationStatus(pg, id, requestId);

    const responseCode = data?.response_code;
    const isSuccess = Number(responseCode) === 1;

    const responseStatus = isSuccess ? "SUCCESS" : "FAILED";

    let status = body?.Status || responseStatus;
    status = (status || "ERROR").toUpperCase();

    const paymentStatus = await payoutHelper.updatePaymentStatus({ ...data, status }, id, requestId, "PAYCOONS");

    logger.debug("update transfer's status from  PAYCOONS WEBHOOK", { data, requestId, paymentStatus });

    return res.status(200).json({
      status: true,
      message: null,
      data: {},
    });
  } catch (err) {
    const message = "Error while updating payment status from paycoons webhook";
    logger.error(message, { err, requestId, body });
    return res.status(500).json({
      status: false,
      message,
      data: {},
    });
  }
};

const zapay = async (req: Request, res: Response) => {
  const { body, requestId, headers } = req;
  try {
    const hash = headers["hash"];

    const { Merchant_RefID } = body as ZaPay.Transaction;

    logger.debug("ZAPAY WEBHOOK RECEIVED TO UPDATE PAYMENT STATUS", { body, Merchant_RefID, requestId, headers });

    const uuidValidator = validators.uuid.required().validate(Merchant_RefID);

    if (uuidValidator.error?.message) {
      const message = "Invalid ID";
      logger.debug(message, { requestId, body });
      return res.status(400).json({ status: false, data: null, message });
    }

    const transaction = await transanctionRepo.getTransactionByFilter({ pg_order_id: Merchant_RefID });

    if (!transaction) {
      const message = "Transaction not found in database";
      logger.debug(message, { requestId, transaction, body });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    if (!transaction.pg_id) {
      const message = "Payment Gateway not found on Transaction";
      logger.debug(message, { requestId, transaction, body });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const pg = await pgRepo.getPayoutGatewayById(transaction.pg_id);
    if (!pg) {
      const message = "Payment Gateway not found";
      logger.debug(message, { requestId, transaction, body });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const { SECRET_KEY } = zapayService.getKeys(pg);
    const expectedHash = hashHelper.generateZapayHash(body, SECRET_KEY);

    if (expectedHash.toLowerCase() !== String(hash || "")?.toLowerCase()) {
      const message = "Invalid hash";
      logger.debug(message, { requestId, transaction, body, hash, expectedHash });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const data = await PayoutServices.ZAPAY.getTransationStatus(pg, Merchant_RefID, requestId);

    const paymentStatus = await payoutHelper.updatePaymentStatus(data, Merchant_RefID, requestId, "ZAPAY");

    logger.debug("update transfer's status from  Zapay WEBHOOK", { data, requestId, paymentStatus });

    return res.status(200).json({
      status: true,
      message: null,
      data: null,
    });
  } catch (err) {
    const message = "Error while updating payment status from Zapay webhook";
    logger.error(message, { err, requestId, body });
    return res.status(500).json({
      status: false,
      message,
    });
  }
};

const ismartpay = async (req: Request, res: Response) => {
  const { body, requestId } = req;
  try {
    const { order_id } = body as ISmartPay.WebhookBody;
    logger.debug("ISMARTPAY WEBHOOK RECEIVED TO UPDATE PAYMENT STATUS", { body, order_id, requestId });

    const uuidValidator = validators.uuid.required().validate(order_id);

    if (uuidValidator.error?.message) {
      const message = "Invalid ID";
      logger.debug(message, { requestId, body });
      return res.status(400).json({ status: false, data: null, message });
    }

    const transaction = await transanctionRepo.getTransactionByFilter({ pg_order_id: order_id });

    if (!transaction) {
      const message = "Transaction not found in database";
      logger.debug(message, { requestId, transaction, body });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    if (!transaction.pg_id) {
      const message = "Payment Gateway not found on Transaction";
      logger.debug(message, { requestId, transaction, body });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const pg = await pgRepo.getPayoutGatewayById(transaction.pg_id);
    if (!pg) {
      const message = "Payment Gateway not found";
      logger.debug(message, { requestId, transaction, body });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const data = await PayoutServices.ISMARTPAY.getTransationStatus(pg, order_id, requestId);

    const paymentStatus = await payoutHelper.updatePaymentStatus(data, order_id, requestId, "ISMARTPAY");

    logger.debug("update transfer's status from  ISmartPay WEBHOOK", { data, requestId, paymentStatus });

    return res.status(200).json({
      status: true,
      message: null,
      data: null,
    });
  } catch (err) {
    const message = "Error while updating payment status from ISmartPay webhook";
    logger.error(message, { err, requestId, body });
    return res.status(500).json({
      status: false,
      message,
    });
  }
};

const payanytime = async (req: Request, res: Response) => {
  const { body, requestId } = req;
  try {
    const { user_refer } = body as PayAnyTime.WebhookBody;
    logger.info("PAYANYTIME WEBHOOK RECEIVED TO UPDATE PAYMENT STATUS", { body, user_refer, requestId });

    const uuidValidator = validators.uuid.required().validate(user_refer);

    if (uuidValidator.error?.message) {
      const message = "Invalid ID";
      logger.info(message, { requestId, body });
      return res.status(400).json({ status: false, data: null, message });
    }

    const transaction = await transanctionRepo.getTransactionByFilter({ pg_order_id: user_refer });

    if (!transaction) {
      const message = "Transaction not found in database";
      logger.info(message, { requestId, transaction, body });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    if (!transaction.pg_id) {
      const message = "Payment Gateway not found on Transaction";
      logger.info(message, { requestId, transaction, body });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const pg = await pgRepo.getPayoutGatewayById(transaction.pg_id);
    if (!pg) {
      const message = "Payment Gateway not found";
      logger.info(message, { requestId, transaction, body });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const data = (await PayoutServices.PAYANYTIME.getTransationStatus(
      pg,
      user_refer,
      requestId
    )) as PayAnyTime.TransactionStatus;

    const paymentStatus = await payoutHelper.updatePaymentStatus(data, user_refer, requestId, "PAYANYTIME");

    logger.info("update transfer's status from  PayAnyTime WEBHOOK", { data, requestId, paymentStatus });

    return res.status(200).json({
      status: true,
      message: null,
      data: null,
    });
  } catch (err) {
    const message = "Error while updating payment status from PayAnyTime webhook";
    logger.error(message, { err, requestId, body });
    return res.status(500).json({
      status: false,
      message,
    });
  }
};

const finixpay = async (req: Request, res: Response) => {
  const { body, requestId } = req;
  try {
    const id = body?.payout_ref || body?.transferId || body?.id;
    logger.info("FINIXPAY WEBHOOK RECEIVED TO UPDATE PAYMENT STATUS", { body, id, requestId });

    const uuidValidator = validators.uuid.required().validate(id);

    if (uuidValidator.error?.message) {
      const message = "Invalid ID";
      logger.info(message, { requestId, body });
      return res.status(400).json({ status: false, data: null, message });
    }

    const transaction = await transanctionRepo.getTransactionByFilter({ pg_order_id: id });

    if (!transaction) {
      const message = "Transaction not found in database";
      logger.info(message, { requestId, transaction, body });
      return res.status(400).json({
        status: false,
        message,
        data: {},
      });
    }

    if (!transaction.pg_id) {
      const message = "Payment Gateway not found on Transaction";
      logger.info(message, { requestId, transaction, body });
      return res.status(400).json({
        status: false,
        message,
        data: {},
      });
    }

    const pg = await pgRepo.getPayoutGatewayById(transaction.pg_id);
    if (!pg) {
      const message = "Payment Gateway not found";
      logger.info(message, { requestId, transaction, body });
      return res.status(400).json({
        status: false,
        message,
        data: {},
      });
    }

    // const data = body;
    const data = await PayoutServices.FINIXPAY.getTransationStatus(pg, id, requestId);

    // const responseCode = data?.response_code;
    // const isSuccess = Number(responseCode) === 1;

    // const responseStatus = isSuccess ? "SUCCESS" : "FAILED";

    // let status = body?.Status || responseStatus;
    // status = (status || "ERROR").toUpperCase();

    const paymentStatus = await payoutHelper.updatePaymentStatus({ ...data }, id, requestId, "FINIXPAY");

    logger.info("update transfer's status from  FINIXPAY WEBHOOK", { data, requestId, paymentStatus });

    return res.status(200).json({
      status: true,
      message: null,
      data: {},
    });
  } catch (err) {
    const message = "Error while updating payment status from finixpay webhook";
    logger.error(message, { err, requestId, body });
    return res.status(500).json({
      status: false,
      message,
      data: {},
    });
  }
};

export default { paycoons, zapay, ismartpay, payanytime, finixpay };
