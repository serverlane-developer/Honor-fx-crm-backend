import { v4 as uuidv4 } from "uuid";
import { Knex } from "knex";
import lo from "lodash";

import { trx, count } from "../@types/Knex";
import { Module } from "../@types/database";

import { knex, knexRead } from "../data/knex";
import { DropdownObject } from "../@types/Common";

const tablename = "modules";

interface getAllModulesType {
  limit: number | null;
  skip: number | null;
  totalRecords?: boolean;
}

export const getModuleName = (module_name: string) => module_name.toLowerCase().split(" ").join("-");
export const parseModuleName = (module_name: string) => lo.startCase(module_name.split("-").join(" "));

export const createModule = async (
  object: Partial<Module>,
  module_id: string = uuidv4(),
  { trx }: trx = {}
): Promise<Module | null> => {
  object.module_id = module_id;
  const query = (trx || knex)(tablename).returning("*").insert(object);
  const result = await query;
  return result?.[0] as unknown as Module;
};

export const getModuleById = async (module_id: string, { trx }: trx = {}): Promise<Module | null> => {
  if (!module_id) throw new Error("Module ID is required");
  const query = (trx || knexRead)(tablename).where({ module_id }).where({ is_deleted: false }).select("*").first();
  return query;
};

export const getModuleByFilter = async (filter: Partial<Module>, { trx }: trx = {}): Promise<Module | null> => {
  const query = (trx || knexRead)(tablename).select("*").where(filter).first();
  // console.log(query.toString());
  return query;
};

export const getAllModules = async ({
  limit,
  skip,
  totalRecords = false,
}: getAllModulesType): Promise<Partial<Module>[] | count> => {
  if (totalRecords) {
    const countQuery = knexRead(tablename).select(knexRead.raw("count(module_id) as count")).first();
    return countQuery;
  }
  const columns = [
    "m.module_id",
    "m.module_name",
    "m.is_deleted",
    "m.created_at",
    "m.updated_at",
    "cb.username as created_by",
    "ub.username as updated_by",
    knexRead.raw(
      "(select count(submodule_id) from submodules where module_id = m.module_id limit 1) as submodule_count"
    ),
  ];
  let query = knexRead(`${tablename} as m`)
    .select(columns)
    .orderBy("module_name", "asc")
    .leftJoin("admin_user as cb", "m.created_by", "cb.user_id")
    .leftJoin("admin_user as ub", "m.updated_by", "ub.user_id");
  if (limit) query = query.limit(limit).offset(skip || 0);
  // console.log(query.toString());
  return query;
};

export const getModulesForDropdown = async (): Promise<DropdownObject[]> => {
  const columns = ["m.module_id as value", "m.module_name as label"];
  const query = knexRead(`${tablename} as m`)
    .select(columns)
    .where({ is_deleted: false })
    .orderBy("module_name", "asc");
  // console.log(query.toString());
  return query as unknown as DropdownObject[];
};

export const updateModule = async (
  filter: Partial<Module>,
  update: Partial<Module>,
  { trx }: trx = {}
): Promise<Module | null> => {
  // REVIEW TEST IF THESE TYPES WORK
  const query: Knex.QueryBuilder<Module, Module[]> = (trx || knex)<Module>(tablename)
    .returning("*")
    .where(filter)
    .update(update);
  const result = await query;
  return result[0] as unknown as Module;
};

export const softDeleteModule = async (filter: Partial<Module>, { trx }: trx = {}): Promise<void> => {
  return (trx || knex)(tablename).returning("*").where(filter).update({ is_deleted: true });
};
