import { Knex } from "knex";

const TABLE_NAME = "customer_logs";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.string("customer_id");
    table.string("email");
    table.string("phone_number");
    table.string("username");
    table.boolean("is_image_uploaded");
    table.string("pin");
    table.boolean("is_pin_reset_required");
    table.string("pin_changed_at");
    table.boolean("is_2fa_enabled");
    table.string("two_factor_toggled_at");
    table.string("referral_id");
    table.string("created_by");
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
