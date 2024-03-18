import { v4 as uuidv4 } from "uuid";
import { Knex } from "knex";

import { trx, count } from "../@types/Knex";
import { Submodule } from "../@types/database";

import { knex, knexRead } from "../data/knex";

const tablename = "submodules";

interface getAllSubmodulesType {
  module_id: string;
  limit: number | null;
  skip: number | null;
  totalRecords?: boolean;
}

export const createSubmodule = async (
  object: Partial<Submodule>,
  submodule_id: string = uuidv4(),
  { trx }: trx = {}
): Promise<Submodule | null> => {
  object.submodule_id = submodule_id;
  const query = (trx || knex)(tablename).returning("*").insert(object);
  const result = await query;
  return result?.[0] as unknown as Submodule;
};

export const getSubmoduleById = async (submodule_id: string, { trx }: trx = {}): Promise<Submodule | null> => {
  if (!submodule_id) throw new Error("Submodule ID is required");
  const query = (trx || knexRead)(tablename).where({ submodule_id }).where({ is_deleted: false }).select("*").first();
  return query;
};

export const getSubmoduleByFilter = async (
  filter: Partial<Submodule>,
  { trx }: trx = {}
): Promise<Submodule | null> => {
  const query = (trx || knexRead)(tablename).select("*").where(filter).first();
  // console.log(query.toString());
  return query;
};

export const getSubmodulesByFilter = async (
  filter: Partial<Submodule>,
  { trx }: trx = {}
): Promise<Partial<Submodule>[]> => {
  const query = (trx || knexRead)(tablename).select("*").where(filter);
  // console.log(query.toString());
  return query;
};

export const getAllSubmodules = async ({
  module_id,
  limit,
  skip,
  totalRecords = false,
}: getAllSubmodulesType): Promise<Partial<Submodule>[] | count> => {
  if (totalRecords) {
    const countQuery = knexRead(tablename).select(knexRead.raw("count(submodule_id) as count")).first();
    return countQuery;
  }
  const columns = [
    "sm.submodule_id",
    "sm.submodule_name",
    "sm.is_deleted",
    "sm.created_at",
    "sm.updated_at",
    "cb.username as created_by",
    "ub.username as updated_by",
  ];
  let query = knexRead(`${tablename} as sm`)
    .select(columns)
    .where({ module_id })
    // .join("modules as m", "sm.module_id", "m.module_id")
    .leftJoin("admin_user as cb", "sm.created_by", "cb.user_id")
    .leftJoin("admin_user as ub", "sm.updated_by", "ub.user_id")
    .orderBy("submodule_name", "asc");
  if (limit) query = query.limit(limit).offset(skip || 0);
  // console.log(query.toString());
  return query;
};

export const getSubmodulesForRoleAssignment = async (): Promise<Partial<Submodule>[] | count> => {
  const columns = ["sm.submodule_id", "sm.submodule_name", "sm.module_id", "m.module_name"];
  const query = knexRead(`${tablename} as sm`)
    .select(columns)
    .join("modules as m", "sm.module_id", "m.module_id")
    .orderBy("module_name", "asc");
  // console.log(query.toString());
  return query;
};

export const updateSubmodule = async (
  filter: Partial<Submodule>,
  update: Partial<Submodule>,
  { trx }: trx = {}
): Promise<Submodule | null> => {
  // REVIEW TEST IF THESE TYPES WORK
  const query: Knex.QueryBuilder<Submodule, Submodule[]> = (trx || knex)<Submodule>(tablename)
    .returning("*")
    .where(filter)
    .update(update);
  const result = await query;
  return result[0] as unknown as Submodule;
};

export const softDeleteSubmodule = async (filter: Partial<Submodule>, { trx }: trx = {}): Promise<void> => {
  return (trx || knex)(tablename).returning("*").where(filter).update({ is_deleted: true });
};
