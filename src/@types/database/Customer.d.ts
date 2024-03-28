interface Customer {
  customer_id: string;

  // profile
  username: string;
  email: string | null;
  phone_number: string;
  is_image_uploaded: boolean;

  // login
  pin: string;
  is_pin_reset_required: boolean;
  pin_changed_at: string;

  // 2fa
  is_2fa_enabled: boolean;
  two_factor_toggled_at: string;

  // login history
  last_login_ip: string | null;
  last_login_at: string | null;

  // history
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  referral_id: string | null;
}

export type CustomerTransactions = {
  transaction_id: string;
  amount: string;
  created_at: string;
  updated_at: string;
  status: string;
  transaction_type: "withdraw" | "deposit";
};

export default Customer;
