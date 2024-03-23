import { Status } from "../Common";

interface Mt5User {
  mt5_user_id: string;
  status: Status.PENDING | Status.FAILED | Status.SUCCESS;
  // profile
  client_name: string;
  email: string | null;
  phone_number: string | null;

  mt5_id: string;
  master_password: string;
  investor_password: string;
  leverage: string;
  mt_group: string;
  country: string;
  mt5_ip: string;
  customer_id: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export default Mt5User;
