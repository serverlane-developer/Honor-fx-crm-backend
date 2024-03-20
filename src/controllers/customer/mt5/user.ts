import { Response } from "express";

import logger from "../../../utils/logger";
import { CustomerRequest } from "../../../@types/Express";

import validators from "../../../validators";
import mt5UserHelper from "../../../helpers/mt5User";

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

export default {
  createUser,
};
