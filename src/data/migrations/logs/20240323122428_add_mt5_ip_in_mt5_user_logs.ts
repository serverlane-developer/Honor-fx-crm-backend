import { Knex } from "knex";
import dbHelper from "../../../helpers/dbHelper";

const TABLE_NAME = "mt5_user_logs";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TABLE_NAME, (table) => {
    table.string("mt5_ip").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await dbHelper.dropColumns({ knex, columns: ["mt5_ip"], tableName: TABLE_NAME });
}
