import { Knex } from "knex";

const TABLE_NAME = "admin_user_logs";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.string("user_id");
    table.string("username");
    table.string("password");
    table.string("email");
    table.string("mobile");
    table.boolean("is_2fa_enabled");
    table.timestamp("password_changed_at");
    table.string("role_id");
    table.string("created_by");
    table.string("updated_by");
    table.string("created_at");
    table.string("updated_at");
    table.timestamp("created_on").defaultTo(knex.fn.now());
    table.boolean("is_deleted").defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(TABLE_NAME);
}
