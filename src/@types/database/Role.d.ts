interface Role {
  role_id: string;
  role_name: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export default Role;
