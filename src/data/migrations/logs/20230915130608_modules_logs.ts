import { Knex } from "knex";

const TABLE_NAME = "modules_logs";

export async function up(knex: Knex): Promise<void> {
  return await knex.schema.createTable(TABLE_NAME, (table) => {
    table.string("module_id");
    table.string("module_name");
    table.string("created_at");
    table.string("updated_at");
    table.boolean("is_deleted").defaultTo(false);
    table.string("created_by");
    table.string("updated_by");
    table.timestamp("created_on").defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(TABLE_NAME);
}
