import Joi from "joi";
import { PAYIN_SERVICE } from "../@types/Payin";
import validators from "./common";

const payinKeysValidator = {
  [PAYIN_SERVICE.PAYDUNIA]: {
    PAYDUNIA_BASE_URL: Joi.string().uri().required(),
    PAYDUNIA_STATUS_URL: Joi.string().uri().required(),
    PAYDUNIA_MERCHANT_ID: Joi.string().required(),
    PAYDUNIA_SECRET_KEY: Joi.string().required(),
    PAYDUNIA_EMAIL: Joi.string().required(),
    PAYDUNIA_PASSWORD: Joi.string().required(),
  },
};

const pgServiceValidator = {
  [PAYIN_SERVICE.PAYDUNIA]: {
    base_url_alt: Joi.string().required(),
    merchant_id: Joi.string().required(),
    secret_key: Joi.string().required(),
    username: Joi.string().required(),
    password: Joi.string().required(),
  },
};

const pgValidator = {
  pg_label: Joi.string().required(),
  nickname: Joi.string().required(),
  pg_service: Joi.string().valid(PAYIN_SERVICE.PAYDUNIA).required(),

  base_url: Joi.string().uri().required(),
  base_url_alt: Joi.string().uri().optional(),
  merchant_id: Joi.string().optional(),
  secret_key: Joi.string().optional(),
  client_id: Joi.string().optional(),
  description: Joi.string().optional(),
  username: Joi.string().optional(),
  password: Joi.string().optional(),
};

const pgValidation = (type: "old" | "new") =>
  Joi.object({
    ...pgValidator,
    ...(type === "old" ? { pg_id: validators.uuid.required() } : {}),
  })
    .unknown()
    .when(".pg_service", {
      is: PAYIN_SERVICE.PAYDUNIA,
      then: Joi.object(pgServiceValidator[PAYIN_SERVICE.PAYDUNIA]),
    });

export default { pgValidation, payinKeysValidator };
