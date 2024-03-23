import { Response } from "express";

import logger from "../../../utils/logger";
import { CustomerRequest } from "../../../@types/Express";

import validators from "../../../validators";
import mt5UserHelper from "../../../helpers/mt5User";
import * as mt5userRepo from "../../../db_services/mt5_user_repo";
import { Mt5User } from "../../../@types/database";
import { count } from "../../../@types/Knex";

const createUser = async (req: CustomerRequest, res: Response) => {
  const { customer_id, requestId, customer, body } = req;
  try {
    const { email, phone_number, username } = body;

    if (!customer_id || !customer) {
      return res.status(400).json({
        status: false,
        message: "Customer ID is required",
        data: null,
      });
    }

    const validator = validators.mt5User.newUserValidator.validate({
      email,
      phone_number,
      username,
    });
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Validation error while creating deposit", { body, message, requestId });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const result = await mt5UserHelper.createUserOnMt5(username, email || phone_number, customer, requestId);

    return res.status(200).json(result);
  } catch (err) {
    const message = "Error while creating user";
    logger.error(message, { err, customer_id, requestId, body });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getUserById = async (req: CustomerRequest, res: Response) => {
  const { customer_id, requestId, params } = req;
  const { mt5_user_id } = params;

  try {
    const validator = validators.common.uuid.validate(mt5_user_id);
    if (validator.error) {
      const message = "Invalid MT5 User ID";
      logger.debug("Validation error while getting MT5 User By ID", { message, requestId, mt5_user_id });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const userExists = await mt5userRepo.getMt5UserById(mt5_user_id);
    if (!userExists) {
      return res.status(400).json({
        status: false,
        message: "MT5 User not found",
        data: null,
      });
    }

    if (userExists.customer_id !== customer_id) {
      return res.status(400).json({
        status: false,
        message: "MT5 User not found",
        data: null,
      });
    }

    const data = mt5UserHelper.getUser(userExists, "decrypt");
    return res.status(200).json({
      status: true,
      data,
      message: `MT5 User Fetched`,
    });
  } catch (err) {
    const message = "Error while getting MT5 User by ID";
    logger.error(message, { err, customer_id, requestId, mt5_user_id });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getUsers = async (req: CustomerRequest, res: Response) => {
  const { customer_id, requestId, query } = req;

  try {
    const { limit: qLimit, skip: qSkip, status: qStatus } = query;
    const limit = Number(qLimit || 0) || 0;
    const skip = Number(qSkip || 0) || 0;
    const status = qStatus === "enable" ? true : false;
    let list = (await mt5userRepo.getAllMt5Users({ limit, skip, status, customer_id })) as Partial<Mt5User>[];
    let count = 0;

    if (list?.length) {
      const userCount = (await mt5userRepo.getAllMt5Users({
        limit: null,
        skip: null,
        status,
        totalRecords: true,
        customer_id,
      })) as count;
      count = Number(userCount?.count);
      list = list.map((user) => mt5UserHelper.getUser(user, "decrypt"));
    }

    return res
      .header("Access-Control-Expose-Headers", "x-total-count")
      .setHeader("x-total-count", count)
      .status(200)
      .json({
        status: true,
        message: "List Fetched Successfully",
        data: list,
      });
  } catch (err) {
    const message = "Error while getting MT5 User List";
    logger.error(message, { err, customer_id, requestId, query });
    return res.status(500).json({ status: false, message, data: null });
  }
};

export default {
  createUser,
  getUserById,
  getUsers,
};
