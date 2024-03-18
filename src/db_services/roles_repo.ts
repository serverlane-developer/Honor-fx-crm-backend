import { v4 as uuidv4 } from "uuid";
import { Knex } from "knex";

import { trx, count } from "../@types/Knex";
import { Role } from "../@types/database";

import { knex, knexRead } from "../data/knex";
import { DropdownObject } from "../@types/Common";

const tablename = "roles";

interface getAllRolesType {
  limit: number | null;
  skip: number | null;
  totalRecords?: boolean;
}

export const createRole = async (
  object: Partial<Role>,
  role_id: string = uuidv4(),
  { trx }: trx = {}
): Promise<Role> => {
  object.role_id = role_id;
  const query = (trx || knex)(tablename).returning("*").insert(object);
  const result = await query;
  return result?.[0] as unknown as Role;
};

export const getRoleById = async (role_id: string, { trx }: trx = {}): Promise<Role | null> => {
  if (!role_id) throw new Error("Role ID is required");
  const query = (trx || knexRead)(tablename).where({ role_id }).where({ is_deleted: false }).select("*").first();
  return query;
};

export const getRoleByFilter = async (filter: Partial<Role>, { trx }: trx = {}): Promise<Role | null> => {
  const query = (trx || knexRead)(tablename).select("*").where(filter).first();
  // console.log(query.toString());
  return query;
};

export const getRoleByName = async (role_name: string, { trx }: trx = {}): Promise<Role | null> => {
  const query = (trx || knexRead)(tablename).select("*").whereRaw(`lower(role_name) = ?`, [role_name]).first();
  // console.log(query.toString());
  return query;
};

export const getAllRoles = async ({
  limit,
  skip,
  totalRecords = false,
}: getAllRolesType): Promise<Partial<Role>[] | count> => {
  if (totalRecords) {
    const countQuery = knexRead(tablename).select(knexRead.raw("count(role_id) as count")).first();
    return countQuery;
  }
  const columns = [
    "r.role_id",
    "r.role_name",
    "r.is_deleted",
    "r.created_at",
    "r.updated_at",
    "cb.username as created_by",
    "ub.username as updated_by",
  ];
  let query = knexRead(`${tablename} as r`)
    .select(columns)
    .leftJoin("admin_user as cb", "r.created_by", "cb.user_id")
    .leftJoin("admin_user as ub", "r.updated_by", "ub.user_id")
    .orderBy("role_name", "asc");

  if (limit) query = query.limit(limit).offset(skip || 0);
  // console.log(query.toString());
  return query;
};

export const getRolesForDropdown = async (): Promise<DropdownObject[]> => {
  const columns = ["r.role_id as value", "r.role_name as label"];
  const query = knexRead(`${tablename} as r`).select(columns).where({ is_deleted: false }).orderBy("role_name", "asc");
  // console.log(query.toString());
  return query as unknown as DropdownObject[];
};

export const updateRole = async (
  filter: Partial<Role>,
  update: Partial<Role>,
  { trx }: trx = {}
): Promise<Role | null> => {
  const query: Knex.QueryBuilder<Role, Role[]> = (trx || knex)<Role>(tablename)
    .returning("*")
    .where(filter)
    .update(update);
  const result = await query;
  return result[0] as unknown as Role;
};

export const softDeleteRole = async (filter: Partial<Role>, { trx }: trx = {}): Promise<void> => {
  return (trx || knex)(tablename).returning("*").where(filter).update({ is_deleted: true });
};
