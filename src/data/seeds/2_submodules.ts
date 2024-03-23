// SAMPLE MODULES SEED FILE
import { Knex } from "knex";

import { v4 as uuidv4 } from "uuid";

import * as moduleRepo from "../../db_services/modules_repo";

const table_name = "submodules";

interface Modules {
  modules: string[];
  roles: string[];
  admin: string[];
  "payment gateway": string[];
  transaction: string[];
  customer: string[];
}

const modules: Modules = {
  modules: ["module", "submodule"],
  roles: ["role"],
  admin: ["user"],
  "payment gateway": ["payout", "payin"],
  transaction: ["withdraw", "deposit"],
  customer: ["list"],
};

const moduleKeys = Object.keys(modules);

export async function seed(knex: Knex) {
  const submodulesSeedArr = [];

  for (let i = 0; i < moduleKeys.length; i += 1) {
    const module_name = moduleKeys[i] as keyof Modules;
    const moduleData = await moduleRepo.getModuleByFilter({ module_name });
    const submodules = modules[module_name];

    if (submodules && moduleData) {
      for (let j = 0; j < submodules.length; j += 1) {
        const submodule_name = submodules[j];
        const submoduleObj = {
          submodule_name,
          module_id: moduleData.module_id,
          submodule_id: uuidv4(),
        };
        submodulesSeedArr.push(submoduleObj);
      }
    }
  }

  await knex(table_name).del();
  await knex(table_name).insert(submodulesSeedArr);
}
