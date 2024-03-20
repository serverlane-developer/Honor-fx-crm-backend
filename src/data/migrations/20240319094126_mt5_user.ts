import { Knex } from "knex";

const TABLE_NAME = "mt5_user";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.uuid("mt5_user_id").primary();

    // profile related
    table.string("email").nullable();
    table.string("phone_number").nullable();
    table.string("client_name").notNullable();

    table.string("mt5_id").notNullable();
    table.string("master_password").nullable();
    table.string("investor_password").nullable();
    table.string("leverage").nullable();
    table.string("mt_group").nullable();
    table.string("country").nullable();

    // history
    table.uuid("customer_id").notNullable().references("customer_id").inTable("customer").onDelete("restrict");
    table.uuid("updated_by").nullable().references("user_id").inTable("admin_user").onDelete("restrict");
    table.timestamps(false, true);
    table.boolean("is_deleted").defaultTo(false);
  });

  // trigger to update updated_at timestamp
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
