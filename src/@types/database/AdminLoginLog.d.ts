interface AdminLoginLog {
  admin_login_log_id: string;
  user_id: string;
  ip: string;
  login_device: string | null;
  attempt_type: "password" | "otp";
  two_factor_authenticated: boolean;
  attempt_success: boolean;
  attempt_status_char: string;
  created_at: string;
  updated_at: string;
}

export default AdminLoginLog;
