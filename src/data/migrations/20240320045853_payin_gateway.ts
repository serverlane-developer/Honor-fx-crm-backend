import { Knex } from "knex";

const TABLE_NAME = "payin_gateway";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.uuid("pg_id").primary();
    table.string("pg_label").notNullable().comment("Payment Gateway name to show on Transaction Receipt");
    table.string("nickname").notNullable().comment("Payment Gateway name for internal dashboard reference");
    table.string("pg_service").notNullable().comment("Gateway API shortname in codebase");

    // api related
    table.string("base_url").notNullable();
    table.string("base_url_alt").nullable().comment("in case a payment gateway has another baseurl for an endpoint");
    table.string("merchant_id").nullable();
    table.string("secret_key").nullable();
    table.string("client_id").nullable();
    table.string("description").nullable().comment("For Internal admin reference");

    table.string("username").nullable();
    table.string("password").nullable();

    table.uuid("created_by").notNullable().references("user_id").inTable("admin_user").onDelete("restrict");
    table.uuid("updated_by").notNullable().references("user_id").inTable("admin_user").onDelete("restrict");

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
    table.dropForeign("created_by");
    table.dropForeign("updated_by");
  });
  await knex.schema.dropTable(TABLE_NAME);
}
