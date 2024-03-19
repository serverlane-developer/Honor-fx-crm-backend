import { Response } from "express";
import cache from "memory-cache";
import * as libphonenumber from "libphonenumber-js";
import { v4 as uuidv4 } from "uuid";

import logger from "../../utils/logger";
import { CustomerRequest, Request } from "../../@types/Express";

import * as customerRepo from "../../db_services/customer_repo";
import * as customerLoginLogRepo from "../../db_services/customer_login_log_repo";

import helpers from "../../helpers/helpers";
import otpHelper from "../../helpers/otp";
import validators from "../../validators";
import { Customer } from "../../@types/database";
import { knex } from "../../data/knex";
import { getCustomerJwtToken as getJwtToken } from "../../helpers/login";
import smsHelper from "../../helpers/smsHelper";
import { decrypt, encrypt } from "../../helpers/cipher";
import config from "../../config";

const getRegistrationTokenKey = (phone_number: string) => phone_number + "_register";

const sendOTP = async (req: Request, res: Response) => {
  const { body, requestId } = req;
  const { phone_number } = body;
  const ip = helpers.getIp(req);
  const login_device = helpers.getDeviceDetails(req);
  let customer_id, two_factor_authenticated;
  const trx = await knex.transaction();
  try {
    const isPhoneValid = libphonenumber.isValidPhoneNumber(phone_number);
    if (!isPhoneValid) {
      const message = "Invalid Phone Number";
      logger.debug(message, { body, message, requestId });

      await trx.rollback();
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const customerExists = await customerRepo.getCustomerByFilter({ phone_number }, { trx });
    if (customerExists) {
      customer_id = customerExists.customer_id;
      two_factor_authenticated = customerExists.is_2fa_enabled;
    }

    const cachedOTP = otpHelper.getOtp(phone_number, "customer_login");

    if (cachedOTP) {
      const message = "OTP Already Sent.";
      if (customer_id)
        await customerLoginLogRepo.addLoginRecord(
          {
            customer_id,
            is_attempt_success: false,
            message,
            ip,
            two_factor_authenticated,
            login_device,
            attempt_type: "pin",
          },
          { trx }
        );

      await trx.commit();
      return res.status(200).json({
        status: true,
        message,
        data: {
          phone_number,
          otpSent: true,
        },
      });
    }

    const { timeRemaining, tooManyAttempts, lockedTill } = otpHelper.canSendOtp(phone_number, "customer_login");

    if (tooManyAttempts) {
      const message = `Too Many Attempts try again after ${timeRemaining}.Too Many Attempts try again after ${timeRemaining}.`;
      if (customer_id)
        await customerLoginLogRepo.addLoginRecord(
          {
            customer_id,
            is_attempt_success: false,
            message,
            ip,
            two_factor_authenticated,
            login_device,
            attempt_type: "otp",
          },
          { trx }
        );
      await trx.commit();
      return res.status(400).json({
        status: false,
        message,
        data: {
          tooManyAttempts: true,
          lockedTill,
        },
      });
    }

    const { token } = otpHelper.sendOtp(phone_number, "customer_login", requestId);
    if (config.SEND_CUSTOMER_OTP) await smsHelper.sendOTPSms(phone_number, token, requestId);

    const message = "OTP Sent Successfully.";

    if (customer_id)
      await customerLoginLogRepo.addLoginRecord(
        {
          customer_id,
          ip,
          is_attempt_success: true,
          two_factor_authenticated,
          message,
          attempt_type: "otp",

          login_device,
        },
        { trx }
      );

    await trx.commit();
    return res.status(200).json({
      status: true,
      message,
      data: { phone_number, otpSent: true },
    });
  } catch (err) {
    const message = "Error while sending customer OTP";
    logger.error(message, { err, requestId });
    await trx.rollback();
    if (customer_id) {
      let errorMessage = "";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      await customerLoginLogRepo.addLoginRecord({
        customer_id,
        ip,
        is_attempt_success: false,
        two_factor_authenticated,
        message: `OTP verification failed ` + errorMessage,
        login_device,
        attempt_type: "pin",
      });
    }
    return res.status(500).json({
      status: false,
      message,
      data: null,
    });
  }
};

const verifyOTP = async (req: Request, res: Response) => {
  const { body, requestId } = req;
  const { phone_number, token } = body;
  const ip = helpers.getIp(req);
  const login_device = helpers.getDeviceDetails(req);
  let customer_id, two_factor_authenticated;
  const trx = await knex.transaction();
  try {
    const isPhoneValid = libphonenumber.isValidPhoneNumber(phone_number);
    if (!isPhoneValid) {
      const message = "Invalid Phone Number";
      logger.debug(message, { body, message, requestId });

      await trx.rollback();
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const customerExists = await customerRepo.getCustomerByFilter({ phone_number }, { trx });
    if (customerExists) {
      customer_id = customerExists.customer_id;
      two_factor_authenticated = customerExists.is_2fa_enabled;
    }

    const validator = validators.customer.otpValidator.validate({ phone_number, token });
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Validation error while verifying customer otp", { body, message, requestId });

      await trx.rollback();
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const { timeRemaining, tooManyAttempts, lockedTill } = otpHelper.canSendOtp(phone_number, "customer_login", 3);
    if (tooManyAttempts) {
      const message = `Too Many Attempts try again after ${timeRemaining}.`;
      logger.debug(message, { body, message, requestId });
      if (customer_id)
        await customerLoginLogRepo.addLoginRecord(
          {
            customer_id,
            ip,
            is_attempt_success: false,
            two_factor_authenticated,
            message,
            login_device,
            attempt_type: "otp",
          },
          { trx }
        );
      await trx.commit();
      return res.status(400).json({
        status: false,
        message,
        data: {
          tooManyAttempts: true,
          lockedTill,
        },
      });
    }

    const cachedOTP = otpHelper.getOtp(phone_number, "customer_login");

    if (!cachedOTP) {
      const message = `Invalid OTP. Retry Login.`;
      logger.debug(message, { body, message, requestId });

      if (customer_id)
        await customerLoginLogRepo.addLoginRecord(
          {
            customer_id,
            ip,
            is_attempt_success: false,
            two_factor_authenticated,
            message,
            login_device,
            attempt_type: "otp",
          },
          { trx }
        );
      await trx.commit();
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    if (token !== cachedOTP?.token) {
      otpHelper.otpRetryLimiter(phone_number, "customer_login");
      const { timeRemaining, tooManyAttempts, lockedTill } = otpHelper.canSendOtp(phone_number, "customer_login", 3);

      if (tooManyAttempts) {
        otpHelper.clearOtp(phone_number, "customer_login");
        const message = `Too Many Attempts try again after ${timeRemaining}.`;
        logger.debug(message, { body, message, requestId });

        if (customer_id)
          await customerLoginLogRepo.addLoginRecord(
            {
              customer_id,
              ip,
              is_attempt_success: false,
              two_factor_authenticated,
              message,
              login_device,
              attempt_type: "otp",
            },
            { trx }
          );
        await trx.commit();
        return res.status(400).json({
          status: false,
          message,
          data: {
            tooManyAttempts: true,
            lockedTill,
          },
        });
      }

      const message = "OTP has expired or is invalid!";
      logger.debug(message, { body, message, requestId });
      if (customer_id)
        await customerLoginLogRepo.addLoginRecord(
          {
            customer_id,
            ip,
            is_attempt_success: false,
            two_factor_authenticated,
            message,
            login_device,
            attempt_type: "otp",
          },
          { trx }
        );
      await trx.commit();
      return res.status(400).json({
        status: false,
        message,
        data: {
          incorrectOTP: true,
        },
      });
    }

    otpHelper.clearOtp(phone_number, "customer_login");
    otpHelper.resetFailedAttempt(phone_number, "customer_login");
    const last_login_at = new Date().toISOString();

    if (!customerExists) {
      const message = "OTP Successfully Verified for New User";
      logger.debug(message, { body, message, requestId });
      cache.put(getRegistrationTokenKey(phone_number), new Date().toISOString());
      return res.status(200).json({
        status: true,
        message,
        data: {
          isNewUser: true,
          phone_number,
        },
      });
    }

    await customerRepo.updateCustomer(
      { customer_id },
      {
        last_login_at,
        last_login_ip: ip,
      },
      { trx }
    );
    const message = "OTP successfully verified!";
    await customerLoginLogRepo.addLoginRecord(
      {
        customer_id,
        is_attempt_success: true,
        message,
        ip,
        two_factor_authenticated,
        login_device,
        attempt_type: "otp",
      },
      { trx }
    );

    const { token: jwtToken, data: resData } = getJwtToken(
      customerExists.customer_id,
      phone_number,
      customerExists.username,
      two_factor_authenticated || false
    );

    logger.debug(message, { requestId, customer_id });

    await trx.commit();
    return res
      .status(200)
      .header("Access-Control-Expose-Headers", "token")
      .setHeader("token", jwtToken)
      .json({
        status: true,
        message: "Successfully Signed in!",
        data: { ...resData },
      });
  } catch (err) {
    const message = "Error while sending customer OTP";
    logger.error(message, { err, requestId });
    await trx.rollback();
    if (customer_id) {
      let errorMessage = "";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      if (customer_id)
        await customerLoginLogRepo.addLoginRecord({
          customer_id,
          ip,
          is_attempt_success: false,
          two_factor_authenticated,
          message: `OTP verification failed ` + errorMessage,
          login_device,
          attempt_type: "pin",
        });
    }
    return res.status(500).json({
      status: false,
      message,
      data: null,
    });
  }
};

const resendOTP = async (req: Request, res: Response) => {
  const { body, requestId } = req;
  const { phone_number } = body;
  const ip = helpers.getIp(req);
  const login_device = helpers.getDeviceDetails(req);
  let customer_id;
  let two_factor_authenticated;
  try {
    const isValid = libphonenumber.isValidPhoneNumber(phone_number || "");
    if (!isValid) {
      const message = `Invalid Phone Number.`;
      logger.debug(message, { requestId, message, body });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const customerExists = await customerRepo.getCustomerByFilter({ phone_number });
    if (customerExists) {
      customer_id = customerExists.customer_id;
      two_factor_authenticated = customerExists.is_2fa_enabled;
    }
    const { timeRemaining, tooManyAttempts, lockedTill } = otpHelper.canSendOtp(phone_number, "customer_login");

    if (tooManyAttempts) {
      otpHelper.clearOtp(phone_number, "customer_login");
      const message = `Too Many Attempts try again after ${timeRemaining}.`;
      if (customer_id)
        await customerLoginLogRepo.addLoginRecord({
          customer_id,
          ip,
          is_attempt_success: false,
          two_factor_authenticated,
          message,
          login_device,
          attempt_type: "otp",
        });
      return res.status(400).json({
        status: false,
        message,
        data: {
          tooManyAttempts: true,
          lockedTill,
        },
      });
    }

    otpHelper.clearOtp(phone_number, "customer_login");
    otpHelper.resetFailedAttempt(phone_number, "customer_login");

    const { token } = otpHelper.sendOtp(phone_number, "customer_login", requestId);
    if (config.SEND_CUSTOMER_OTP) await smsHelper.sendOTPSms(phone_number, token, requestId);

    const message = "OTP Resent Successfully.";

    if (customer_id)
      await customerLoginLogRepo.addLoginRecord({
        customer_id,
        ip,
        is_attempt_success: true,
        two_factor_authenticated,
        message,
        attempt_type: "otp",

        login_device,
      });

    logger.debug(message, { requestId });
    return res.status(200).json({
      status: true,
      message,
      data: { phone_number, otpSent: true },
    });
  } catch (err) {
    const message = "Error while customer sign in";
    logger.error(message, { err, requestId });
    if (customer_id) {
      let errorMessage = "";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      if (customer_id)
        await customerLoginLogRepo.addLoginRecord({
          customer_id,
          ip,
          is_attempt_success: false,
          two_factor_authenticated,
          message: `pin verification failed ` + errorMessage,
          login_device,
          attempt_type: "pin",
        });
    }
    return res.status(500).json({
      status: false,
      message,
      data: null,
    });
  }
};

const register = async (req: Request, res: Response) => {
  const { body, requestId } = req;
  const ip = helpers.getIp(req);
  const login_device = helpers.getDeviceDetails(req);
  let customer_id;
  let two_factor_authenticated;
  const trx = await knex.transaction();
  try {
    const { phone_number, pin, email, username, cnf_pin } = body;
    const validator = validators.customer.newUserValidator.validate({ phone_number, pin, email, username, cnf_pin });
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Validation error while registering customer", { body, message, requestId });

      await trx.rollback();
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const isValid = libphonenumber.isValidPhoneNumber(phone_number);
    if (!isValid) {
      const message = `Invalid Phone Number.`;
      logger.debug(message, { requestId, message, body });
      await trx.rollback();

      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const registrationToken = cache.get(getRegistrationTokenKey(phone_number));
    if (!registrationToken) {
      const message = `OTP Expired. Please try again.`;
      logger.debug(message, { requestId, message, body });
      await trx.rollback();

      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const customerExists = await customerRepo.getCustomerByFilter({ phone_number });
    if (customerExists) {
      const message = `Profile already registered. Try to log in.`;
      logger.debug(message, { requestId, message, body });
      await trx.rollback();

      return res.status(400).json({
        status: false,
        message,
        data: {
          userExists: true,
        },
      });
    }

    const customer_id = uuidv4();
    const newCustomer = (await customerRepo.createCustomer(
      {
        phone_number,
        email,
        username,
        pin: encrypt(pin),
        is_2fa_enabled: false,
        last_login_at: new Date().toISOString(),
        last_login_ip: ip,
      },
      customer_id,
      { trx }
    )) as Customer;

    const message = "New Customer Registered Successfully";

    await customerLoginLogRepo.addLoginRecord(
      {
        customer_id,
        is_attempt_success: true,
        message,
        ip,
        two_factor_authenticated,
        login_device,
        attempt_type: "otp",
      },
      { trx }
    );

    const { token: jwtToken, data: resData } = getJwtToken(
      newCustomer.customer_id,
      phone_number,
      newCustomer.username,
      two_factor_authenticated || false
    );

    logger.debug(message, { requestId, customer_id });

    await trx.commit();
    return res
      .status(200)
      .header("Access-Control-Expose-Headers", "token")
      .setHeader("token", jwtToken)
      .json({
        status: true,
        message: "Successfully Registered!",
        data: { ...resData },
      });
  } catch (err) {
    const message = "Error while registering customer";
    logger.error(message, { err, requestId });
    await trx.rollback();
    return res.status(500).json({
      status: false,
      message,
      data: null,
    });
  }
};

const verifyPin = async (req: Request, res: Response) => {
  const { body, requestId } = req;
  const ip = helpers.getIp(req);
  const login_device = helpers.getDeviceDetails(req);
  let customer_id;
  let two_factor_authenticated;
  const trx = await knex.transaction();
  try {
    const { phone_number, pin } = body;
    const validator = validators.customer.loginValidator.validate({ phone_number, pin });
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Validation error while registering customer", { body, message, requestId });

      await trx.rollback();
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const isValid = libphonenumber.isValidPhoneNumber(phone_number);
    if (!isValid) {
      const message = `Invalid Phone Number.`;
      logger.debug(message, { requestId, message, body });
      await trx.rollback();

      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const customerExists = await customerRepo.getCustomerByFilter({ phone_number }, { trx });
    if (!customerExists) {
      const message = `Profile not found. Try to Register.`;
      logger.debug(message, { requestId, message, body });
      await trx.rollback();

      return res.status(400).json({
        status: false,
        message,
        data: {
          userExists: true,
        },
      });
    }
    customer_id = customerExists.customer_id;
    two_factor_authenticated = customerExists.is_2fa_enabled;

    if (customerExists.is_pin_reset_required) {
      const message = `Too many failed attempts, Retry using OTP.`;
      logger.debug(message, { requestId, message, body });

      await customerLoginLogRepo.addLoginRecord(
        {
          customer_id,
          is_attempt_success: false,
          message,
          ip,
          two_factor_authenticated,
          login_device,
          attempt_type: "pin",
        },
        { trx }
      );
      await trx.commit();

      return res.status(400).json({
        status: false,
        message,
        data: {
          userExists: true,
        },
      });
    }

    const cacheKey = `${phone_number}_pin_fail_attempt`;
    const failedAttempt = cache.get(cacheKey) || 0;
    if (failedAttempt === 3) {
      const message = "Too Many Failed Attempts, Retry using OTP";
      await customerRepo.updateCustomer({ customer_id }, { is_pin_reset_required: true }, { trx });
      await customerLoginLogRepo.addLoginRecord(
        {
          customer_id,
          is_attempt_success: false,
          message,
          ip,
          two_factor_authenticated,
          login_device,
          attempt_type: "pin",
        },
        { trx }
      );
      await trx.commit();
      return res.status(400).json({
        status: false,
        message,
        data: {
          otpRequired: true,
        },
      });
    }

    const userPin = decrypt(customerExists.pin);
    if (userPin !== pin) {
      await cache.put(cacheKey, failedAttempt + 1, 1000 * 60 * 10); // 10 minutes
      const message = "Invalid Credentials";
      await customerLoginLogRepo.addLoginRecord(
        {
          customer_id,
          is_attempt_success: false,
          message,
          ip,
          two_factor_authenticated,
          login_device,
          attempt_type: "pin",
        },
        { trx }
      );
      await trx.commit();
      return res.status(400).json({
        status: false,
        message,
        data: {
          phone_number,
        },
      });
    }

    cache.del(cacheKey);

    const message = "Pin successfully verified!";

    const last_login_at = new Date().toISOString();

    await customerRepo.updateCustomer(
      { customer_id },
      {
        last_login_at,
        last_login_ip: ip,
      },
      { trx }
    );

    await customerLoginLogRepo.addLoginRecord(
      {
        customer_id,
        is_attempt_success: true,
        message,
        ip,
        two_factor_authenticated,
        login_device,
        attempt_type: "otp",
      },
      { trx }
    );

    const { token: jwtToken, data: resData } = getJwtToken(
      customerExists.customer_id,
      phone_number,
      customerExists.username,
      two_factor_authenticated || false
    );

    logger.debug(message, { requestId, customer_id });

    await trx.commit();
    return res
      .status(200)
      .header("Access-Control-Expose-Headers", "token")
      .setHeader("token", jwtToken)
      .json({
        status: true,
        message: "Pin Successfully Verified!",
        data: { ...resData, isNewUser: false },
      });
  } catch (err) {
    const message = "Error while verifying customer pin";
    logger.error(message, { err, requestId, body });
    await trx.rollback();
    if (customer_id) {
      await customerLoginLogRepo.addLoginRecord(
        {
          customer_id,
          is_attempt_success: false,
          message,
          ip,
          two_factor_authenticated,
          login_device,
          attempt_type: "pin",
        },
        { trx }
      );
    }
    return res.status(500).json({
      status: false,
      message,
      data: null,
    });
  }
};

const updatePin = async (req: CustomerRequest, res: Response) => {
  const { body, requestId, customer_id } = req;
  const trx = await knex.transaction();
  try {
    const { pin } = body;
    const validator = validators.common.pin.validate(pin);
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Validation error while registering customer", { body, message, requestId });

      await trx.rollback();
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    // // just for ts
    // const customerExists = await customerRepo.getCustomerByFilter({ customer_id }, { trx });
    // if (!customerExists) {
    //   const message = `Profile not found. Try to Register.`;
    //   logger.debug(message, { requestId, message, body });
    //   await trx.rollback();

    //   return res.status(400).json({
    //     status: false,
    //     message,
    //     data: {
    //       userExists: true,
    //     },
    //   });
    // }

    await customerRepo.updateCustomer(
      { customer_id },
      { pin: encrypt(pin), pin_changed_at: new Date().toISOString(), is_pin_reset_required: true },
      { trx }
    );

    const message = "PIN Successfully updated!";

    const customer = req.customer as Customer;

    const { token: jwtToken, data: resData } = getJwtToken(
      customer.customer_id,
      customer.phone_number,
      customer.username,
      customer.is_2fa_enabled
    );

    logger.debug(message, { requestId, customer_id });

    await trx.commit();
    return res
      .status(200)
      .header("Access-Control-Expose-Headers", "token")
      .setHeader("token", jwtToken)
      .json({
        status: true,
        message: "Pin Successfully Verified!",
        data: { ...resData, isNewUser: false },
      });
  } catch (err) {
    const message = "Error while updating customer pin";
    logger.error(message, { err, requestId, body });
    await trx.rollback();

    return res.status(500).json({
      status: false,
      message,
      data: null,
    });
  }
};

const signout = (req: CustomerRequest, res: Response) => {
  const { requestId } = req;
  try {
    // TODO: SIGNOUT RELATED ACTIVITES HERE | LOGOUT RECORD IF MAINTAINED
    return res.status(200).json({ status: true, message: "Logged out successfully.", data: null });
  } catch (err) {
    let message = "Error while signing out customer";
    if (err instanceof Error) {
      message += err.message;
    }
    logger.error(message, { err, requestId });
    return res.status(500).json({
      status: false,
      message,
      data: null,
    });
  }
};

export default { sendOTP, verifyOTP, resendOTP, register, verifyPin, updatePin, signout };
