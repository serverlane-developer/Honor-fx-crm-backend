import { Knex } from "knex";

const TABLE_NAME = "referral_logs";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.string("referral_id");
    table.string("referral_code");
    table.string("created_at");
    table.string("updated_at");
    table.boolean("is_deleted").defaultTo(false);
    table.string("user_id");
    table.string("updated_by");
    table.timestamp("created_on").defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(TABLE_NAME);
}
