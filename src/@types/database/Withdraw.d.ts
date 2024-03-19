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

interface Withdraw {
  transaction_id: string;
  amount: string;

  // fields to track transaction
  status: transaction_status;
  message: string | null;
  api_error: string | null;
  ip: string | null;
  is_receipt_uploaded: boolean;
  created_by: string;
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

  // customer related
  customer_id: string;
  customer_account_id: string;
}

export { payment_req_method, Status, PaymentMethod, transaction_status };

export default Withdraw;
