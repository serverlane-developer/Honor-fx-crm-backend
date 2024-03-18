interface Module {
  module_id: string;
  module_name: string;
  created_by: string | null;
  updated_by: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export default Module;
