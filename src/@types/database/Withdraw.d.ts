const enum PaymentMethod {
  IMPS = "IMPS",
  NEFT = "NEFT",
}

type payment_req_method = keyof typeof PaymentMethod;

const enum Status {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
  PROCESSING = "processing",
  REFUND = "refund",
  ACKNOWLEDGED = "acknowledged",
}

type transaction_status = Status.PENDING | Status.SUCCESS | Status.FAILED | Status.PROCESSING | Status.ACKNOWLEDGED;
type mt5_status = Status.PENDING | Status.FAILED | Status.SUCCESS;

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
}

export { Status, transaction_status, PaymentMethod, payment_req_method };

export default Withdraw;
