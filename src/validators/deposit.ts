import Joi from "joi";
import { Status } from "../@types/database/Withdraw";
import validators from "./common";

const status = Joi.string().valid(
  Status.PENDING,
  Status.SUCCESS,
  Status.FAILED,
  Status.PROCESSING,
  Status.REFUND,
  Status.ACKNOWLEDGED
);

const depositRequestFields = {
  customer_id: validators.uuid.required(),
  mt5_user_id: validators.uuid.required(),
  pg_id: validators.uuid.required(),
  amount: validators.number.min(1).max(100000).required(),
  ip: Joi.string().optional(),
};

const depositRequest = Joi.object(depositRequestFields);

export default {
  // newTransaction,
  // updateTransaction,
  // updateTransactionStatus,
  status,
  depositRequest,
};
