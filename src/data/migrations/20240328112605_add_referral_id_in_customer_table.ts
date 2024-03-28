import { Knex } from "knex";
import dbHelper from "../../helpers/dbHelper";

const TABLE_NAME = "customer";

const columns = ["referral_id"];

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TABLE_NAME, (table) => {
    table.uuid("referral_id").nullable().references("referral_id").inTable("referral");
  });
}

export async function down(knex: Knex): Promise<void> {
  await dbHelper.dropColumns({ knex, columns, tableName: TABLE_NAME });
}
