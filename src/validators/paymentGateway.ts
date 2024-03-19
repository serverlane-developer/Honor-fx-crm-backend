import Joi from "joi";
import { PAYOUT_SERVICE } from "../@types/Payout";
import validators from "./common";

const payoutKeysValidator = {
  [PAYOUT_SERVICE.CASHFREE]: {
    CASHFREE_BASE_URL: Joi.string().uri().required(),
    CASHFREE_CLIENT_ID: Joi.string().required(),
    CASHFREE_CLIENT_SECRET: Joi.string().required(),
  },
  [PAYOUT_SERVICE.QIKPAY]: {
    QIKPAY_BASE_URL: Joi.string().uri().required(),
    QIKPAY_TOKEN: Joi.string().required(),
    QIKPAY_HKEY: Joi.string().required(),
  },
  [PAYOUT_SERVICE.EASYPAYMENTZ]: {
    EASYPAYMENTZ_BASE_URL: Joi.string().uri().required(),
    EASYPAYMENTZ_MERCHANT_ID: Joi.string().required(),
    EASYPAYMENTZ_SECRET: Joi.string().required(),
  },
  [PAYOUT_SERVICE.ISERVEU]: {
    ISERVEU_BASE_URL: Joi.string().uri().required(),
    ISERVEU_STATUS_URL: Joi.string().required(),
    ISERVEU_CLIENT_ID: Joi.string().required(),
    ISERVEU_CLIENT_SECRET: Joi.string().required(),
  },
  [PAYOUT_SERVICE.PAYCOONS]: {
    PAYCOONS_BASE_URL: Joi.string().uri().required(),
    PAYCOONS_CLIENT_ID: Joi.string().required(),
    PAYCOONS_CLIENT_SECRET_KEY: Joi.string().required(),
    PAYCOONS_MERCHANT_ID: Joi.string().required(),
  },
  [PAYOUT_SERVICE.ZAPAY]: {
    ZAPAY_BASE_URL: Joi.string().uri().required(),
    ZAPAY_MERCHANT_ID: Joi.string().required(),
    ZAPAY_SECRET_KEY: Joi.string().required(),
  },
  [PAYOUT_SERVICE.ISMARTPAY]: {
    ISMARTPAY_BASE_URL: Joi.string().uri().required(),
    ISMARTPAY_MERCHANT_ID: Joi.string().required(),
    ISMARTPAY_API_KEY: Joi.string().required(),
    ISMARTPAY_WALLET_ID: Joi.string().required(),
  },
  [PAYOUT_SERVICE.PAYANYTIME]: {
    PAYANYTIME_BASE_URL: Joi.string().uri().required(),
    PAYANYTIME_EMAIL: Joi.string().required(),
    PAYANYTIME_PASSWORD: Joi.string().required(),
  },
  [PAYOUT_SERVICE.FINIXPAY]: {
    FINIXPAY_BASE_URL: Joi.string().uri().required(),
    FINIXPAY_CLIENT_ID: Joi.string().required(),
    FINIXPAY_CLIENT_SECRET_KEY: Joi.string().required(),
    FINIXPAY_MERCHANT_ID: Joi.string().required(),
  },
};

const pgServiceValidator = {
  [PAYOUT_SERVICE.CASHFREE]: {
    client_id: Joi.string().required(),
    secret_key: Joi.string().required(),
  },
  [PAYOUT_SERVICE.QIKPAY]: {
    merchant_id: Joi.string().required(),
    secret_key: Joi.string().required(),
  },
  [PAYOUT_SERVICE.EASYPAYMENTZ]: {
    merchant_id: Joi.string().required(),
    secret_key: Joi.string().required(),
  },
  [PAYOUT_SERVICE.ISERVEU]: {
    base_url_alt: Joi.string().required(),
    client_id: Joi.string().required(),
    secret_key: Joi.string().required(),
  },
  [PAYOUT_SERVICE.PAYCOONS]: {
    client_id: Joi.string().required(),
    secret_key: Joi.string().required(),
    merchant_id: Joi.string().required(),
  },
  [PAYOUT_SERVICE.ZAPAY]: {
    merchant_id: Joi.string().required(),
    secret_key: Joi.string().required(),
  },
  [PAYOUT_SERVICE.ISMARTPAY]: {
    merchant_id: Joi.string().required(),
    secret_key: Joi.string().required(),
    client_id: Joi.string().required(),
  },
  [PAYOUT_SERVICE.PAYANYTIME]: {
    merchant_id: Joi.string().required(),
    secret_key: Joi.string().required(),
  },
  [PAYOUT_SERVICE.FINIXPAY]: {
    client_id: Joi.string().required(),
    secret_key: Joi.string().required(),
    merchant_id: Joi.string().required(),
  },
};

const pgValidator = {
  pg_label: Joi.string().required(),
  nickname: Joi.string().required(),
  pg_service: Joi.string()
    .valid(
      PAYOUT_SERVICE.CASHFREE,
      PAYOUT_SERVICE.EASYPAYMENTZ,
      PAYOUT_SERVICE.ISERVEU,
      PAYOUT_SERVICE.ISMARTPAY,
      PAYOUT_SERVICE.PAYCOONS,
      PAYOUT_SERVICE.QIKPAY,
      PAYOUT_SERVICE.ZAPAY,
      PAYOUT_SERVICE.PAYANYTIME,
      PAYOUT_SERVICE.FINIXPAY
    )
    .required(),

  base_url: Joi.string().uri().required(),
  base_url_alt: Joi.string().uri().optional(),
  merchant_id: Joi.string().optional(),
  secret_key: Joi.string().optional(),
  client_id: Joi.string().optional(),
  description: Joi.string().optional(),

  threshold_limit: validators.amount.required(),
  imps_enabled: validators.boolean.optional(),
  imps_min: validators.amount.optional(),
  imps_max: validators.amount.optional(),
  neft_enabled: validators.boolean.optional(),
  neft_min: validators.amount.optional(),
  neft_max: validators.amount.optional(),
  rtgs_enabled: validators.boolean.optional(),
  rtgs_min: validators.amount.optional(),
  rtgs_max: validators.amount.optional(),
};

// const newPgValidation = Joi.object({ ...pgValidation, pg_id: validators.uuid.required() });

// const updatedPgValidation = Joi.object({
//   ...pgValidation,
//   pg_id: validators.uuid.required(),
// });

const pgValidation = (type: "old" | "new") =>
  Joi.object({
    ...pgValidator,
    ...(type === "old" ? { pg_id: validators.uuid.required() } : {}),
  })
    .unknown()
    .when(".pg_service", {
      is: PAYOUT_SERVICE.CASHFREE,
      then: Joi.object(pgServiceValidator[PAYOUT_SERVICE.CASHFREE]),
    })
    .when(".pg_service", {
      is: PAYOUT_SERVICE.EASYPAYMENTZ,
      then: Joi.object(pgServiceValidator[PAYOUT_SERVICE.EASYPAYMENTZ]),
    })
    .when(".pg_service", {
      is: PAYOUT_SERVICE.ISERVEU,
      then: Joi.object(pgServiceValidator[PAYOUT_SERVICE.ISERVEU]),
    })
    .when(".pg_service", {
      is: PAYOUT_SERVICE.ISMARTPAY,
      then: Joi.object(pgServiceValidator[PAYOUT_SERVICE.ISMARTPAY]),
    })
    .when(".pg_service", {
      is: PAYOUT_SERVICE.PAYCOONS,
      then: Joi.object(pgServiceValidator[PAYOUT_SERVICE.PAYCOONS]),
    })
    .when(".pg_service", {
      is: PAYOUT_SERVICE.QIKPAY,
      then: Joi.object(pgServiceValidator[PAYOUT_SERVICE.QIKPAY]),
    })
    .when(".pg_service", {
      is: PAYOUT_SERVICE.ZAPAY,
      then: Joi.object(pgServiceValidator[PAYOUT_SERVICE.ZAPAY]),
    })
    .when(".pg_service", {
      is: PAYOUT_SERVICE.PAYANYTIME,
      then: Joi.object(pgServiceValidator[PAYOUT_SERVICE.PAYANYTIME]),
    })
    .when(".pg_service", {
      is: PAYOUT_SERVICE.FINIXPAY,
      then: Joi.object(pgServiceValidator[PAYOUT_SERVICE.FINIXPAY]),
    });

export default { pgValidation, payoutKeysValidator };
