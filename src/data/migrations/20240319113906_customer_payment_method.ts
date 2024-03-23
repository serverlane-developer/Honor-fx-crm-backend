import { Knex } from "knex";

const TABLE_NAME = "customer_payment_method";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.uuid("payment_method_id").primary();
    table.string("payment_method").notNullable();
    table.string("account_number").nullable().defaultTo(null);
    table.string("ifsc").nullable().defaultTo(null);
    table.string("bank_name").nullable().defaultTo(null);
    table.string("account_name").nullable().defaultTo(null);
    table.string("upi_id").nullable().defaultTo(null);
    table.string("description").nullable().defaultTo(null);
    table.uuid("customer_id").notNullable().references("customer_id").inTable("customer").onDelete("restrict");
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
