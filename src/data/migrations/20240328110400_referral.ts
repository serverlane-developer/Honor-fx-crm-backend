import { Knex } from "knex";

const TABLE_NAME = "referral";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.uuid("referral_id").primary();
    table.string("referral_code").unique().notNullable();
    table.timestamps(true, true); // Adds created_at and updated_at columns with timestamps

    table.uuid("user_id").notNullable().references("user_id").inTable("admin_user").onDelete("restrict"); // referral code related to user
    table.uuid("updated_by").nullable().references("user_id").inTable("admin_user").onDelete("restrict");
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
