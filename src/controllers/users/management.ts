import { Response } from "express";

import Joi from "joi";

import { AdminRequest } from "../../@types/Express";
import validators from "../../validators";

import logger from "../../utils/logger";
import { Deposit, Customer, CustomerLoginLog } from "../../@types/database";
import { count } from "../../@types/Knex";

import * as depositRepo from "../../db_services/deposit_repo";
import * as customerRepo from "../../db_services/customer_repo";
import * as withdrawRepo from "../../db_services/withdraw_repo";
import * as customerLoginLogRepo from "../../db_services/customer_login_log_repo";

import { decrypt } from "../../helpers/cipher";
import { Status } from "../../@types/Common";
import { WithdrawList } from "../../@types/database/Withdraw";
import { CustomerTransactions } from "../../@types/database/Customer";
import helpers from "../../helpers/helpers";

const getCustomerById = async (req: AdminRequest, res: Response) => {
  const { user_id, requestId, params } = req;
  const { customer_id } = params;

  try {
    const customerData = await customerRepo.getCustomerById(customer_id);
    if (!customerData) {
      return res.status(400).json({
        status: false,
        message: "Customer not found",
        data: null,
      });
    }
    const withdrawTxns = await withdrawRepo.getTransactionsByFilter({
      customer_id,
      status: Status.SUCCESS,
    });

    const depositTxns = await depositRepo.getTransactionsByFilter({
      customer_id,
      status: Status.SUCCESS,
    });

    const customerProfile = {
      ...customerData,
      total_withdraw_transactions: withdrawTxns.length,
      total_withdraw_amount: withdrawTxns.reduce((accumulator, transaction) => {
        return accumulator + Number(transaction.amount);
      }, 0),
      total_deposit_transactions: depositTxns.length,
      total_deposit_amount: depositTxns.reduce((accumulator, transaction) => {
        return accumulator + Number(transaction.amount);
      }, 0),
      pin: undefined,
      created_by: undefined,
      is_deleted: undefined,
      updated_by: undefined,
    };

    return res.status(200).json({
      status: true,
      data: JSON.parse(JSON.stringify(customerProfile)),
      message: `Customer Fetched`,
    });
  } catch (err) {
    const message = "Error while getting Customer by ID";
    logger.error(message, { err, user_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getCustomers = async (req: AdminRequest, res: Response) => {
  const { requestId, query } = req;

  try {
    const { limit: qLimit, skip: qSkip, search: qSearch } = query;

    const limit = Number(qLimit || 0) || 0;
    const skip = Number(qSkip || 0) || 0;
    const search = String(qSearch || "");

    const customerList = (await customerRepo.getAllCustomers({
      limit,
      skip,
      search,
    })) as Partial<Customer>[];

    let count = 0;
    const data = [];

    if (customerList?.length) {
      const panelCount = (await customerRepo.getAllCustomers({
        limit: null,
        skip: null,
        search,
        totalRecords: true,
      })) as count;
      count = Number(panelCount?.count);

      for (const customerData of customerList) {
        const withdrawTxns = await withdrawRepo.getTransactionsByFilter({
          customer_id: customerData.customer_id,
          status: Status.SUCCESS,
        });
        const depositTxns = await depositRepo.getTransactionsByFilter({
          customer_id: customerData.customer_id,
          status: Status.SUCCESS,
        });

        data.push({
          ...customerData,
          total_withdraw_transactions: withdrawTxns.length.toString(),
          total_withdraw_amount: withdrawTxns
            .reduce((accumulator, transaction) => {
              return accumulator + Number(transaction.amount);
            }, 0)
            .toString(),
          total_deposit_transactions: depositTxns.length.toString(),
          total_deposit_amount: depositTxns
            .reduce((accumulator, transaction) => {
              return accumulator + Number(transaction.amount);
            }, 0)
            .toString(),
        });
      }
    }

    return res
      .header("Access-Control-Expose-Headers", "x-total-count")
      .setHeader("x-total-count", count)
      .status(200)
      .json({
        status: true,
        message: "List Fetched Successfully",
        data: data,
      });
  } catch (err) {
    const message = "Error while getting Customer List";
    logger.error(message, { err, requestId, query });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getCustomerTransactions = async (req: AdminRequest, res: Response) => {
  const { params, requestId, user_id, query } = req;
  const { customer_id } = params;

  const { limit: qLimit, skip: qSkip, status: qStatus, type: qType, mt5_user_id: qMt5UserId } = query;
  const limit = Number(qLimit || 0) || 0;
  const skip = Number(qSkip || 0) || 0;
  const status = String(qStatus || "");
  const type = String(qType || "");
  const mt5_user_id = String(qMt5UserId || "");

  try {
    if (type && !["withdraw", "deposit"].includes(type)) {
      const message = "Invalid Transaction Type";
      logger.debug(message, { requestId, params, user_id, query });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const validator = validators.common.uuid.required().validate(customer_id);
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Invalid Customer ID", { requestId, params, user_id, query });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const customer = await customerRepo.getCustomerById(customer_id);
    if (!customer) {
      const message = "Customer not found!";
      logger.debug(message, { message, requestId, params, user_id, query });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const transactions = (await customerRepo.getCustomerTransactions({
      limit,
      skip,
      status,
      type,
      customer_id,
      mt5_user_id,
    })) as CustomerTransactions[];
    let count = 0;
    if (transactions?.length) {
      const transactionsCount = (await customerRepo.getCustomerTransactions({
        limit: null,
        skip: null,
        totalRecords: true,
        status,
        type,
        customer_id,
        mt5_user_id,
      })) as count;
      count = Number(transactionsCount?.count || 0);
    }

    return res
      .status(200)
      .header("Access-Control-Expose-Headers", "x-total-count")
      .setHeader("x-total-count", count)
      .json({
        status: true,
        message: "Customer Transactions Fetched Successfully",
        data: { transactions },
      });
  } catch (err) {
    const message = "Error while getting Customer transactions";
    logger.error(message, { err, requestId, params, query, user_id });
    return res.status(500).json({
      status: false,
      message,
    });
  }
};

const getDetailedTransaction = async (req: AdminRequest, res: Response) => {
  const { user_id, requestId, params } = req;
  const { customer_id, transaction_type, transaction_id } = params;

  try {
    const validator = Joi.object({
      customer_id: validators.common.uuid.required(),
      transaction_id: validators.common.uuid.required(),
      transaction_type: Joi.string().valid("deposit", "withdraw").required(),
    }).validate({ customer_id, transaction_id, transaction_type });
    if (validator.error) {
      const message = validator.error.message;
      logger.info("invalid URL to get Detailed Transactions", { params, message, requestId });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const customerExists = await customerRepo.getCustomerById(customer_id);
    if (!customerExists) {
      return res.status(400).json({
        status: false,
        message: "Customer not found",
        data: null,
      });
    }

    let transaction: Deposit | WithdrawList | null = null;

    if (transaction_type === "deposit") {
      transaction = await depositRepo.getDetailedTransactionByFilter({
        transaction_id,
      });
    } else if (transaction_type === "withdraw") {
      transaction = (await withdrawRepo.getDetailedTransactionByFilter({
        transaction_id,
      })) as WithdrawList;
      if (transaction) {
        if (transaction?.account_name) transaction.account_name = decrypt(transaction.account_name);
        if (transaction?.account_number) transaction.account_number = decrypt(transaction.account_number);
        if (transaction?.bank_name) transaction.bank_name = decrypt(transaction.bank_name);
        if (transaction?.ifsc) transaction.ifsc = decrypt(transaction.ifsc);
        if (transaction?.upi_id) transaction.upi_id = decrypt(transaction.upi_id);
      }
    }

    return res.status(200).json({
      status: true,
      message: "Detailed transaciton Fetched",
      data: { transaction },
    });
  } catch (err) {
    const message = "Error while getting detailed transaction for customer";
    logger.error(message, { err, user_id, requestId, customer_id });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getLoginHistory = async (req: AdminRequest, res: Response) => {
  const { query, requestId, user_id, params } = req;
  try {
    const { customer_id } = params;
    const { limit: qLimit, skip: qSkip } = query;
    const limit = Number(qLimit || 0) || 0;
    const skip = Number(qSkip || 0) || 0;

    if (!user_id) {
      return res.status(400).json({
        status: false,
        message: "User ID is required to get Login History",
        data: [],
      });
    }

    const validator = validators.common.uuid.required().validate(customer_id);
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Invalid Customer ID", { requestId, params, user_id, query });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const customer = await customerRepo.getCustomerById(customer_id);
    if (!customer) {
      const message = "Customer not found!";
      logger.debug(message, { message, requestId, params, user_id, query });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    let history = (await customerLoginLogRepo.getLoginHistory({
      customer_id,
      limit,
      skip,
      totalRecords: false,
    })) as Partial<CustomerLoginLog>[];

    let count = 0;
    if (history?.length) {
      const allHistoryCount = (await customerLoginLogRepo.getLoginHistory({
        customer_id,
        limit: null,
        skip: null,
        totalRecords: true,
      })) as count;
      count = Number(allHistoryCount?.count);
      history = history.map((x) => ({
        ...x,
        device: x.login_device ? helpers.parseDeviceDetails(x.login_device) : null,
      }));
    }

    return res
      .header("Access-Control-Expose-Headers", "x-total-count")
      .setHeader("x-total-count", count)
      .status(200)
      .json({
        status: true,
        message: "Login History Fetched",
        data: history,
      });
  } catch (err) {
    const message = "Error while fetching login history";
    logger.error(message, { err, user_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

export default {
  getCustomerById,
  getCustomers,
  getCustomerTransactions,
  getDetailedTransaction,
  getLoginHistory,
};
