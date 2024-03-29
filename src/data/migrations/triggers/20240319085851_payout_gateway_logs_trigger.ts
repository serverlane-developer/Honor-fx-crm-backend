import { Knex } from "knex";

const TABLE_NAME = "payout_gateway";
const LOG_TABLE_NAME = `${TABLE_NAME}_logs`;

const columns = [
  "pg_id",
  "pg_label",
  "nickname",
  "pg_service",

  "base_url",
  "base_url_alt",
  "merchant_id",
  "secret_key",
  "client_id",
  "description",
  
  "threshold_limit",
  "imps_enabled",
  "imps_min",
  "imps_max",
  "neft_enabled",
  "neft_min",
  "neft_max",
  "rtgs_enabled",
  "rtgs_min",
  "rtgs_max",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
  "is_deleted",
];

const COL_STRING = columns.join(", ");
const OLD_COL_STRING = columns.map((col) => `OLD.${col}`).join(", ");

export async function up(knex: Knex): Promise<void> {
  const query = `
  CREATE OR REPLACE FUNCTION ${TABLE_NAME}_update_log()
  RETURNS TRIGGER AS 
  $$
  BEGIN
  INSERT INTO ${LOG_TABLE_NAME}(${COL_STRING})
  VALUES(${OLD_COL_STRING});
  RETURN NULL;
  END;
  $$

  /* need to set language to postgres for some weird reason */
  LANGUAGE 'plpgsql';
  /* create trigger */
  CREATE TRIGGER ${LOG_TABLE_NAME}_trigger
  AFTER UPDATE ON ${TABLE_NAME}
  FOR EACH ROW
  EXECUTE PROCEDURE ${TABLE_NAME}_update_log();`;
  return await knex.raw(query);
}

export async function down(knex: Knex): Promise<void> {
  const query = `DROP TRIGGER ${LOG_TABLE_NAME}_trigger ON ${TABLE_NAME};`;
  await knex.raw(query);
}
