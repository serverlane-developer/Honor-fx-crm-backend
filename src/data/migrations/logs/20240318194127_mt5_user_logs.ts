import { Knex } from "knex";

const TABLE_NAME = "mt5_user_logs";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.string("mt5_user_id");
    table.string("status");
    table.string("email");
    table.string("phone_number");
    table.string("client_name");
    table.string("customer_id");
    table.string("mt5_id");
    table.string("master_password");
    table.string("investor_password");
    table.string("leverage");
    table.string("mt_group");
    table.string("country");
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
