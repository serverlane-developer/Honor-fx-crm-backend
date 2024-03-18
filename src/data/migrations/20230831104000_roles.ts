import { Knex } from "knex";

const TABLE_NAME = "roles";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.uuid("role_id").primary();
    table.string("role_name");
    table.uuid("created_by").nullable();
    table.uuid("updated_by").nullable();
    table.timestamps(false, true);
    table.boolean("is_deleted").defaultTo(false);
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
