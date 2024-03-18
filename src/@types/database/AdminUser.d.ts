interface AdminUser {
  user_id: string;
  username: string;
  password: string;
  email: string;
  mobile?: string | null;
  last_login_ip: string | null;
  last_login_timestamp: string | null;
  is_2fa_enabled: boolean;
  password_changed_at?: string;
  role_id: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export default AdminUser;
