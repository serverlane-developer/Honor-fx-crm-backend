import { Knex } from "knex";

const TABLE_NAME = "submodules";
const LOG_TABLE_NAME = `${TABLE_NAME}_logs`;

const columns = [
  "submodule_id",
  "submodule_name",
  "module_id",
  "created_at",
  "updated_at",
  "is_deleted",
  "created_by",
  "updated_by",
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
  AFTER UPDATE OF ${COL_STRING} ON ${TABLE_NAME}
  FOR EACH ROW
  EXECUTE PROCEDURE ${TABLE_NAME}_update_log();`;
  return await knex.raw(query);
}

export async function down(knex: Knex): Promise<void> {
  const query = `DROP TRIGGER ${LOG_TABLE_NAME}_trigger ON ${TABLE_NAME};`;
  await knex.raw(query);
}
