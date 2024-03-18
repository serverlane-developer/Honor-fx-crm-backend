import Joi from "joi";
import validators from "./common";

const newModule = Joi.object({
  module_name: Joi.string().min(3).max(25).required(),
});

const oldModule = Joi.object({
  module_name: Joi.string().min(3).max(25).required(),
  module_id: validators.uuid.required(),
});

export default { newModule, oldModule };
