import { Knex } from "knex";

const TABLE_NAME = "deposit";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.uuid("transaction_id").primary();

    table.string("amount").notNullable();
    table.string("transaction_type").notNullable().defaultTo("normal"); // in case different Transaction Types are to be added later

    // fields to track transaction
    table.string("status").notNullable().comment("General Payment Status");
    table.string("mt5_status").notNullable().comment("MT5 Payment Status");
    table.string("payin_status").notNullable().comment("Payout Payment Status");
    table.string("admin_message").nullable().defaultTo(null);
    table.string("mt5_message").nullable().defaultTo(null);
    table.string("payin_message").nullable().defaultTo(null);
    table.string("api_error").nullable().defaultTo(null).comment("Error Messages from PAYIN API");
    table.string("ip").nullable().defaultTo(null).comment("User's IP when transaction was created");

    table
      .uuid("customer_id")
      .notNullable()
      .references("customer_id")
      .inTable("customer")
      .onDelete("restrict")
      .comment("Created By User");
    table
      .uuid("updated_by")
      .notNullable()
      .references("user_id")
      .inTable("admin_user")
      .onDelete("restrict")
      .comment("Updated By User");
    table.timestamps(false, true);
    table.boolean("is_deleted").defaultTo(false);

    // fields related to payin and pg
    table
      .uuid("pg_id")
      .nullable()
      .defaultTo(null)
      .references("pg_id")
      .inTable("payin_gateway")
      .onDelete("restrict")
      .comment("Payment Gateway used to proceed with transaction.");
    table.string("payment_status").nullable().defaultTo(null).comment("status from payment gateway");
    table
      .string("utr_id")
      .nullable()
      .defaultTo(null)
      .comment("received from payment gateway, for customer to check transaction in statements");
    table
      .string("payment_order_id")
      .nullable()
      .defaultTo(null)
      .comment("unique ID received from payment gateway, primary key on payment gateway");
    table
      .string("pg_order_id")
      .nullable()
      .defaultTo(null)
      .comment("uuid created to check transaction status on payment gateway.");

    // MT5 related fields
    table.string("dealid").nullable();
    table.string("margin").nullable();
    table.string("freemargin").nullable();
    table.string("equity").nullable();
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
    table.dropForeign("customer_id");
    table.dropForeign("updated_by");
    table.dropForeign("pg_id");
  });
  await knex.schema.dropTable(TABLE_NAME);
}
