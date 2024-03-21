import { Response } from "express";

import logger from "../../utils/logger";
import { CustomerRequest } from "../../@types/Express";

import * as payoutRepo from "../../db_services/payout_gateway_repo";
import * as payinRepo from "../../db_services/payin_gateway_repo";

const getPaymentGateway = async (req: CustomerRequest, res: Response) => {
  const { customer_id, requestId, customer, params } = req;
  const { pg_type } = params;
  try {
    if (!customer_id || !customer)
      return res.status(400).json({
        status: false,
        message: "Customer ID is required",
        data: null,
      });

    if (!["payin", "payout"].includes(pg_type)) {
      return res.status(400).json({
        status: false,
        message: "Gateway Type needs to be payin or payour",
        data: null,
      });
    }

    const repo = pg_type === "payin" ? payinRepo : payoutRepo;

    const list = await repo.getListForCustomer();

    return res.status(200).json({
      status: true,
      message: "List fetch successfully.",
      data: list,
    });
  } catch (err) {
    const message = "Error while toggling payment method";
    logger.error(message, { err, customer_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

export default {
  getPaymentGateway,
};
