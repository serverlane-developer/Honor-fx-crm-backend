import moment from "moment";
import myCache from "memory-cache";

import config from "../config";
import logger from "../utils/logger";
import helpers from "../helpers/helpers";
import { OtpObject, otp_type } from "../@types/Otp";

const { SEND_EMAIL, SEND_CUSTOMER_OTP } = config;

const getOtpCacheKey = (key: string, otp_type: otp_type): string => `${key}_${otp_type}_otp`;

const getOtpFailAttemptCacheKey = (key: string, otp_type: otp_type): string => `${key}_${otp_type}_otp_fail_attempt`;

/** Check If OTP was sent too may times */
const canSendOtp = (key: string, otp_type: otp_type, attempt: number = 2) => {
  const failedAttemptFromCache = myCache.get(getOtpFailAttemptCacheKey(key, otp_type));

  const last_attempt_at = failedAttemptFromCache?.last_attempt_at;
  const expire_at = moment(last_attempt_at).add(config.OTP_VERIFICATION_LOCK_MINUTES, "minutes").toISOString();

  // token wiil be considered expired after 1 minute
  const verification_locked = moment().isBefore(expire_at);
  const timeRemaining = moment.utc(moment(expire_at).diff(moment())).format("mm:ss");

  const tooManyAttempts = failedAttemptFromCache?.count >= attempt && verification_locked;
  const lockedTill = moment(last_attempt_at).add(config.OTP_VERIFICATION_LOCK_MINUTES, "minutes").toISOString();
  return { tooManyAttempts, timeRemaining, lockedTill };
};

/** LIMIT OTP FAILED ATTEMPTS */
const otpRetryLimiter = (key: string, otp_type: otp_type) => {
  const cacheKey = getOtpFailAttemptCacheKey(key, otp_type);
  const failedAttemptFromCache = myCache.get(cacheKey);

  const count = (Number(failedAttemptFromCache?.count || 0) || 0) + 1;
  const newAttempt = {
    count,
    last_attempt_at: new Date().toISOString(),
  };
  myCache.put(cacheKey, newAttempt, 1000 * 60 * 5);
};

const sendOtp = (
  email: string,
  otp_type: otp_type,
  requestId: string | undefined,
  resend: boolean = false
): OtpObject => {
  const isDevEnv = !(otp_type === "customer_login" ? SEND_CUSTOMER_OTP : SEND_EMAIL);

  const otpCacheKey = getOtpCacheKey(email, otp_type);

  try {
    if (isDevEnv && !config.DEV_OTP) throw new Error("OTP not configured for dev env");
    if (config.EMAIL_WITH_STATIC_OTP.length > 0 && !config.STATIC_OTP)
      throw new Error("OTP not configured for exceptional Email IDs");

    const token = myCache.get(otpCacheKey);
    if (token) {
      // console.log(token);
      const EXPIRE_INTERVAL = process.env.OTP_EXPIRY_MINUTES || 1; // minutes
      const created_at = token.created_at;
      const expire_at = moment(created_at).add(EXPIRE_INTERVAL, "minutes").toISOString();

      // token wiil be considered expired after 1 minute
      const has_expired = moment().isBefore(expire_at);

      // if, token was resent and 2 minutes haven't passed cannot resend token again
      if (has_expired && token.resend) {
        const timeRemaining = moment.utc(moment(expire_at).diff(moment())).format("mm:ss");
        throw new Error(`OTP was sent recently. Please request again after ${timeRemaining}.`);
      }
    }

    const newToken = isDevEnv
      ? config.EMAIL_WITH_STATIC_OTP.includes(email)
        ? config.STATIC_OTP
        : config.DEV_OTP
      : String(helpers.getRandomNumber(6));

    if (!newToken) throw new Error("Error while Generating OTP");

    const value = {
      token: newToken,
      created_at: moment().toISOString(),
      resend,
    };
    if (config.LOG_OTP) {
      logger.debug("OTP", { email, otp_type, value, isDevEnv, requestId });
    }
    myCache.put(otpCacheKey, value, 1000 * 60 * config.OTP_EXPIRY_MINUTES);
    // if (canSendOTP) {
    //   const emailObj = getEmailObject(email, token, otp_type, requestId);
    //   await sendMail(emailObj);
    // }
    return value;
  } catch (error) {
    logger.error(`Error while sending admin's login OTP`, {
      err: error,
      key: email,
      otp_type,
      resend,
      isDevEnv,
      requestId,
    });
    throw error;
  }
};

const getOtp = (key: string, otp_type: otp_type): OtpObject | null => {
  if (!key) throw new Error("KEY is required");
  const tokenFromCache = myCache.get(getOtpCacheKey(key, otp_type));
  if (!tokenFromCache) return null;
  const { token, created_at, resend }: OtpObject = tokenFromCache;
  return { token, created_at, resend };
};

const resetFailedAttempt = (key: string, otp_type: otp_type) => {
  myCache.del(getOtpFailAttemptCacheKey(key, otp_type));
};

const clearOtp = (key: string, otp_type: otp_type) => {
  if (!key) return;
  myCache.del(getOtpCacheKey(key, otp_type));
};

export default {
  otpRetryLimiter,
  canSendOtp,
  sendOtp,
  getOtp,
  resetFailedAttempt,
  clearOtp,
};
