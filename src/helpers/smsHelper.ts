import * as libphonenumber from "libphonenumber-js";
import axios from "axios";
import config from "../config";
import logger from "../utils/logger";
import { requestId } from "../@types/Common";

const getOTPMessage = (otp: string) => {
  const message = config.SMS_MESSAGE; // OTP TEMPLATE
  const keyword = config.SMS_KEYWORD; // KEYWORD IN TEMPLATE TO REPLACE OTP WITH
  return message.replace(keyword, otp);
};

const sendOTPSms = async (phone_number: string, otp: string, requestId: requestId) => {
  try {
    if (!phone_number) throw new Error("PHONE NUMBER IS REQUIRED");
    if (!otp) throw new Error("Cannot Send SMS with no OTP");
    if (!config.SEND_CUSTOMER_OTP) throw new Error("Sending Customer OTP is not allowed");
    const parsedPhoneNumber = libphonenumber.parsePhoneNumber(phone_number);
    const countryCode = parsedPhoneNumber.countryCallingCode;
    const number = parsedPhoneNumber.nationalNumber;
    const template = getOTPMessage(otp);

    const params = {
      authkey: config.SMS_AUTH_KEY,
      mobiles: number,
      message: template,
      sender: config.SMS_SENDER,
      route: config.SMS_ROUTE,
      country: countryCode,
      DLT_TE_ID: config.SMS_DLT_TE_ID,
    };
    const queryString = new URLSearchParams(params).toString();
    const url = `${config.SMS_BASE_URL}/sendhttp.php?${queryString}`;

    const response = await axios(url);
    if (config.LOG_OTP) logger.debug("OTP SMS Response", { requestId, url, response: response.data });
    const isSuccess = response?.data?.Code === "001";
    if (!isSuccess) {
      logger.error("Error while sending OTP", { response: response?.data, phone_number, otp, url, requestId });
      throw "Error while Sending OTP";
    }
  } catch (err) {
    logger.error(`Error while sending OTP SMS`, { phone_number, err, requestId });
    throw err;
  }
};

export default {
  sendOTPSms,
};
