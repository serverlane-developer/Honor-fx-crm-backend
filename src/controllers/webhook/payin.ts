import { Response } from "express";
import { Request } from "../../@types/Express";
import logger from "../../utils/logger";

import * as transanctionRepo from "../../db_services/deposit_repo";
import * as pgRepo from "../../db_services/payin_gateway_repo";

import hashHelper from "../../helpers/hash";
import { Paydunia } from "../../@types/Payin";
import { PayinServices, payinHelper } from "../../services/payin";

const paydunia = async (req: Request, res: Response) => {
  const { body, requestId } = req;
  try {
    const { HASH, ORDER_ID } = body as Paydunia.TransactionResponse;
    logger.debug("PAYDUNIA WEBHOOK RECEIVED TO UPDATE PAYMENT STATUS", { body, ORDER_ID, requestId });

    const pg_order_id = ORDER_ID;

    if (!pg_order_id) {
      const message = "ID not found";
      logger.debug(message, { requestId, body });
      return res.status(400).json({ status: false, data: null, message });
    }

    const transaction = await transanctionRepo.getTransactionByFilter({ pg_order_id });

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

    const pg = await pgRepo.getPayinGatewayById(transaction.pg_id);
    if (!pg) {
      const message = "Payment Gateway not found";
      logger.debug(message, { requestId, transaction, body });
      return res.status(400).json({
        status: false,
        message,
        data: {},
      });
    }

    const { MERCHANT_ID, SECRET_KEY } = PayinServices.PAYDUNIA.getKeys(pg);
    const hash = hashHelper.generatePayduniaHash(MERCHANT_ID, SECRET_KEY, { ...body, HASH });
    if (hash !== HASH) {
      const message = "Invalid Hash";
      logger.debug(message, { requestId, transaction, body });
      return res.status(400).json({
        status: false,
        message,
        data: {},
      });
    }

    // const data = body;
    const data = await PayinServices.PAYDUNIA.getTransationStatus(pg, pg_order_id, requestId);

    const paymentStatus = await payinHelper.updatePayinStatus({ ...data }, pg_order_id, requestId, "PAYDUNIA");

    logger.debug("update deposit transaction's status from  PAYDUNIA WEBHOOK", { data, requestId, paymentStatus });

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

export default { paydunia };
