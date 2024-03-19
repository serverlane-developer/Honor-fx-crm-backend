export const enum PaymentMethod {
  BANK = "bank",
  UPI = "upi",
}

export type payment_method = keyof typeof PaymentMethod;

export default interface CustomerPaymentMethod {
  payment_method_id: string;
  payment_method: payment_method;
  account_number: string;
  ifsc: string;
  bank_name: string;
  account_name: string;
  upi_id: string;
  description: string;
  customer_id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}
