import { v4 as uuidv4 } from "uuid";
import { Knex } from "knex";

import { count, trx } from "../@types/Knex";
import { Mt5User } from "../@types/database";

import { knex, knexRead } from "../data/knex";

import { PaginationParams } from "../@types/Common";

const tablename = "mt5_user";

export const createMt5User = async (
  object: Partial<Mt5User>,
  mt5_user_id?: string,
  { trx }: trx = {}
): Promise<Mt5User | null> => {
  object.mt5_user_id = mt5_user_id || uuidv4();
  const query = (trx || knex)(tablename).returning("*").insert(object);
  const result = await query;
  return result?.[0] as unknown as Mt5User;
};

export const getMt5UserById = async (mt5_user_id: string, { trx }: trx = {}): Promise<Mt5User | null> => {
  if (!mt5_user_id) throw new Error("Mt5User ID is required");
  const query = (trx || knexRead)(tablename).where({ mt5_user_id }).where({ is_deleted: false }).select("*").first();
  return query;
};

export const getAllMt5Users = async ({
  limit,
  skip,
  totalRecords = false,
}: PaginationParams): Promise<Partial<Mt5User>[] | count> => {
  if (totalRecords) {
    const countQuery = knexRead(tablename).select(knexRead.raw("count(mt5_user_id) as count")).first();
    return countQuery;
  }
  const columns = ["m.*", "cb.username as created_by", "ub.username as updated_by"];
  let query = knexRead(`${tablename} as m`)
    .select(columns)
    .join("customer as cb", "m.customer_id", "cb.mt5_user_id")
    .leftJoin("admin_user as ub", "m.updated_by", "ub.user_id")
    .orderBy("m.updated_at", "desc");

  if (limit) query = query.limit(limit).offset(skip || 0);
  // console.log(query.toString());
  return query;
};

export const getMt5UserByFilter = async (filter: Partial<Mt5User>, { trx }: trx = {}): Promise<Mt5User | null> => {
  const query = (trx || knexRead)(tablename).select("*").where(filter).first();
  // console.log(query.toString());
  return query;
};

export const updateMt5User = async (
  filter: Partial<Mt5User>,
  update: Partial<Mt5User>,
  { trx }: trx = {}
): Promise<Mt5User | null> => {
  const query: Knex.QueryBuilder<Mt5User, Mt5User[]> = (trx || knex)<Mt5User>(tablename)
    .returning("*")
    .where(filter)
    .update(update);
  const result = await query;
  return result[0] as unknown as Mt5User;
};

export const softDeleteMt5User = async (filter: Partial<Mt5User>, { trx }: trx = {}): Promise<void> => {
  return (trx || knex)(tablename).returning("*").where(filter).update({ is_deleted: true });
};
