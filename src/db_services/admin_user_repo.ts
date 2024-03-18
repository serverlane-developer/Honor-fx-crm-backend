import { v4 as uuidv4 } from "uuid";
import { Knex } from "knex";

import { count, trx } from "../@types/Knex";
import { AdminUser } from "../@types/database";

import { knex, knexRead } from "../data/knex";

import { PaginationParams } from "../@types/Common";

const tablename = "admin_user";

export const createAdmin = async (
  object: Partial<AdminUser>,
  user_id: string = uuidv4(),
  { trx }: trx = {}
): Promise<AdminUser | null> => {
  object.user_id = user_id;
  const query = (trx || knex)(tablename).returning("*").insert(object);
  const result = await query;
  return result?.[0] as unknown as AdminUser;
};

export const getAdminById = async (user_id: string, { trx }: trx = {}): Promise<AdminUser | null> => {
  if (!user_id) throw new Error("User ID is required");
  const query = (trx || knexRead)(tablename).where({ user_id }).where({ is_deleted: false }).select("*").first();
  return query;
};

export const getAllAdmins = async ({
  limit,
  skip,
  totalRecords = false,
}: PaginationParams): Promise<Partial<AdminUser>[] | count> => {
  if (totalRecords) {
    const countQuery = knexRead(tablename).select(knexRead.raw("count(user_id) as count")).first();
    return countQuery;
  }
  const columns = [
    "au.user_id",
    "au.username",
    "au.email",
    "au.last_login_ip",
    "au.last_login_timestamp",
    "au.is_2fa_enabled",
    "au.is_deleted",
    "au.created_at",
    "au.updated_at",
    "cb.username as created_by",
    "ub.username as updated_by",
  ];
  let query = knexRead(`${tablename} as au`)
    .select(columns)
    .leftJoin("admin_user as cb", "au.created_by", "cb.user_id")
    .leftJoin("admin_user as ub", "au.updated_by", "ub.user_id")
    .orderBy("au.username", "asc");

  if (limit) query = query.limit(limit).offset(skip || 0);
  // console.log(query.toString());
  return query;
};

export const getAdmin2faStatusById = async (user_id: string, { trx }: trx = {}): Promise<AdminUser | null> => {
  if (!user_id) throw new Error("User ID is required");
  const query = (trx || knexRead)(tablename)
    .where({ user_id })
    .where({ is_deleted: false })
    .select(["is_2fa_enabled as is_enabled"])
    .first();
  return query;
};

export const getAdminByFilter = async (filter: Partial<AdminUser>, { trx }: trx = {}): Promise<AdminUser | null> => {
  const query = (trx || knexRead)(tablename).select("*").where(filter).first();
  // console.log(query.toString());
  return query;
};

export const updateAdmin = async (
  filter: Partial<AdminUser>,
  update: Partial<AdminUser>,
  { trx }: trx = {}
): Promise<AdminUser | null> => {
  // REVIEW TEST IF THESE TYPES WORK
  const query: Knex.QueryBuilder<AdminUser, AdminUser[]> = (trx || knex)<AdminUser>(tablename)
    .returning("*")
    .where(filter)
    .update(update);
  const result = await query;
  return result[0] as unknown as AdminUser;
};

export const softDeleteAdmin = async (filter: Partial<AdminUser>, { trx }: trx = {}): Promise<void> => {
  return (trx || knex)(tablename).returning("*").where(filter).update({ is_deleted: true });
};

export const getFirstAdmin = () => {
  const query = knexRead.select("*").from(tablename).orderBy("created_at", "asc").first();
  return query;
};
