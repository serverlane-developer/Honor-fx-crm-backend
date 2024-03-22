import { Status, mt5_status, transaction_status } from "../Common";

interface Deposit {
  transaction_id: string;
  amount: string;
  transaction_type: "normal";

  // fields to track transaction
  status: transaction_status;
  mt5_status: mt5_status;
  payin_status: transaction_status;

  admin_message: string | null;
  mt5_message: string | null;
  payin_message: string | null;
  api_error: string | null;

  ip: string | null;
  customer_id: string;
  mt5_user_id: string;

  updated_by: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;

  // fields related to payout and pg
  pg_id: string | null;
  utr_id: string | null;
  payment_status: string | null;
  payment_order_id: string | null;
  pg_order_id: string | null;
  dealid: string | null;
  margin: string | null;
  freemargin: string | null;
  equity: string | null;
}

export { Status, transaction_status };

export default Deposit;
