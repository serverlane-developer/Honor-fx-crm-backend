import { Response } from "express";

import logger from "../../../utils/logger";
import { CustomerRequest } from "../../../@types/Express";

import * as withdrawRepo from "../../../db_services/withdraw_repo";
import * as depositRepo from "../../../db_services/deposit_repo";

const getTotalTransactions = async (req: CustomerRequest, res: Response) => {
  const { customer_id, requestId, customer, params, query } = req;
  try {
    if (!customer_id || !customer) {
      return res.status(400).json({
        status: false,
        message: "Customer ID is required",
        data: null,
      });
    }

    const withdraw = await withdrawRepo.getTotalTransactions(customer_id);
    const deposit = await depositRepo.getTotalTransactions(customer_id);
    const stats = {
      withdraw,
      deposit,
    };

    return res.status(200).json({
      status: true,
      message: "Transactions Fetched Successfully",
      data: stats,
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

export default { getTotalTransactions };
