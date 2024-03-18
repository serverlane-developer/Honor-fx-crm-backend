interface CustomerLoginLog {
  customer_login_log_id: string;
  customer_id: string;
  ip: string;
  login_device: string | null;
  attempt_type: "pin" | "otp";
  two_factor_authenticated: boolean;
  is_attempt_success: boolean;
  message: string;
  created_at: string;
  updated_at: string;
}

export default CustomerLoginLog;
