import { Response } from "express";

import logger from "../../utils/logger";
import { CustomerRequest } from "../../@types/Express";

import * as paymentMethodRepo from "../../db_services/customer_payment_method_repo";

import validators from "../../validators";
import CustomerPaymentMethod, { PaymentMethod } from "../../@types/database/CustomerPaymentMethod";
import { encrypt } from "../../helpers/cipher";
import { getPaymentMethod } from "../../helpers/paymentMethodHelper";

const createPaymentMethod = async (req: CustomerRequest, res: Response) => {
  const { customer_id, requestId, customer, body } = req;

  try {
    const { payment_method, account_number, ifsc, bank_name, account_name, upi_id, description } = body;
    const paymentMethodObj = {
      payment_method,
      account_number,
      ifsc,
      bank_name,
      account_name,
      upi_id,
      description,
    };
    if (!customer_id || !customer)
      return res.status(400).json({
        status: false,
        message: "Customer ID is required",
        data: null,
      });

    const validator = validators.customerPaymentMethod.newPaymentMethod.validate(paymentMethodObj);
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Validation error while creating payment method", { body, message, requestId });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    let searchObj = {};
    let label;
    if (body.payment_method === PaymentMethod.BANK && body.account_number) {
      searchObj = { account_number: encrypt(account_number) };
      label = "Bank Account Number";
    } else if (body.upi_id) {
      searchObj = { upi_id: encrypt(upi_id) };
      label = "UPI ID";
    }

    if (searchObj) {
      const methodExists = await paymentMethodRepo.getPaymentMethodByFilter({ ...searchObj, customer_id });
      if (methodExists) {
        return res.status(400).json({
          status: false,
          message: `${label} already exists.`,
          data: null,
        });
      }
    }

    const newPaymentMethodObj: Partial<CustomerPaymentMethod> = {
      ...paymentMethodObj,
      customer_id,
    };

    const encryptedObj = getPaymentMethod(newPaymentMethodObj, "encrypt");
    const customerPaymentMethod = await paymentMethodRepo.createPaymentMethod(encryptedObj);

    return res.status(200).json({ status: true, message: "Profile Info.", data: customerPaymentMethod });
  } catch (err) {
    const message = "Error while creating payment method";
    logger.error(message, { err, customer_id, requestId, body });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const togglePaymentMethod = async (req: CustomerRequest, res: Response) => {
  const { customer_id, requestId, customer, body, params } = req;

  try {
    const { payment_method_id } = params;
    if (!customer_id || !customer)
      return res.status(400).json({
        status: false,
        message: "Customer ID is required",
        data: null,
      });

    const validator = validators.common.isDeleted.validate({ id: payment_method_id, is_deleted: body.is_deleted });
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Validation error while toggling payment method", { body, message, requestId });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const oldPaymentMethod = await paymentMethodRepo.getPaymentMethodById(payment_method_id);
    if (!oldPaymentMethod) {
      return res.status(404).json({
        status: false,
        message: "Payment Method not found",
        data: null,
      });
    }

    const is_deleted = typeof body.is_deleted === "string" ? body.is_deleted === "true" : body.is_deleted;

    if (oldPaymentMethod.is_deleted === is_deleted) {
      return res.status(200).json({
        status: true,
        message: `Payment method already ${is_deleted ? "disabled" : "enabled"}`,
        data: oldPaymentMethod,
      });
    }

    await paymentMethodRepo.updatePaymentMethod({ payment_method_id }, { is_deleted });

    return res.status(200).json({ status: true, message: "Profile Info.", data: { ...oldPaymentMethod, is_deleted } });
  } catch (err) {
    const message = "Error while toggling payment method";
    logger.error(message, { err, customer_id, requestId, body });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getPaymentMethods = async (req: CustomerRequest, res: Response) => {
  const { customer_id, requestId, customer, body } = req;

  try {
    const { allow_deleted } = body;
    if (!customer_id || !customer)
      return res.status(400).json({
        status: false,
        message: "Customer ID is required",
        data: null,
      });

    const paymentMethods = await paymentMethodRepo.getPaymentMethodsByFilter({
      customer_id,
      ...(!allow_deleted && { is_deleted: false }),
    });
    let list: CustomerPaymentMethod[] = [];
    if (paymentMethods.length) {
      list = paymentMethods.map((x) => getPaymentMethod(x, "decrypt"));
    }

    return res.status(200).json({ status: true, message: "Profile Info.", data: list });
  } catch (err) {
    const message = "Error while toggling payment method";
    logger.error(message, { err, customer_id, requestId, body });
    return res.status(500).json({ status: false, message, data: null });
  }
};

export default {
  createPaymentMethod,
  togglePaymentMethod,
  getPaymentMethods,
};
