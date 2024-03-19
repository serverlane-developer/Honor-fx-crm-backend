import { PAYOUT } from "../Payout";

interface PaymentGateway {
  pg_id: string;
  pg_label: string;
  pg_service: PAYOUT;
  nickname: string;

  base_url: string | null;
  base_url_alt: string | null;
  merchant_id: string | null;
  secret_key: string | null;
  client_id: string | null;
  description: string | null;

  threshold_limit: string | null;
  imps_enabled: boolean;
  imps_min: string | null;
  imps_max: string | null;
  neft_enabled: boolean;
  neft_min: string | null;
  neft_max: string | null;
  rtgs_enabled: boolean;
  rtgs_min: string | null;
  rtgs_max: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export default PaymentGateway;
