import { v4 as uuidv4 } from "uuid";
import { Knex } from "knex";

import { trx } from "../@types/Knex";
import { AccessControl } from "../@types/database";

import { knex, knexRead } from "../data/knex";

const tablename = "access_control";

export const createAcessControl = async (
  object: Partial<AccessControl>,
  access_control_id: string = uuidv4(),
  { trx }: trx = {}
): Promise<AccessControl> => {
  object.access_control_id = access_control_id;
  const query = (trx || knex)(tablename).returning("*").insert(object);
  const result = await query;
  return result?.[0] as unknown as AccessControl;
};

export const bulkInsertAccessControl = async (
  access_control: Partial<AccessControl>[],
  { trx }: trx = {}
): Promise<number[]> => {
  const query = (trx || knex)(tablename).insert(access_control);
  const result = await query;
  return result;
};

export const getAccessControlById = async (
  access_control_id: string,
  { trx }: trx = {}
): Promise<AccessControl | null> => {
  if (!access_control_id) throw new Error("Access Control ID is required");
  const query = (trx || knexRead)(tablename)
    .where({ access_control_id })
    .where({ is_deleted: false })
    .select("*")
    .first();
  return query;
};

export const getAccessControlByFilter = async (
  filter: Partial<AccessControl>,
  { trx }: trx = {}
): Promise<AccessControl | null> => {
  const query = (trx || knexRead)(tablename).select("*").where(filter).first();
  // console.log(query.toString());
  return query;
};

export const getAccessControlByRoleId = async (role_id: string) => {
  const columns = [
    "ac.access_control_id",
    "ac.submodule_id",
    "ac.can_create",
    "ac.can_delete",
    "ac.can_read",
    "ac.can_update",
    "sb.submodule_name",
    "m.module_name",
    "r.role_name",
    "r.created_by as role_created_by",
    // "cb.username as created_by",
    // "ub.username as updated_by",
  ];
  const query = knexRead(`${tablename} as ac`)
    .select(columns)
    .where({ "ac.role_id": role_id })
    .join("roles as r", "r.role_id", "ac.role_id")
    .join("submodules as sb", "ac.submodule_id", "sb.submodule_id")
    .join("modules as m", "m.module_id", "sb.module_id")
    // .leftJoin("admin_user as cb", "r.created_by", "cb.user_id")
    // .leftJoin("admin_user as ub", "r.updated_by", "ub.user_id")
    .orderBy("module_name", "asc");
  return query;
};

// for backoffice
export const getAccessControlModulesByRoleId = async (role_id: string) => {
  const columns = ["m.module_name", "sb.submodule_name"];
  const query = knexRead(`${tablename} as ac`)
    .select(columns)
    .where({ "ac.role_id": role_id })
    .join("submodules as sb", "ac.submodule_id", "sb.submodule_id")
    .join("modules as m", "m.module_id", "sb.module_id")
    .orderBy("module_name", "asc");
  return query;
};

export const updateAccessControl = async (
  filter: Partial<AccessControl>,
  update: Partial<AccessControl>,
  { trx }: trx = {}
): Promise<AccessControl | null> => {
  const query: Knex.QueryBuilder<AccessControl, AccessControl[]> = (trx || knex)<AccessControl>(tablename)
    .returning("*")
    .where(filter)
    .update(update);
  const result = await query;
  return result[0] as unknown as AccessControl;
};

export const softDeleteAccessControl = async (filter: Partial<AccessControl>, { trx }: trx = {}): Promise<void> => {
  return (trx || knex)(tablename).returning("*").where(filter).update({ is_deleted: true });
};

export const hardDeleteAccessControl = async (filter: Partial<AccessControl>, { trx }: trx = {}): Promise<void> => {
  return (trx || knex)(tablename).where(filter).del();
};
