import { Knex } from "knex";
import dbHelper from "../../helpers/dbHelper";

const TABLE_NAME = "withdraw";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TABLE_NAME, (table) => {
    table.uuid("refund_transaction_id").nullable().references("transaction_id").inTable("deposit").onDelete("restrict");
  });
}

export async function down(knex: Knex): Promise<void> {
  await dbHelper.dropColumns({ knex, columns: ["refund_transaction_id"], tableName: TABLE_NAME });
}
