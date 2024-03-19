import Joi from "joi";
import validators from "./common";

const newUserValidator = Joi.object({
  email: validators.email.optional(),
  phone_number: validators.phone.required(),
  username: validators.username.required(),
  pin: validators.pin.required(),
  cnf_pin: Joi.ref("pin"),
}).with("pin", "cnf_pin");

const loginValidator = Joi.object({
  phone_number: validators.phone.required(),
  pin: validators.pin.required(),
});

const otpValidator = Joi.object({
  phone_number: validators.phone.required(),
  token: validators.otp.required(),
});

const resetPinValidator = Joi.object({
  pin: validators.pin.required(),
  cnf_pin: Joi.ref("pin"),
  phone_number: validators.phone.required(),
  reset_token: validators.uuid.required(),
}).with("pin", "cnf_pin");

const updatePinValidator = Joi.object({
  old_pin: validators.pin.required(),
  new_pin: validators.pin.required(),
  cnf_pin: Joi.ref("new_pin"),
}).with("new_pin", "cnf_pin");

const updateUserValidation = Joi.object({
  customer_id: validators.uuid.required(),
  email: validators.email.optional(),
  username: validators.username.required(),
  phone_number: validators.phone.required(),
});

export default {
  newUserValidator,
  loginValidator,
  otpValidator,
  resetPinValidator,
  updatePinValidator,
  updateUserValidation,
};
