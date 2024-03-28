import { Knex } from "knex";
import dbHelper from "../../../helpers/dbHelper";

const TABLE_NAME = "customer_logs";

const columns = ["referral_id"];

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TABLE_NAME, (table) => {
    table.string("referral_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await dbHelper.dropColumns({ knex, columns, tableName: TABLE_NAME });
}
