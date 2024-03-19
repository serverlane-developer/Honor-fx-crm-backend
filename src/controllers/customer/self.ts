import { Response } from "express";

import logger from "../../utils/logger";
import { CustomerRequest } from "../../@types/Express";

import * as customerRepo from "../../db_services/customer_repo";
import * as customerLoginLogRepo from "../../db_services/customer_login_log_repo";

import { Customer, CustomerLoginLog } from "../../@types/database";
import { count } from "../../@types/Knex";
import helpers from "../../helpers/helpers";

const getProfile = async (req: CustomerRequest, res: Response) => {
  const { customer_id, requestId } = req;
  try {
    if (!customer_id)
      return res.status(400).json({
        status: false,
        message: "Customer ID is required",
        data: null,
      });

    const customer = req.customer as Customer;

    const resObj = {
      username: customer.username,
      email: customer.email,
      phone_number: customer.phone_number,
      is_2fa_enabled: customer.is_2fa_enabled,
      last_login_at: customer.last_login_at,
      last_login_ip: customer.last_login_ip,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
      pin_changed_at: customer.pin_changed_at,
      is_pin_reset_required: customer.is_pin_reset_required,
    };

    return res.status(200).json({ status: true, message: "Profile Info.", data: resObj });
  } catch (err) {
    const message = "Error while fetching profile info";
    logger.error(message, { err, customer_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getLoginHistory = async (req: CustomerRequest, res: Response) => {
  const { query, requestId, customer_id } = req;
  try {
    const { limit: qLimit, skip: qSkip } = query;
    const limit = Number(qLimit || 0) || 0;
    const skip = Number(qSkip || 0) || 0;

    if (!customer_id) {
      return res.status(400).json({
        status: false,
        message: "Customer ID is required to get Login History",
        data: [],
      });
    }

    let history = (await customerLoginLogRepo.getLoginHistory({
      customer_id: customer_id,
      limit,
      skip,
      totalRecords: false,
    })) as Partial<CustomerLoginLog>[];

    let count = 0;
    if (history?.length) {
      const allHistoryCount = (await customerLoginLogRepo.getLoginHistory({
        customer_id: customer_id,
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
    const message = "Error while fetching profile info";
    logger.error(message, { err, customer_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const get2faStatus = async (req: CustomerRequest, res: Response) => {
  const { customer_id, requestId } = req;
  try {
    if (!customer_id)
      return res.status(400).json({
        status: false,
        message: "Customer ID is required",
        data: null,
      });

    const status = await customerRepo.getCustomerById(customer_id);

    return res.status(200).json({ status: true, message: "2fa Status.", data: status });
  } catch (err) {
    const message = "Error while fetching 2fa Status";
    logger.error(message, { err, customer_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

export default {
  getProfile,
  getLoginHistory,
  get2faStatus,
};
