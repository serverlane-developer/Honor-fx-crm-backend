import Joi from "joi";
import validators from "./common";

const newSubmodule = Joi.object({
  submodule_name: Joi.string().min(3).max(25).required(),
  module_id: validators.uuid.required(),
});

const oldSubmodule = Joi.object({
  submodule_name: Joi.string().min(3).max(25).required(),
  submodule_id: validators.uuid.required(),
  module_id: validators.uuid.optional(),
  is_deleted: Joi.boolean().invalid(true), // can only enable module
});

export default { newSubmodule, oldSubmodule };
