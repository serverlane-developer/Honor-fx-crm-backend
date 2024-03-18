import config from "../config";

import sendMail from "../utils/sendMail";
import { requestId } from "../@types/Common";

const canSendOTP = config.SEND_EMAIL;

const emailBody = {
  admin_login: (token: string) => `Your OTP for login is ${token}`,
  toggle_2fa: (token: string, status: "enable" | "disable") =>
    `Your OTP to ${status} Two Factor Authentication is ${token}`,
  reset_password: (url: string) => `Please visit ${url} to reset your password`,
};

const sendLoginOtp = async (email: string, token: string, requestId: requestId) => {
  const emailObj = {
    to: email,
    subject: "Payout Backoffice Login OTP",
    body: emailBody["admin_login"](token),
    requestId,
  };
  await sendMail(emailObj);
};

const sendToggleTwofactorAuthOtp = async (
  email: string,
  token: string,
  requestId: requestId,
  status: "enable" | "disable"
) => {
  if (canSendOTP) {
    const emailObj = {
      to: email,
      subject: "Payout Backoffice Two Factor Authentication",
      body: emailBody["toggle_2fa"](token, status),
      requestId,
    };
    await sendMail(emailObj);
  }
};

const sendResetPasswordUrl = async (email: string, url: string, requestId: requestId) => {
  if (canSendOTP) {
    const emailObj = {
      to: email,
      subject: "Payout Backoffice Reset Password URL",
      body: emailBody["reset_password"](url),
      requestId,
    };
    await sendMail(emailObj);
  }
};

export default {
  sendLoginOtp,
  sendToggleTwofactorAuthOtp,
  sendResetPasswordUrl,
};
