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
// const mt5_status = Joi.string().valid(Status.PENDING, Status.FAILED, Status.SUCCESS);

const withdrawRequestFields = {
  customer_id: validators.uuid.required(),
  mt5_user_id: Joi.string().required(),
  payment_method_id: validators.uuid.required(),
  pg_id: validators.uuid.required(),
  amount: validators.number.min(1).max(100000).required(),
  ip: Joi.string().optional(),
};

const withdrawRequest = Joi.object(withdrawRequestFields);

// const internalFields = {
//   status: status.required(),
//   mt5_status: mt5_status.required(),
//   payout_status: status.required(),
//   admin_message: Joi.string().optional(),
//   payout_message: Joi.string().optional(),
//   mt5_message: Joi.string().optional(),
//   api_error: Joi.string().optional(),
//   payment_method_id: validators.uuid.required(),
//   customer_id: validators.uuid.required(),
//   updated_by: validators.uuid.required(),
// };

// const pgFields = {
//   pg_id: validators.uuid.required(),
//   payment_status: Joi.string().required(),
//   payment_fail_count: Joi.number().required(),
//   payment_req_method: validators.paymentReqMethod.required(),
//   utr_id: Joi.string().required(),
//   payment_creation_date: Joi.string().required(),
//   payment_order_id: Joi.string().optional(),
//   pg_task: validators.boolean.required(),
//   pg_order_id: validators.uuid.required(),
// };

// const newTransactionFields = {
//   ...internalFields,
//   // ...pgFields,
//   transaction_id: validators.uuid.required(),
//   is_deleted: validators.boolean.required(),
// };

// const newTransaction = Joi.object(newTransactionFields);

// const updateTransaction = Joi.object({ ...newTransactionFields, ...pgFields });

// const updateTransactionStatus = Joi.object()
//   .keys({
//     transaction_id: validators.uuid.required(),
//     status: Joi.string().valid(Status.FAILED, Status.SUCCESS).required(),
//   })
//   .when(".status", {
//     is: Joi.string().valid(Status.SUCCESS),
//     then: Joi.object({
//       utr_id: Joi.string().required(),
//     }),
//   })
//   .when(".status", {
//     is: Joi.string().valid(Status.FAILED),
//     then: Joi.object({
//       api_error: Joi.string().required(),
//     }),
//   });

export default {
  // newTransaction,
  // updateTransaction,
  // updateTransactionStatus,
  status,
  withdrawRequest,
};
