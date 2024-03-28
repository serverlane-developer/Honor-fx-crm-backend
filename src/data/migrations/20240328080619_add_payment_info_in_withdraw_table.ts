import { Knex } from "knex";
import dbHelper from "../../helpers/dbHelper";

const TABLE_NAME = "withdraw";

const columns = ["payment_method", "account_number", "ifsc", "bank_name", "account_name", "upi_id"];

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TABLE_NAME, (table) => {
    table.string("payment_method").nullable().defaultTo(null);
    table.string("account_number").nullable().defaultTo(null);
    table.string("ifsc").nullable().defaultTo(null);
    table.string("bank_name").nullable().defaultTo(null);
    table.string("account_name").nullable().defaultTo(null);
    table.string("upi_id").nullable().defaultTo(null);
  });
}

export async function down(knex: Knex): Promise<void> {
  await dbHelper.dropColumns({ knex, columns, tableName: TABLE_NAME });
}
