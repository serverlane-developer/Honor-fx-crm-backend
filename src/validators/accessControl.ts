import Joi from "joi";
import validators from "./common";

const validator = Joi.object({
  access_control_id: validators.uuid.required(),
  role_id: validators.uuid.required(),
  created_by: validators.uuid.required(),
  updated_by: validators.uuid.required(),
  submodule_id: validators.uuid.required(),
  can_create: validators.boolean.required(),
  can_delete: validators.boolean.required(),
  can_read: validators.boolean.required(),
  can_update: validators.boolean.required(),
});

export default { validator };
