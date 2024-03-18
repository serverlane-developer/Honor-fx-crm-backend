// SAMPLE MODULES SEED FILE
import { Knex } from "knex";

import { v4 as uuidv4 } from "uuid";

import * as submoduleRepo from "../../db_services/submodules_repo";
import * as accessControlRepo from "../../db_services/access_control_repo";

const table_name = "roles";

export async function seed(knex: Knex) {
  const role_id = uuidv4();
  const roleObj = { role_name: "Super Admin", role_id, is_deleted: false };
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

  await knex(table_name).del();
  await knex(table_name).insert(roleObj);
  await accessControlRepo.bulkInsertAccessControl(accessRights);
}
