import crypto from "crypto";
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
  length > 0
    ? String(
        Math.floor(Math.random() * Number(`${9}${"0".repeat(length - 1)}`)) + Number(`${1}${"0".repeat(length - 1)}`)
      )
    : "";

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

const getRandomId = (length = 16) => crypto.randomBytes((length && length > 2 ? length : 2) / 2).toString("hex");

const generatePassword = (length = 8, { upper = true, special = true, num = true, lower = true } = {}) => {
  const charset = lower ? "abcdefghijklmnopqrstuvwxyz" : "";
  const caps = upper ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : "";
  const nums = num ? "0123456789" : "";
  const specials = special ? (typeof special === "boolean" ? "@#$&" : typeof special === "string" ? special : "") : "";
  let password = "";

  const applied = {
    upper: false,
    lower: false,
    special: false,
    num: false,
  };

  const str = charset + caps + nums + specials;

  if (str.length < length)
    throw new Error(
      `Password conditions restriciting characters for use\nCurrently only these character can be used "${str}".\nPlease allow more characters to be used for generating password `
    );

  for (let i = 0; i < length; ++i) {
    if (upper && !applied.upper) {
      password += caps.charAt(Math.floor(Math.random() * caps.length));
      applied.upper = true;
    } else if (num && !applied.num) {
      password += nums.charAt(Math.floor(Math.random() * nums.length));
      applied.num = true;
    } else if (special && !applied.special) {
      password += specials.charAt(Math.floor(Math.random() * specials.length));
      applied.special = true;
    } else if (lower && !applied.lower) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
      applied.lower = true;
    } else {
      password += str.charAt(Math.floor(Math.random() * str.length));
    }
  }
  return password;
};

export default {
  getResetTokenKey,
  getAdminResetPasswordURL,
  getRandomNumber,
  getIp,
  getDeviceDetails,
  parseDeviceDetails,
  getRandomMobileNumber,
  getRandomId,
  generatePassword,
};
