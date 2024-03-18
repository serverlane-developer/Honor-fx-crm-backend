import Joi from "joi";
import validators from "./common";

const newRole = Joi.object({
  role_name: Joi.string().min(3).max(50).required(),
  access_detail: Joi.array()
    .items(
      Joi.object({
        submodule_id: validators.uuid.required(),
        can_create: validators.boolean.required(),
        can_delete: validators.boolean.required(),
        can_read: validators.boolean.required(),
        can_update: validators.boolean.required(),
      })
    )
    .min(1)
    .required(),
});

const oldRole = Joi.object({
  role_name: Joi.string().min(3).max(50).required(),
  access_detail: Joi.array().min(1).required(),
  role_id: validators.uuid.required(),
});

export default { newRole, oldRole };
