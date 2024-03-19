import { Knex } from "knex";

const TABLE_NAME = "pg_transaction";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.uuid("pg_order_id").primary();
    table
      .uuid("transaction_id")
      .notNullable()
      .references("transaction_id")
      .inTable("withdraw")
      .onDelete("restrict")
      .comment("Payment Transaction ID");
    table.string("api_error").nullable().defaultTo(null).comment("api_error from payment gateway");
    table
      .uuid("pg_id")
      .notNullable()
      .references("pg_id")
      .inTable("payment_gateway")
      .onDelete("restrict")
      .comment("Payment Gateway used to proceed with transaction.");
    table.string("payment_status").notNullable().comment("status from payment gateway");
    table
      .integer("payment_fail_count")
      .nullable()
      .defaultTo(null)
      .comment("number of times transaction was retried on payment gateway");
    table
      .string("payment_req_method")
      .notNullable()
      .comment("method used for transaction on payment gateway. E.g., IMPS, NEFT, etc.");
    table
      .string("utr_id")
      .nullable()
      .defaultTo(null)
      .comment("received from payment gateway, for customer to check transaction in statements");
    table
      .string("payment_creation_date")
      .nullable()
      .defaultTo(null)
      .comment("date when transaction was created on payment gateway");
    table
      .string("payment_order_id")
      .nullable()
      .defaultTo(null)
      .comment("unique ID received from payment gateway, primary key on payment gateway");
    table.boolean("under_processing").defaultTo(false).comment("is payment in process on gateway");
    table.uuid("created_by").nullable().references("user_id").inTable("admin_user").onDelete("restrict");
    table.uuid("updated_by").nullable().references("user_id").inTable("admin_user").onDelete("restrict");
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
