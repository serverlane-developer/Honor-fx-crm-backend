import { Knex } from "knex";

const TABLE_NAME = "admin_login_log";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.uuid("admin_login_log_id").primary();
    table.uuid("user_id").notNullable().references("user_id").inTable("admin_user").onDelete("restrict");
    table.string("ip").notNullable();
    table.string("login_device").nullable();
    table.boolean("two_factor_authenticated").defaultTo(false);
    table.enum("attempt_type", ["password", "otp"]).notNullable();
    table.boolean("attempt_success").defaultTo(false);
    table.string("attempt_status_char").defaultTo("");
    table.timestamps(false, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(TABLE_NAME);
}
