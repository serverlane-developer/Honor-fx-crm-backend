export type otp_type = "admin_login" | "toggle_2fa";

export interface OtpObject {
  token: string;
  created_at: string;
  resend?: boolean;
}

export interface EmailObject {
  to: string;
  subject: string;
  body: string;
  requestId: string | undefined;
}
