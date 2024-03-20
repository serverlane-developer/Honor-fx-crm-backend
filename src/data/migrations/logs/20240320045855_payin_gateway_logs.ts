import { Knex } from "knex";

const TABLE_NAME = "payin_gateway_logs";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.string("pg_id");
    table.string("pg_service");
    table.string("pg_label");
    table.string("nickname");

    table.string("base_url");
    table.string("base_url_alt");
    table.string("merchant_id");
    table.string("secret_key");
    table.string("client_id");
    table.string("description");

    table.string("created_by");
    table.string("updated_by");
    table.string("created_at");
    table.string("updated_at");
    table.boolean("is_deleted").defaultTo(false);
    table.timestamp("created_on").defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(TABLE_NAME);
}
