import joi from "joi";

import regex from "./regex";

const passwordRegexMessage =
  "Password needs to have at least one digit, one special character, one lowercase letter, one uppercase letter, and a total length between 8 and 20 characters.";

// common validation
const username = joi.string().min(3).max(12).pattern(regex.username);
const password = joi.string().pattern(regex.password).message(passwordRegexMessage);
// const email = joi.string().pattern(regex.email);
const email = joi.string().email();

const uuid = joi.string().uuid({ version: ["uuidv4"] });
const phone = joi.string().pattern(regex.phone);

const number = joi.string().pattern(regex.number);
const otp = number.length(6);
const amount = joi.number().integer().min(1).max(10000000);
const name = joi.string().min(3).max(25).pattern(regex.name);
const address = joi.string().min(6).max(100).pattern(regex.address);

const awsRegion = joi.string().pattern(regex.awsRegion).message("Invalid AWS Region");

const boolean = joi.boolean();

const isDeleted = joi.object({
  id: uuid.required(),
  is_deleted: boolean.required(),
});

const isFlagged = joi.object({
  id: uuid.required(),
  is_flagged: boolean.required(),
});

const paymentReqMethod = joi.string().valid("IMPS", "NEFT");

const pin = number.length(4);

export default {
  username,
  password,
  email,
  uuid,
  phone,
  otp,
  amount,
  name,
  address,
  awsRegion,
  number,
  boolean,
  isDeleted,
  paymentReqMethod,
  isFlagged,
  pin,
};
