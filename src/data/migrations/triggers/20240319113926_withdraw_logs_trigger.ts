import { Knex } from "knex";

const TABLE_NAME = "withdraw";
const LOG_TABLE_NAME = `${TABLE_NAME}_logs`;

const columns = [
  "transaction_id",
  "amount",
  "transaction_type",
  "status",
  "mt5_status",
  "payout_status",
  "admin_message",
  "mt5_message",
  "payout_message",
  "api_error",
  "ip",
  "payment_method_id",
  "customer_id",
  "mt5_user_id",
  "dealid",
  "margin",
  "freemargin",
  "equity",
  "refund_transaction_id",
  "is_receipt_uploaded",
  "updated_by",
  "pg_id",
  "payment_status",
  "payment_fail_count",
  "payment_req_method",
  "utr_id",
  "payment_creation_date",
  "payment_order_id",
  "pg_task",
  "pg_order_id",
  "payment_method",
  "account_number",
  "ifsc",
  "bank_name",
  "account_name",
  "upi_id",
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
