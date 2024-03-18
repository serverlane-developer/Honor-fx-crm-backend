import Joi from "joi";
import validators from "./common";

const newUserValidator = Joi.object({
  email: validators.email.required(),
  username: validators.username.required(),
  password: validators.password.required(),
  role_id: validators.uuid.required(),
  cnf_password: Joi.ref("password"),
}).with("password", "cnf_password");

const loginValidator = Joi.object({
  email: validators.email.required(),
  password: validators.password.required(),
});

const otpValidator = Joi.object({
  email: validators.email.required(),
  token: validators.otp.required(),
});

const resetPasswordValidator = Joi.object({
  password: validators.password.required(),
  cnf_password: Joi.ref("password"),
  email: validators.email.required(),
  reset_token: validators.uuid.required(),
}).with("password", "cnf_password");

const updatePasswordValidator = Joi.object({
  old_password: validators.password.required(),
  new_password: validators.password.required(),
  cnf_password: Joi.ref("new_password"),
}).with("new_password", "cnf_password");

const updateUserValidation = Joi.object({
  user_id: validators.uuid.required(),
  email: validators.email.required(),
  username: validators.username.required(),
});

export default {
  newUserValidator,
  loginValidator,
  otpValidator,
  resetPasswordValidator,
  updatePasswordValidator,
  updateUserValidation,
};
