// SAMPLE MODULES SEED FILE
import { Knex } from "knex";

import { v4 as uuidv4 } from "uuid";

const table_name = "modules";

export async function seed(knex: Knex) {
  const modulesNames = ["modules", "roles", "admin", "payment gateway", "transaction", "customer"];

  const modules = modulesNames.map((module: string) => ({
    module_id: uuidv4(),
    module_name: module,
    is_deleted: false,
  }));

  await knex(table_name).del();
  await knex(table_name).insert(modules);
}
