import { Request } from "express";
import useragent from "express-useragent";
import config from "../config";

const getAdminResetPasswordURL = (token: string, email: string) => {
  if (!token) throw new Error("Token is Required to generate reset password url");
  const baseUrl = config.BACKOFFICE_BASE_URL; // this will be kds pay frontend url
  const url = `${baseUrl}/reset-password?reset_token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  return encodeURI(url);
};

const getResetTokenKey = (token: string, email: string) => {
  if (!token || !email) throw new Error("Token and email is Required");
  return `${token}_${email}@reset-password`;
};

const getRandomNumber = (length: number = 6): string =>
  String(Math.floor(Math.random() * Number(`${9}${"0".repeat(length)}`)) + Number(`${1}${"0".repeat(length)}`));

const getIp = (req: Request) => {
  if (!req) throw new Error("Request data is required to get IP");
  const ip = req?.body?.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;
  return ip;
};

const getDeviceDetails = (req: Request) => {
  const useragent = req.useragent?.source;
  return useragent;
};

const parseDeviceDetails = (deviceString: string) => {
  const device = useragent.parse(deviceString);
  return {
    browser: device.browser,
    version: device.version,
    os: device.os,
    platform: device.platform,
    source: device.source,
  };
};

const getRandomMobileNumber = () => {
  let str =
    "9" +
    Math.floor(Math.random() * 1000000000)
      .toString()
      .toString();
  while (str.length < 10) {
    str = "9" + str;
  }
  return str.toString();
};

export default {
  getResetTokenKey,
  getAdminResetPasswordURL,
  getRandomNumber,
  getIp,
  getDeviceDetails,
  parseDeviceDetails,
  getRandomMobileNumber,
};
