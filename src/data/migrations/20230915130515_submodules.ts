import { Knex } from "knex";

const TABLE_NAME = "submodules";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.uuid("submodule_id").primary();
    table.string("submodule_name");
    table.uuid("module_id").notNullable().references("module_id").inTable("modules").onDelete("restrict");
    table.uuid("created_by").nullable().references("user_id").inTable("admin_user").onDelete("restrict");
    table.uuid("updated_by").nullable().references("user_id").inTable("admin_user").onDelete("restrict");
    table.boolean("is_deleted").defaultTo(false);
    table.timestamps(false, true);
  });
  await knex.raw(`
  CREATE TRIGGER update_timestamp
  BEFORE UPDATE
  ON ${TABLE_NAME}
  FOR EACH ROW
  EXECUTE PROCEDURE update_timestamp();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(TABLE_NAME);
}
