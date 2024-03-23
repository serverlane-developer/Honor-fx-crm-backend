import { Knex } from "knex";

const TABLE_NAME = "access_control";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.uuid("access_control_id").primary();
    table.uuid("role_id").notNullable().references("role_id").inTable("roles").onDelete("restrict");
    table.uuid("submodule_id").notNullable().references("submodule_id").inTable("submodules").onDelete("restrict");
    table.boolean("can_create").defaultTo(false);
    table.boolean("can_read").defaultTo(false);
    table.boolean("can_update").defaultTo(false);
    table.boolean("can_delete").defaultTo(false);
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
  await knex.schema.table(TABLE_NAME, function (table) {
    table.dropForeign("submodule_id");
    table.dropForeign("role_id");
    table.dropForeign("created_by");
    table.dropForeign("updated_by");
  });
  await knex.schema.dropTable(TABLE_NAME);
}
