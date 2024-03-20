import { Knex } from "knex";

const TABLE_NAME = "deposit_logs";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.string("transaction_id");
    table.string("amount");
    table.string("transaction_type");
    table.string("status");
    table.string("mt5_status");
    table.string("payin_status");
    table.string("admin_message");
    table.string("mt5_message");
    table.string("payin_message");
    table.string("api_error");
    table.string("ip");
    table.string("customer_id");
    table.string("updated_by");
    table.string("pg_id");
    table.string("payment_status");
    table.string("utr_id");
    table.string("payment_order_id");
    table.string("pg_order_id");

    table.string("dealid");
    table.string("margin");
    table.string("freemargin");
    table.string("equity");

    table.string("created_at");
    table.string("updated_at");
    table.boolean("is_deleted").defaultTo(false);
    table.timestamp("created_on").defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(TABLE_NAME);
}
