import { v4 as uuidv4 } from "uuid";
import { Knex } from "knex";

import { count, trx } from "../@types/Knex";
import { PayoutGateway } from "../@types/database";

import { knex, knexRead } from "../data/knex";

import { PaginationParams } from "../@types/Common";
import { PaymentMethod, payment_req_method } from "../@types/database/Withdraw";

const tablename = "payout_gateway";

export const createPayoutGateway = async (
  object: Partial<PayoutGateway>,
  pg_id: string = uuidv4(),
  { trx }: trx = {}
): Promise<PayoutGateway | null> => {
  object.pg_id = pg_id;
  const query = (trx || knex)(tablename).returning("*").insert(object);
  const result = await query;
  return result?.[0] as unknown as PayoutGateway;
};

export const getPayoutGatewayById = async (pg_id: string, { trx }: trx = {}): Promise<PayoutGateway | null> => {
  if (!pg_id) throw new Error("Payment gateway ID is required");
  const query = (trx || knexRead)(tablename).where({ pg_id }).where({ is_deleted: false }).select("*").first();
  return query;
};

export const getPayoutGatewayByFilter = async (
  filter: Partial<PayoutGateway>,
  { trx }: trx = {}
): Promise<PayoutGateway | null> => {
  const query = (trx || knexRead)(tablename).select("*").where(filter).first();
  // console.log(query.toString());
  return query;
};

export const getActivePG = async ({ trx }: trx = {}): Promise<PayoutGateway | null> => {
  const query = (trx || knexRead)(tablename).select("*").where({ is_deleted: false }).first();
  // console.log(query.toString());
  return query;
};

export const updatePayoutGateway = async (
  filter: Partial<PayoutGateway>,
  update: Partial<PayoutGateway>,
  { trx }: trx = {}
): Promise<PayoutGateway | null> => {
  const query: Knex.QueryBuilder<PayoutGateway, PayoutGateway[]> = (trx || knex)<PayoutGateway>(tablename)
    .returning("*")
    .where(filter)
    .update(update);
  const result = await query;
  return result[0] as unknown as PayoutGateway;
};

export const softDeletePayoutGateway = async (filter: Partial<PayoutGateway>, { trx }: trx = {}): Promise<void> => {
  return (trx || knex)(tablename).returning("*").where(filter).update({ is_deleted: true });
};

export const getAllGateways = async ({
  limit,
  skip,
  status,
  totalRecords = false,
}: PaginationParams): Promise<Partial<PayoutGateway>[] | count> => {
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
    "pg.threshold_limit",
    "pg.imps_enabled",
    "pg.imps_min",
    "pg.imps_max",
    "pg.neft_enabled",
    "pg.neft_min",
    "pg.neft_max",
    "pg.rtgs_enabled",
    "pg.rtgs_min",
    "pg.rtgs_max",
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

export const getPaymentMethod = (pg: PayoutGateway, amount: number): payment_req_method | null => {
  const { imps_enabled, imps_max, imps_min, neft_enabled, neft_max, neft_min } = pg;
  if (amount >= Number(imps_min || 0) && amount <= Number(imps_max || 0) && imps_enabled) {
    return PaymentMethod.IMPS;
  } else if (amount >= Number(neft_min || 0) && amount <= Number(neft_max || 0) && neft_enabled) {
    return PaymentMethod.NEFT;
  }
  return null;
};

export const getPgListForDropdown = (search?: string) => {
  const columns = ["nickname as label", "pg_id as value"];
  let query = knexRead(tablename).select(columns).where({ is_deleted: false }).orderBy("nickname", "asc");
  if (search) query = query.whereRaw("nickname iLIKE ?", [search]);
  return query;
};

export const getListForCustomer = () => {
  const columns = ["pg_id", "pg_label"];
  const query = knexRead(tablename).select(columns).where({ is_deleted: false });
  return query;
};
