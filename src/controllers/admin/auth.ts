import { Response } from "express";
import bcrypt from "bcrypt";
import cache from "memory-cache";
import moment from "moment";

import { v4 } from "uuid";

import logger from "../../utils/logger";
import { AdminRequest } from "../../@types/Express";

import * as adminRepo from "../../db_services/admin_user_repo";
import * as adminLoginLogRepo from "../../db_services/admin_login_log_repo";
import * as accessControlRepo from "../../db_services/access_control_repo";
import * as roleRepo from "../../db_services/roles_repo";

import helpers from "../../helpers/helpers";
import otpHelper from "../../helpers/otp";
import validators from "../../validators";
import AdminUser from "../../@types/database/AdminUser";
import { knex } from "../../data/knex";
import mailHelper from "../../helpers/mailHelper";
import { getAdminJwtToken as getJwtToken } from "../../helpers/login";
import { Role } from "../../@types/database";

const signin = async (req: AdminRequest, res: Response) => {
  const { body, requestId } = req;
  const ip = helpers.getIp(req);
  const login_device = helpers.getDeviceDetails(req);
  let user_id;
  let two_factor_authenticated;
  const trx = await knex.transaction();
  try {
    const { email, password } = body;
    const validator = validators.adminUser.loginValidator.validate({ email, password });
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Validation error while admin signin", { body, message, requestId });

      await trx.rollback();
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const userExists = await adminRepo.getAdminByFilter({ email, is_deleted: false });
    if (!userExists) {
      const message = "email or password is Invalid";
      logger.debug(message, { email, requestId });
      await trx.rollback();
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }
    user_id = userExists.user_id;
    two_factor_authenticated = userExists.is_2fa_enabled;
    const { username } = userExists;
    const isPasswordValid = await bcrypt.compare(password, userExists.password);
    if (!isPasswordValid) {
      const message = "Username or password is Invalid";

      await adminLoginLogRepo.addLoginRecord(
        {
          user_id,
          attempt_success: false,
          attempt_status_char: message,
          ip,
          two_factor_authenticated,
          login_device,
          attempt_type: "password",
        },
        { trx }
      );

      await trx.commit();
      return res.status(400).json({
        status: false,
        message: message,
        data: null,
      });
    }

    const role = (await roleRepo.getRoleById(userExists.role_id)) as Role;

    if (!userExists.is_2fa_enabled) {
      const { token: jwtToken, data: resData } = getJwtToken(
        user_id,
        email,
        username,
        two_factor_authenticated,
        role.role_name
      );

      await adminRepo.updateAdmin(
        { user_id },
        { last_login_ip: ip, last_login_timestamp: moment().toISOString() },
        { trx }
      );

      await adminLoginLogRepo.addLoginRecord(
        {
          user_id,
          attempt_success: true,
          attempt_status_char: "password verification success",
          ip,
          two_factor_authenticated,
          login_device,
          attempt_type: "password",
        },
        { trx }
      );

      await adminRepo.updateAdmin(
        { user_id },
        { last_login_ip: ip, last_login_timestamp: moment().toISOString() },
        { trx }
      );

      const access_rights = await accessControlRepo.getAccessControlModulesByRoleId(userExists.role_id);

      await trx.commit();

      return res
        .status(200)
        .header("Access-Control-Expose-Headers", "token")
        .setHeader("token", jwtToken)
        .json({
          status: true,
          message: "Successfully Signed in!",
          data: { ...resData, access_rights },
        });
    }

    const cachedOTP = otpHelper.getOtp(email, "admin_login");

    if (cachedOTP) {
      const message = "OTP Already Sent.";
      await adminLoginLogRepo.addLoginRecord(
        {
          user_id,
          attempt_success: false,
          attempt_status_char: message,
          ip,
          two_factor_authenticated,
          login_device,
          attempt_type: "password",
        },
        { trx }
      );

      await trx.commit();
      return res.status(200).json({
        status: true,
        message,
        data: {
          email,
          otpSent: true,
        },
      });
    }

    const { timeRemaining, tooManyAttempts, lockedTill } = otpHelper.canSendOtp(email, "admin_login");

    if (tooManyAttempts) {
      const message = `Too Many Attempts try again after ${timeRemaining}.Too Many Attempts try again after ${timeRemaining}.`;
      await adminLoginLogRepo.addLoginRecord(
        {
          user_id,
          attempt_success: false,
          attempt_status_char: message,
          ip,
          two_factor_authenticated,
          login_device,
          attempt_type: "password",
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

    const message = "OTP Sent Successfully.";

    await adminLoginLogRepo.addLoginRecord(
      {
        user_id,
        ip,
        attempt_success: true,
        two_factor_authenticated,
        attempt_status_char: message,
        attempt_type: "password",

        login_device,
      },
      { trx }
    );

    const { token } = otpHelper.sendOtp(email, "admin_login", requestId);
    await mailHelper.sendLoginOtp(email, token, requestId);

    await trx.commit();
    return res.status(200).json({
      status: true,
      message,
      data: { email, otpSent: true },
    });
  } catch (err) {
    const message = "Error while admin sign in";
    logger.error(message, { err, requestId });
    await trx.rollback();
    if (user_id) {
      let errorMessage = "";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      await adminLoginLogRepo.addLoginRecord({
        user_id,
        ip,
        attempt_success: false,
        two_factor_authenticated,
        attempt_status_char: `password verification failed ` + errorMessage,
        login_device,
        attempt_type: "password",
      });
    }
    return res.status(500).json({
      status: false,
      message: message,
      data: null,
    });
  }
};

const verifyOtp = async (req: AdminRequest, res: Response) => {
  const { body, requestId } = req;
  const ip = helpers.getIp(req);
  const login_device = helpers.getDeviceDetails(req);
  let user_id;
  let two_factor_authenticated;
  const trx = await knex.transaction();
  try {
    const { email, token } = body;
    const validator = validators.adminUser.otpValidator.validate({ email, token });
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Validation error while admin verifying OTP", { body, message, requestId });
      await trx.rollback();
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const adminDetails = await adminRepo.getAdminByFilter({
      email,
    });
    if (!adminDetails) {
      const message = "Admin account not found with this email!";
      await adminLoginLogRepo.addLoginRecord(
        {
          user_id,
          ip,
          attempt_success: false,
          two_factor_authenticated,
          attempt_status_char: message,
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

    user_id = adminDetails.user_id;
    two_factor_authenticated = adminDetails.is_2fa_enabled;

    const { timeRemaining, tooManyAttempts, lockedTill } = otpHelper.canSendOtp(email, "admin_login", 3);

    if (tooManyAttempts) {
      const message = `Too Many Attempts try again after ${timeRemaining}.`;
      await adminLoginLogRepo.addLoginRecord(
        {
          user_id,
          ip,
          attempt_success: false,
          two_factor_authenticated,
          attempt_status_char: message,
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

    const cachedOTP = otpHelper.getOtp(email, "admin_login");

    if (!cachedOTP) {
      const message = `Invalid OTP. Retry Login.`;
      await adminLoginLogRepo.addLoginRecord(
        {
          user_id,
          ip,
          attempt_success: false,
          two_factor_authenticated,
          attempt_status_char: message,
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
      otpHelper.otpRetryLimiter(email, "admin_login");
      const { timeRemaining, tooManyAttempts, lockedTill } = otpHelper.canSendOtp(email, "admin_login", 3);

      if (tooManyAttempts) {
        otpHelper.clearOtp(email, "admin_login");
        const message = `Too Many Attempts try again after ${timeRemaining}.`;
        await adminLoginLogRepo.addLoginRecord(
          {
            user_id,
            ip,
            attempt_success: false,
            two_factor_authenticated,
            attempt_status_char: message,
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
      await adminLoginLogRepo.addLoginRecord(
        {
          user_id,
          ip,
          attempt_success: false,
          two_factor_authenticated,
          attempt_status_char: message,
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

    otpHelper.clearOtp(email, "admin_login");
    otpHelper.resetFailedAttempt(email, "admin_login");

    const { username } = adminDetails;

    const message = "OTP successfully verified!";

    await adminRepo.updateAdmin(
      { user_id },
      { last_login_ip: ip, last_login_timestamp: moment().toISOString() },
      { trx }
    );
    await adminLoginLogRepo.addLoginRecord(
      {
        user_id,
        attempt_success: true,
        attempt_status_char: message,
        ip,
        two_factor_authenticated,
        login_device,
        attempt_type: "otp",
      },
      { trx }
    );
    const role = (await roleRepo.getRoleById(adminDetails.role_id)) as Role;

    const { token: jwtToken, data: resData } = getJwtToken(
      user_id,
      email,
      username,
      two_factor_authenticated,
      role.role_name
    );

    const access_rights = await accessControlRepo.getAccessControlModulesByRoleId(adminDetails.role_id);

    await trx.commit();
    return res
      .status(200)
      .header("Access-Control-Expose-Headers", "token")
      .setHeader("token", jwtToken)
      .json({
        status: true,
        message,
        data: { ...resData, access_rights },
      });
  } catch (err) {
    const message = "Error while verifying admin OTP";
    logger.error(message, { err, body, requestId });
    await trx.rollback();
    if (user_id) {
      let errorMessage = "";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      await adminLoginLogRepo.addLoginRecord({
        user_id,
        ip,
        attempt_success: false,
        two_factor_authenticated,
        attempt_status_char: `otp verification failed ` + errorMessage,
        login_device,
        attempt_type: "otp",
      });
    }
    return res.status(500).json({
      status: false,
      message,
      data: null,
    });
  }
};

const resendOtp = async (req: AdminRequest, res: Response) => {
  const { body, requestId } = req;
  try {
    const { email } = body;
    const validator = validators.common.email.validate(email);
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Validation error while resending admin OTP", { body, message, requestId });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const cachedOTP = otpHelper.getOtp(email, "admin_login");

    if (cachedOTP) {
      return res.status(400).json({
        status: false,
        message: `OTP Already Sent.`,
        data: null,
      });
    }

    const { timeRemaining, tooManyAttempts, lockedTill } = otpHelper.canSendOtp(email, "admin_login");

    if (tooManyAttempts) {
      return res.status(400).json({
        status: false,
        message: `Too Many Attempts try again after ${timeRemaining}.`,
        data: {
          tooManyAttempts: true,
          lockedTill,
        },
      });
    }

    const { token } = otpHelper.sendOtp(email, "admin_login", requestId, true);
    await mailHelper.sendLoginOtp(email, token, requestId);

    return res.status(200).json({
      status: true,
      message: "OTP has been sent to your Email ID",
      data: { email },
    });
  } catch (err) {
    const message = "Error while resending OTP";
    logger.error(message, { err, body, requestId });
    return res.status(500).json({
      status: false,
      message,
      data: null,
    });
  }
};

const signout = (req: AdminRequest, res: Response) => {
  const { requestId } = req;
  try {
    // TODO: SIGNOUT RELATED ACTIVITES HERE | LOGOUT RECORD IF MAINTAINED
    // const user_id = req.user.user_id;
    // await adminRepo.updateAdmin({ user_id }, { });
    return res.status(200).json({ status: true, message: "Logged out successfully.", data: null });
  } catch (err) {
    let message = "Error while signing out admin user";
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

const updatePassword = async (req: AdminRequest, res: Response) => {
  const { body, requestId } = req;
  const user = req?.user as AdminUser;
  try {
    const user_id = user.user_id;
    const { old_password, new_password, cnf_password } = body;

    const updatePasswordValidator = validators.adminUser.updatePasswordValidator.required().validate({
      old_password,
      new_password,
      cnf_password,
    });
    const updatePasswordErrorMessage = updatePasswordValidator?.error?.message;
    if (updatePasswordErrorMessage) {
      logger.debug(`Update Password validation failed`, { updatePasswordErrorMessage, body, user, requestId });
      return res.status(400).json({ status: false, message: updatePasswordErrorMessage, data: null });
    }

    const oldPasswordMatches = await bcrypt.compare(old_password, user.password);
    if (!oldPasswordMatches) {
      const message = "Invalid Password";
      return res.status(400).json({
        status: false,
        message: message,
        data: null,
      });
    }

    if (old_password == new_password) {
      const message = "Old Password cannot be New password";
      return res.status(400).json({
        status: false,
        message: message,
        data: null,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const encPassword = await bcrypt.hash(new_password, salt);

    const { username, email, is_2fa_enabled } = user;

    await adminRepo.updateAdmin({ user_id }, { password: encPassword, updated_by: user_id });
    const role = (await roleRepo.getRoleById(user.role_id)) as Role;

    const { token: jwtToken, data: resData } = getJwtToken(user_id, email, username, is_2fa_enabled, role.role_name);

    return res.status(200).header("Access-Control-Expose-Headers", "token").setHeader("token", jwtToken).json({
      status: true,
      message: "Password Updated successfully",
      data: resData,
    });
  } catch (error) {
    const message = "Error while updating admin password";
    logger.error(message, { error, user, body, requestId });
    return res.status(500).json({
      status: false,
      message,
      data: null,
    });
  }
};

const forgotPassword = async (req: AdminRequest, res: Response) => {
  const { body, requestId } = req;
  try {
    const { email } = body;
    const emailValidator = validators.common.email.required().validate(email);
    const emailErrorMessage = emailValidator?.error?.message;
    if (emailErrorMessage) {
      logger.debug(`email validation failed`, { emailErrorMessage, body, requestId });
      return res.status(400).json({ status: false, message: "Invalid email", data: null });
    }

    const userProfile = await adminRepo.getAdminByFilter({ email });
    if (!userProfile) {
      return res.status(400).json({
        status: false,
        message: "Profile not Found",
        data: null,
      });
    }

    const token = v4().replace(/-/g, "");

    const resetKey = helpers.getResetTokenKey(token, email);

    const user_id = userProfile.user_id;

    cache.put(resetKey, user_id, 1000 * 60 * 60 * 24 * 1); // 1 day

    const resetPasswordUrl = helpers.getAdminResetPasswordURL(token, email);

    logger.debug("Reset Password URL", { requestId, url: resetPasswordUrl });

    await mailHelper.sendResetPasswordUrl(email, resetPasswordUrl, requestId);

    return res.status(200).json({
      status: true,
      message: "Reset link has been sent to your email.",
      data: resetPasswordUrl,
    });
  } catch (err) {
    let message = "something went wrong while trying to send reset password link! Please try again.";
    if (err instanceof Error) {
      message = err.message;
    }
    logger.error("error while sending reset password link", { err, body, requestId });
    return res.status(500).json({
      status: false,
      message,
      data: null,
    });
  }
};

const resetPassword = async (req: AdminRequest, res: Response) => {
  const { body, requestId } = req;
  try {
    const { password, cnf_password, reset_token, email } = body;

    const resetPasswordvalidator = validators.adminUser.resetPasswordValidator.required().validate({
      reset_token,
      email,
      password,
      cnf_password,
    });
    const resetPasswordErrorMessage = resetPasswordvalidator?.error?.message;
    if (resetPasswordErrorMessage) {
      logger.debug(`Resset Password validation failed`, { resetPasswordErrorMessage, body, requestId });
      return res.status(400).json({ status: false, message: resetPasswordErrorMessage, data: null });
    }

    const resetKey = helpers.getResetTokenKey(reset_token, email);

    const user_id = cache.get(resetKey);

    if (!user_id) {
      return res.status(400).json({
        status: false,
        message: "Token Invalid or Expired.",
        data: null,
      });
    }

    const adminProfile = await adminRepo.getAdminByFilter({ user_id });

    if (!adminProfile) {
      return res.status(400).json({
        status: false,
        message: "Profile not Found",
        data: null,
      });
    }

    if (String(adminProfile.email).toLowerCase() !== String(email).toLowerCase()) {
      return res.status(400).json({
        status: false,
        message: "Invalid Code",
        data: null,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const encPassword = await bcrypt.hash(password, salt);

    await adminRepo.updateAdmin({ email, user_id }, { password: encPassword });

    cache.del(resetKey);

    return res.status(200).json({
      status: true,
      message: "Password Reset Successful.",
      data: null,
    });
  } catch (err) {
    const message = "something went wrong while trying to reset password! Please try again.";
    logger.error(message, { err, requestId, body });
    return res.status(500).json({
      status: false,
      message,
      data: null,
    });
  }
};

const toggle2faStatus = async (req: AdminRequest, res: Response) => {
  const { body, requestId } = req;
  const user = req?.user as AdminUser;

  try {
    const { is_enabled: isEnabled } = body;
    const statusValidator = validators.common.boolean.required().validate(isEnabled);
    const statusErrorMessage = statusValidator?.error?.message;
    if (statusErrorMessage) {
      logger.debug(`2FA toggle validation failed`, { statusErrorMessage, body, requestId });
      return res.status(400).json({ status: false, message: "Invalid Status", data: null });
    }
    const is_enabled = !!isEnabled;

    const user_id = user.user_id;
    const email = user.email;
    const cacheKey = `${email}_${is_enabled}`;
    const adminUser = await adminRepo.getAdminById(user_id);

    if (adminUser?.is_2fa_enabled === is_enabled) {
      return res.status(400).json({ status: false, message: "2FA status has been already updated", data: null });
    }

    const cachedOTP = otpHelper.getOtp(cacheKey, "toggle_2fa");
    if (cachedOTP) {
      const message = "OTP Already Sent to registered Email ID";
      return res.status(200).json({
        status: true,
        message,
        data: null,
      });
    }

    const { timeRemaining, tooManyAttempts, lockedTill } = otpHelper.canSendOtp(cacheKey, "toggle_2fa");
    if (tooManyAttempts) {
      const message = `Too Many Attempts try again after ${timeRemaining}.Too Many Attempts try again after ${timeRemaining}.`;

      return res.status(400).json({
        status: false,
        message,
        data: {
          tooManyAttempts: true,
          lockedTill,
        },
      });
    }

    const message = "OTP sent to the Registered Email ID.";
    const { token } = otpHelper.sendOtp(cacheKey, "toggle_2fa", requestId);
    await mailHelper.sendToggleTwofactorAuthOtp(email, token, requestId, is_enabled ? "enable" : "disable");

    return res.status(200).json({ status: true, message, data: null });
  } catch (err) {
    const message = "Error while updating 2fa status";
    logger.error(message, { err, body, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const confirm2faToggle = async (req: AdminRequest, res: Response) => {
  const { body, requestId } = req;
  const user = req.user as AdminUser;
  try {
    const { token, is_enabled } = body;
    const statusValidator = validators.common.otp.required().validate(token);
    const statusErrorMessage = statusValidator?.error?.message;
    if (statusErrorMessage) {
      logger.debug(`2FA toggle validation failed`, { statusErrorMessage, body, requestId });
      return res.status(400).json({ status: false, message: "Invalid OTP", data: null });
    }

    const user_id = user.user_id;
    const email = user.email;
    const cacheKey = `${email}_${is_enabled}`;

    const { timeRemaining, tooManyAttempts, lockedTill } = otpHelper.canSendOtp(cacheKey, "toggle_2fa", 3);

    if (tooManyAttempts) {
      const message = `Too Many Attempts try again after ${timeRemaining}.`;
      return res.status(400).json({
        status: false,
        message,
        data: {
          tooManyAttempts: true,
          lockedTill,
        },
      });
    }

    const cachedOTP = otpHelper.getOtp(cacheKey, "toggle_2fa");

    if (!cachedOTP) {
      const message = `Invalid OTP. Please request again after some time.`;
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    if (token !== cachedOTP?.token) {
      otpHelper.otpRetryLimiter(cacheKey, "toggle_2fa");
      const { timeRemaining, tooManyAttempts, lockedTill } = otpHelper.canSendOtp(cacheKey, "toggle_2fa", 3);

      if (tooManyAttempts) {
        otpHelper.clearOtp(cacheKey, "toggle_2fa");
        const message = `Too Many Attempts try again after ${timeRemaining}.`;
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
      return res.status(400).json({
        status: false,
        message,
        data: {
          incorrectOTP: true,
        },
      });
    }

    otpHelper.clearOtp(email, "toggle_2fa");
    otpHelper.resetFailedAttempt(email, "toggle_2fa");

    const adminUser = await adminRepo.getAdminById(user_id);

    if (adminUser?.is_2fa_enabled === is_enabled) {
      return res.status(400).json({ status: false, message: "2FA status has been already updated", data: null });
    }
    const message = `2FA has been successfully ${is_enabled ? "enable" : "disable"}d`;
    await adminRepo.updateAdmin({ user_id }, { is_2fa_enabled: is_enabled });

    const role = (await roleRepo.getRoleById(user.role_id)) as Role;

    const { token: jwtToken, data: resData } = getJwtToken(user_id, email, user.username, is_enabled, role?.role_name);
    return res.status(200).header("Access-Control-Expose-Headers", "token").setHeader("token", jwtToken).json({
      status: true,
      message,
      data: resData,
    });
  } catch (err) {
    const message = "Error while updating 2FA status";
    logger.error(message, { err, body, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

export default {
  signin,
  verifyOtp,
  resendOtp,
  signout,
  updatePassword,
  forgotPassword,
  resetPassword,
  toggle2faStatus,
  confirm2faToggle,
};
