import { v4 as uuidv4 } from "uuid";
import { Knex } from "knex";

import { count, trx } from "../@types/Knex";
import { PayinGateway } from "../@types/database";

import { knex, knexRead } from "../data/knex";

import { PaginationParams } from "../@types/Common";

const tablename = "payin_gateway";

export const createPayinGateway = async (
  object: Partial<PayinGateway>,
  pg_id: string = uuidv4(),
  { trx }: trx = {}
): Promise<PayinGateway | null> => {
  object.pg_id = pg_id;
  const query = (trx || knex)(tablename).returning("*").insert(object);
  const result = await query;
  return result?.[0] as unknown as PayinGateway;
};

export const getPayinGatewayById = async (pg_id: string, { trx }: trx = {}): Promise<PayinGateway | null> => {
  if (!pg_id) throw new Error("Payment gateway ID is required");
  const query = (trx || knexRead)(tablename).where({ pg_id }).where({ is_deleted: false }).select("*").first();
  return query;
};

export const getPayinGatewayByFilter = async (
  filter: Partial<PayinGateway>,
  { trx }: trx = {}
): Promise<PayinGateway | null> => {
  const query = (trx || knexRead)(tablename).select("*").where(filter).first();
  // console.log(query.toString());
  return query;
};

export const getActivePG = async ({ trx }: trx = {}): Promise<PayinGateway | null> => {
  const query = (trx || knexRead)(tablename).select("*").where({ is_deleted: false }).first();
  // console.log(query.toString());
  return query;
};

export const updatePayinGateway = async (
  filter: Partial<PayinGateway>,
  update: Partial<PayinGateway>,
  { trx }: trx = {}
): Promise<PayinGateway | null> => {
  const query: Knex.QueryBuilder<PayinGateway, PayinGateway[]> = (trx || knex)<PayinGateway>(tablename)
    .returning("*")
    .where(filter)
    .update(update);
  const result = await query;
  return result[0] as unknown as PayinGateway;
};

export const softDeletePayinGateway = async (filter: Partial<PayinGateway>, { trx }: trx = {}): Promise<void> => {
  return (trx || knex)(tablename).returning("*").where(filter).update({ is_deleted: true });
};

export const getAllGateways = async ({
  limit,
  skip,
  status,
  totalRecords = false,
}: PaginationParams): Promise<Partial<PayinGateway>[] | count> => {
  if (totalRecords) {
    const countQuery = knexRead(tablename)
      .select(knexRead.raw("count(pg_id) as count"))
      .where({ is_deleted: !status })
      .first();
    return countQuery;
  }
  const columns = [
    "pg.pg_id",
    "pg.pg_service",
    "pg.pg_label",
    "pg.nickname",

    "pg.description",

    "pg.is_deleted",
    "pg.created_at",
    "pg.updated_at",
    "cb.username as created_by",
    "ub.username as updated_by",
  ];
  let query = knexRead(`${tablename} as pg`)
    .select(columns)
    .where("pg.is_deleted", !status)
    .leftJoin("admin_user as cb", "pg.created_by", "cb.user_id")
    .leftJoin("admin_user as ub", "pg.updated_by", "ub.user_id")
    .orderBy("pg.updated_at", "desc");

  if (limit) query = query.limit(limit).offset(skip || 0);
  // console.log(query.toString());
  return query;
};

export const getPgListForDropdown = (search?: string) => {
  const columns = ["nickname as label", "pg_id as value"];
  let query = knexRead(tablename).select(columns).where({ is_deleted: false }).orderBy("nickname", "asc");
  if (search) query = query.whereRaw("nickname iLIKE ?", [search]);
  return query;
};
