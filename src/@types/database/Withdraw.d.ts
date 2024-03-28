import { Status, mt5_status, transaction_status } from "../Common";
import { payment_method } from "./CustomerPaymentMethod";

const enum PaymentMethod {
  IMPS = "IMPS",
  NEFT = "NEFT",
}

type payment_req_method = keyof typeof PaymentMethod;

interface Withdraw {
  transaction_id: string;
  amount: string;
  transaction_type: "normal";

  // fields to track transaction
  status: transaction_status;
  mt5_status: mt5_status;
  payout_status: transaction_status;

  admin_message: string | null;
  mt5_message: string | null;
  payout_message: string | null;
  api_error: string | null;

  ip: string | null;
  payment_method_id: string;
  customer_id: string;
  mt5_user_id: string;

  dealid: string;
  margin: string;
  freemargin: string;
  equity: string;

  refund_transaction_id: string;
  is_receipt_uploaded: boolean;

  updated_by: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;

  // fields related to payout and pg
  pg_id: string | null;
  payment_status: string | null;
  payment_fail_count: number;
  payment_req_method: payment_req_method | null;
  utr_id: string | null;
  payment_creation_date: string | null;
  payment_order_id: string | null;
  pg_task: boolean;
  pg_order_id: string | null;

  // customer's payment info
  payment_method: payment_method;
  account_number: string;
  ifsc: string;
  bank_name: string;
  account_name: string;
  upi_id: string;
}

export interface WithdrawList extends Withdraw {
  username: string;
  phoner_number: string;
  updated_by: string;

  bank_name: string;
  account_name: string;
  account_number: string;
  ifsc: string;
  upi_id: string;

  pg_order_id: string;
  payment_status: string;
  payment_fail_count: string;
  payment_req_method: string;
  utr_id: string;
  payment_creation_date: string;
  payment_order_id: string;
  pg_label: string;
  nickname: string;
}

export { Status, transaction_status, PaymentMethod, payment_req_method };

export default Withdraw;
