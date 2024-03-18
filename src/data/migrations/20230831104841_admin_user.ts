import { Knex } from "knex";

const TABLE_NAME = "admin_user";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.uuid("user_id").primary();
    table.string("username").unique().notNullable();
    table.string("password").notNullable();
    table.string("email").unique().notNullable();
    table.string("mobile").nullable();
    table.string("last_login_ip").defaultTo(null);
    table.timestamp("last_login_timestamp");
    table.boolean("is_2fa_enabled").defaultTo(false);
    table.timestamp("password_changed_at").defaultTo(null);
    table.uuid("role_id").notNullable().references("role_id").inTable("roles").onDelete("restrict");
    table.uuid("created_by").nullable().references("user_id").inTable(TABLE_NAME).onDelete("restrict");
    table.uuid("updated_by").nullable().references("user_id").inTable(TABLE_NAME).onDelete("restrict");
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
