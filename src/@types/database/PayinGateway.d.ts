import { PAYIN } from "../Payin";

interface PayoutGateway {
  pg_id: string;
  pg_label: string;
  pg_service: PAYIN;
  nickname: string;

  base_url: string | null;
  base_url_alt: string | null;
  merchant_id: string | null;
  secret_key: string | null;
  client_id: string | null;
  description: string | null;

  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export default PayoutGateway;
