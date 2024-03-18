import { Response } from "express";

import logger from "../../utils/logger";
import { Request } from "../../@types/Express";

import * as adminRepo from "../../db_services/admin_user_repo";
import * as adminLoginLogRepo from "../../db_services/admin_login_log_repo";

import helpers from "../../helpers/helpers";
import { AdminLoginLog } from "../../@types/database";
import { count } from "../../@types/Knex";

const getProfile = async (req: Request, res: Response) => {
  const { user_id, requestId } = req;
  try {
    if (!user_id)
      return res.status(400).json({
        status: false,
        message: "User ID is required",
        data: null,
      });

    const admin = await adminRepo.getAdminById(user_id);

    const resObj = {
      username: admin?.username,
      email: admin?.email,
      mobile: admin?.mobile,
      last_login_ip: admin?.last_login_ip,
      last_login_timestamp: admin?.last_login_timestamp,
      is_2fa_enabled: admin?.is_2fa_enabled,
      password_changed_at: admin?.password_changed_at,
      created_at: admin?.created_at,
    };

    return res.status(200).json({ status: true, message: "Profile Info.", data: resObj });
  } catch (err) {
    const message = "Error while fetching profile info";
    logger.error(message, { err, user_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getLoginHistory = async (req: Request, res: Response) => {
  const { query, requestId, user_id } = req;
  try {
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

    let history = (await adminLoginLogRepo.getLoginHistory({
      user_id: user_id,
      limit,
      skip,
      totalRecords: false,
    })) as Partial<AdminLoginLog>[];

    let count = 0;
    if (history?.length) {
      const allHistoryCount = (await adminLoginLogRepo.getLoginHistory({
        user_id: user_id,
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
    logger.error(message, { err, user_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const get2faStatus = async (req: Request, res: Response) => {
  const { user_id, requestId } = req;
  try {
    if (!user_id)
      return res.status(400).json({
        status: false,
        message: "User ID is required",
        data: null,
      });

    const status = await adminRepo.getAdmin2faStatusById(user_id);

    return res.status(200).json({ status: true, message: "2fa Status.", data: status });
  } catch (err) {
    const message = "Error while fetching 2fa Status";
    logger.error(message, { err, user_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

export default {
  getProfile,
  getLoginHistory,
  get2faStatus,
};
