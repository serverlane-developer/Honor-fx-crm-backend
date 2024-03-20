import { Response } from "express";

import { AdminRequest } from "../../@types/Express";
import { Deposit } from "../../@types/database";
import { count } from "../../@types/Knex";

import logger from "../../utils/logger";

import validators from "../../validators";

import * as depositRepo from "../../db_services/deposit_repo";

const getTransactions = async (req: AdminRequest, res: Response) => {
  const { params, requestId, user_id, query } = req;
  const { status } = params;
  try {
    const validator = validators.deposit.status.validate(status);
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

    const transactions = (await depositRepo.getAllTransactions({
      limit,
      skip,
      status,
      order: status === "pending" ? "created_at" : "updated_at",
      dir: status === "pending" ? "asc" : "desc",
      search,
    })) as Partial<Deposit>[];
    let count = 0;

    if (transactions?.length) {
      const total = (await depositRepo.getAllTransactions({
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

    const history = (await depositRepo.getTransactionHistory({
      limit,
      skip,
      id: transaction_id,
    })) as Partial<Deposit>[];
    let count = 0;

    if (history?.length) {
      const total = (await depositRepo.getTransactionHistory({
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

export default {
  getTransactions,
  getTransactionHistory,
};
