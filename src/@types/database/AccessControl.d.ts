interface AccessControl {
  access_control_id: string;
  role_id: string;
  submodule_id: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export default AccessControl;
