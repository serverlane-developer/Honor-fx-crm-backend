// SAMPLE MODULES SEED FILE
import { Knex } from "knex";

import { v4 as uuidv4 } from "uuid";

import * as moduleRepo from "../../db_services/modules_repo";
import * as submoduleRepo from "../../db_services/submodules_repo";
import * as accessControlRepo from "../../db_services/access_control_repo";

const table_name = "roles";

const getRoleObj = (role_name: string, created_by?: string) => ({
  role_name,
  role_id: uuidv4(),
  is_deleted: false,
  ...(created_by && { created_by }),
});

const getSuperAdminAccessRights = async (role_id: string) => {
  const accessRights = [];
  const submodules = await submoduleRepo.getSubmodulesByFilter({});

  for (let i = 0; i < submodules.length; i += 1) {
    const { submodule_id } = submodules[i];
    const accessRight = {
      access_control_id: uuidv4(),
      role_id,
      submodule_id,
      can_create: true,
      can_read: true,
      can_update: true,
      can_delete: true,
    };
    accessRights.push(accessRight);
  }
  return accessRights;
};

const getTelecallerAccessRights = async (role_id: string) => {
  const referralModule = await moduleRepo.getModuleByFilter({ module_name: "referral" });
  if (!referralModule) return [];
  const referralSubmodule = await submoduleRepo.getSubmoduleByFilter({ module_id: referralModule.module_id });
  if (!referralModule) return [];
  const accessRight = {
    access_control_id: uuidv4(),
    role_id,
    submodule_id: referralSubmodule?.submodule_id,
    can_create: true,
    can_read: true,
    can_update: true,
    can_delete: true,
  };
  return [accessRight];
};

export async function seed(knex: Knex) {
  const superAdminRole = getRoleObj("Super Admin");
  const superAdminAccessRights = await getSuperAdminAccessRights(superAdminRole.role_id);

  const telecallerRole = getRoleObj("Telecaller", superAdminRole.role_id);
  const telecalletAccessRight = await getTelecallerAccessRights(telecallerRole.role_id);

  await knex(table_name).del();
  await knex(table_name).insert(superAdminRole);
  await knex(table_name).insert(telecallerRole);
  await accessControlRepo.bulkInsertAccessControl([...superAdminAccessRights, ...telecalletAccessRight]);
}
