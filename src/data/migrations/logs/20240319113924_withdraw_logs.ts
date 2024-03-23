import { Knex } from "knex";

const TABLE_NAME = "withdraw_logs";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.string("transaction_id");
    table.string("amount");
    table.string("transaction_type");
    table.string("status");
    table.string("mt5_status");
    table.string("payout_status");
    table.string("admin_message");
    table.string("mt5_message");
    table.string("payout_message");
    table.string("api_error");
    table.string("ip");
    table.string("payment_method_id");
    table.string("customer_id");
    table.string("mt5_user_id");

    table.string("dealid");
    table.string("margin");
    table.string("freemargin");
    table.string("equity");

    table.string("updated_by");
    table.string("pg_id");
    table.string("payment_status");
    table.integer("payment_fail_count");
    table.string("payment_req_method");
    table.string("utr_id");
    table.string("payment_creation_date");
    table.string("payment_order_id");
    table.boolean("pg_task");
    table.string("pg_order_id");
    table.string("created_at");
    table.string("updated_at");
    table.boolean("is_deleted").defaultTo(false);
    table.timestamp("created_on").defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(TABLE_NAME);
}
