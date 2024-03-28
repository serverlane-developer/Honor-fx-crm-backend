interface Referral {
  referral_id: string;
  referral_code: string;
  user_id: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export default Referral;
