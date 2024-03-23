import Joi from "joi";
import { PaymentMethod } from "../@types/database/CustomerPaymentMethod";

const newPaymentMethod = Joi.object({
  payment_method: Joi.string().valid(PaymentMethod.BANK, PaymentMethod.UPI).required(),
  account_number: Joi.string().optional(),
  ifsc: Joi.string().optional(),
  bank_name: Joi.string().optional(),
  account_name: Joi.string().optional(),
  upi_id: Joi.string().optional().allow(""),
  description: Joi.string().optional().allow(""),
})
  .when(Joi.object({ payment_method: PaymentMethod.BANK }).unknown(), {
    then: Joi.object().append({
      account_number: Joi.string().required(),
      ifsc: Joi.string().required(),
      bank_name: Joi.string().required(),
      account_name: Joi.string().required(),
    }),
  })
  .when(Joi.object({ payment_method: PaymentMethod.UPI }).unknown(), {
    then: Joi.object().append({
      upi_id: Joi.string().required(),
      account_name: Joi.string().required(),
      account_number: Joi.forbidden(),
      ifsc: Joi.forbidden(),
      bank_name: Joi.forbidden(),
    }),
  });

export default { newPaymentMethod };
