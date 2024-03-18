import { Knex } from "knex";

const TABLE_NAME = "customer_login_log";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.uuid("customer_login_log_id").primary();
    table.uuid("customer").notNullable().references("customer_id").inTable("customer").onDelete("restrict");
    table.string("ip").notNullable();
    table.string("login_device").nullable();
    table.boolean("two_factor_authenticated").defaultTo(false);
    table.enum("attempt_type", ["pin", "otp"]).notNullable();
    table.boolean("is_attempt_success").defaultTo(false);
    table.string("message").defaultTo("");
    table.timestamps(false, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(TABLE_NAME);
}
