import { Knex } from "knex";
import dbHelper from "../../../helpers/dbHelper";

const TABLE_NAME = "withdraw_logs";

const columns = ["payment_method", "account_number", "ifsc", "bank_name", "account_name", "upi_id"];

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TABLE_NAME, (table) => {
    table.string("payment_method");
    table.string("account_number");
    table.string("ifsc");
    table.string("bank_name");
    table.string("account_name");
    table.string("upi_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await dbHelper.dropColumns({ knex, columns, tableName: TABLE_NAME });
}
