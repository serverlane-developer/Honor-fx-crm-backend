import { Knex } from "knex";

interface dropColumns {
  knex: Knex;
  tableName: string;
  columns: Array<string>;
}

const dropColumns = async ({ knex, tableName, columns }: dropColumns) => {
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    if (await knex.schema.hasColumn(tableName, col)) {
      await knex.schema.alterTable(tableName, async (table) => {
        table.dropColumn(col);
      });
    }
  }
};

export default {
  dropColumns,
};
