import { Knex } from "knex";

const TABLE_NAME = "deposit";
const LOG_TABLE_NAME = `${TABLE_NAME}_logs`;

const columns = [
  "transaction_id",
  "amount",
  "transaction_type",
  "status",
  "mt5_status",
  "payin_status",
  "admin_message",
  "mt5_message",
  "payin_message",
  "api_error",
  "ip",
  "customer_id",
  "mt5_user_id",
  "updated_by",
  "pg_id",
  "payment_status",
  "utr_id",
  "payment_order_id",
  "pg_order_id",
  "dealid",
  "margin",
  "freemargin",
  "equity",
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
