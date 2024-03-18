import dotenv from "dotenv";
import joi from "joi";

import validators from "../validators/common";
import { LogLevel } from "../@types/Logger";

dotenv.config();
dotenv.config({ path: "../.env" }); // required to migrate | gives error on nodemon

const envVarsSchema = joi
  .object()
  .keys({
    NODE_ENV: joi.string().valid("production", "development", "staging").required(),
    PORT: joi.number().positive().required(),

    LOG_LEVEL: joi.string().valid("http", "debug", "silly", "info", "warn", "error").required(),
    LOG_TO_FILE: joi.string().optional().allow(null, "").description("Should be 'true' to create local log files"),
    LOG_FORMAT: joi.string().valid("JSON", "PRETTY_PRINT").required(),
    LOG_SENSITIVE_DATA: joi.string().valid("true", "", null, "false").optional(),

    DB_DATABASE: joi.string().required(),
    DB_USER: joi.string().required(),
    DB_PASSWORD: joi.string().required(),
    DB_READER_HOST: joi.string().required(),
    DB_WRITER_HOST: joi.string().required(),
    DB_PORT: joi.number().positive().required(),

    JWT_SECRET: joi.string().required(),
    JWT_EXPIRY: joi.number().positive().required(),

    SEED_ADMIN_USERNAME: joi.string().optional(),
    SEED_ADMIN_PASSWORD: joi.string().optional(),
    SEED_ADMIN_EMAIL: joi.string().optional(),

    BASE_URL: joi.string().uri().required(),
    BACKOFFICE_BASE_URL: joi.string().uri().required(),

    OTP_VERIFICATION_LOCK_MINUTES: joi.number().positive().optional().allow(""),
    OTP_EXPIRY_MINUTES: joi.number().positive().optional().allow(""),
    SEND_EMAIL: joi.string().valid("true").optional().allow(""),
    LOG_OTP: joi.string().optional().allow(""),
    DEV_OTP: validators.otp.optional().allow(""),
    STATIC_OTP: validators.otp.optional().allow(""),

    AWS_REGION: validators.awsRegion.optional().allow(""),
    SES_FROM_EMAIL: validators.email.optional().allow(""),
    // BUCKET_NAME: joi.string().required(),

    ENCRYPTION_KEY: joi.string().required(),
    ENCRYPTION_IV: joi.string().required(),

    TIMEZONE: joi.string().default("Asia/Kolkata").optional(),
  })
  .unknown()
  .when(joi.object({ NODE_ENV: "production" }).unknown(), {
    then: joi.object().append({
      SEND_ADMIN_OTP: joi.string().valid("true").required(),
      SES_FROM_EMAIL: validators.email.required(),
    }),
  });

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: "key" } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const EMAIL_WITH_STATIC_OTP: Array<string> = (process.env.EMAIL_WITH_STATIC_OTP || "")
  .split(",")
  .map((x) => x.trim())
  .filter((x) => x);

if (EMAIL_WITH_STATIC_OTP.length > 0) {
  const emailValidation = joi.array().items(validators.email.required()).optional().validate(EMAIL_WITH_STATIC_OTP);
  if (emailValidation.error) {
    throw new Error(`Config validation error: ${emailValidation.error.message}`);
  }
}

const config = {
  NODE_ENV: envVars.NODE_ENV as string,
  PORT: envVars.PORT as number,

  // logger
  LOG_LEVEL: envVars.LOG_LEVEL as LogLevel,
  LOG_TO_FILE: envVars.LOG_TO_FILE === "true",
  LOG_FORMAT: envVars.LOG_FORMAT as string,
  LOG_SENSITIVE_DATA: envVars.LOG_SENSITIVE_DATA === "true",

  // db
  DB_DATABASE: envVars.DB_DATABASE as string,
  DB_USER: envVars.DB_USER as string,
  DB_PASSWORD: envVars.DB_PASSWORD as string,
  DB_READER_HOST: envVars.DB_READER_HOST as string,
  DB_WRITER_HOST: envVars.DB_WRITER_HOST as string,
  DB_PORT: envVars.DB_PORT as number,

  // JWT
  JWT_SECRET: envVars.JWT_SECRET as string,
  JWT_EXPIRY: envVars.JWT_EXPIRY as string,

  // SEED
  SEED_ADMIN_USERNAME: (envVars.SEED_ADMIN_USERNAME || "admin") as string,
  SEED_ADMIN_PASSWORD: (envVars.SEED_ADMIN_PASSWORD || "Abcd@1234") as string,
  SEED_ADMIN_EMAIL: (envVars.SEED_ADMIN_EMAIL || "abc@email.com") as string,

  // URL
  BASE_URL: envVars.BASE_URL as string,
  BACKOFFICE_BASE_URL: envVars.BACKOFFICE_BASE_URL as string,

  // OTP
  OTP_VERIFICATION_LOCK_MINUTES: Number(envVars.OTP_VERIFICATION_LOCK_MINUTES || 0) || 5,
  OTP_EXPIRY_MINUTES: Number(envVars.OTP_EXPIRY_MINUTES || 0) || 5,
  SEND_EMAIL: envVars.SEND_EMAIL === "true",
  LOG_OTP: envVars.LOG_OTP === "true",
  DEV_OTP: (envVars.DEV_OTP || "123456") as string | undefined,
  STATIC_OTP: (envVars.STATIC_OTP || "654321") as string | undefined,
  EMAIL_WITH_STATIC_OTP,

  // AWS
  AWS_REGION: envVars.AWS_REGION as string,
  SES_FROM_EMAIL: envVars.SES_FROM_EMAIL as string | undefined,
  BUCKET_NAME: envVars.BUCKET_NAME as string,

  // Encryption
  ENCRYPTION_KEY: envVars.ENCRYPTION_KEY as string,
  ENCRYPTION_IV: envVars.ENCRYPTION_IV as string,

  // TIMEZONE
  TIMEZONE: envVars.TIMEZONE,
};

export default config;
