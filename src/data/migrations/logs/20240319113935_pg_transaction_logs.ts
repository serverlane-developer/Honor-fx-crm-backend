import { Knex } from "knex";

const TABLE_NAME = "pg_transaction_logs";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.string("pg_order_id");
    table.string("transaction_id");
    table.string("api_error");
    table.string("pg_id");
    table.string("payment_status");
    table.integer("payment_fail_count");
    table.string("payment_req_method");
    table.string("utr_id");
    table.string("payment_creation_date");
    table.string("payment_order_id");
    table.boolean("under_processing");
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
