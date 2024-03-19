import { payment_req_method } from "./Withdraw";

interface PgTransaction {
  pg_order_id: string;
  transaction_id: string;
  api_error: string | null;
  pg_id: string;
  payment_status: string;
  payment_fail_count: number;
  payment_req_method: payment_req_method;
  utr_id: string | null;
  payment_creation_date: string | null;
  payment_order_id: string | null;
  under_processing: boolean;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;

  latest_status: string;
  latest_message: string;
}

export default PgTransaction;
