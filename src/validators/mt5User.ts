import Joi from "joi";
import validators from "./common";

const newUserValidator = Joi.object({
  email: validators.email.required(),
  phone_number: validators.phone.optional(),
  username: validators.username.required(),
});

export default {
  newUserValidator,
};
