import { Knex } from "knex";

const TABLE_NAME = "customer";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.uuid("customer_id").primary();

    // profile related
    table.string("email").unique().nullable();
    table.string("phone_number").unique().notNullable();
    table.string("username").nullable();
    table.boolean("is_image_uploaded").defaultTo(false);

    // login related
    table.string("pin");
    table.boolean("is_pin_reset_required").defaultTo(false);
    table.timestamp("pin_changed_at").nullable().defaultTo(null);

    // 2fa related
    table.boolean("is_2fa_enabled").defaultTo(false);
    table.timestamp("two_factor_toggled_at").nullable().defaultTo(null);

    // login history
    table.timestamp("last_login_at").nullable().defaultTo(null);
    table.string("last_login_ip").nullable().defaultTo(null);

    // history
    table.uuid("created_by").nullable().references("user_id").inTable("admin_user").onDelete("restrict");
    table.uuid("updated_by").nullable().references("user_id").inTable("admin_user").onDelete("restrict");
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
