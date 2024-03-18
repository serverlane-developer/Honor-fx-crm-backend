interface Submodule {
  submodule_id: string;
  submodule_name: string;
  module_id: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export default Submodule;
