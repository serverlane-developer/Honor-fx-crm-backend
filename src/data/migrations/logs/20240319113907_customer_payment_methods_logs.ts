import { Knex } from "knex";

const TABLE_NAME = "customer_payment_method_logs";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.string("payment_method_id");
    table.string("payment_method");
    table.string("account_number").nullable().defaultTo(null);
    table.string("ifsc").nullable().defaultTo(null);
    table.string("bank_name").nullable().defaultTo(null);
    table.string("account_name").nullable().defaultTo(null);
    table.string("upi_id").nullable().defaultTo(null);
    table.string("description").nullable().defaultTo(null);
    table.string("user_id");
    table.string("created_at");
    table.string("updated_at");
    table.timestamp("created_on").defaultTo(knex.fn.now());
    table.boolean("is_deleted").defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(TABLE_NAME);
}
