import { v4 as uuidv4 } from "uuid";
import { Knex } from "knex";

import { trx } from "../@types/Knex";
import { PgTransaction } from "../@types/database";

import { knex, knexRead } from "../data/knex";

const tablename = "pg_transaction";

export const createPgTransaction = async (
  object: Partial<PgTransaction>,
  pg_order_id: string = uuidv4(),
  { trx }: trx = {}
): Promise<PgTransaction | null> => {
  object.pg_order_id = pg_order_id;
  const query = (trx || knex)(tablename).returning("*").insert(object);
  const result = await query;
  return result?.[0] as unknown as PgTransaction;
};

export const getPgTransactionById = async (pg_order_id: string, { trx }: trx = {}): Promise<PgTransaction | null> => {
  if (!pg_order_id) throw new Error("PG Order ID is required");
  const query = (trx || knexRead)(tablename).where({ pg_order_id }).where({ is_deleted: false }).select("*").first();
  return query;
};

export const getPgTransactionByFilter = async (
  filter: Partial<PgTransaction>,
  { trx }: trx = {}
): Promise<PgTransaction | null> => {
  const query = (trx || knexRead)(tablename).select("*").where(filter).first();
  // console.log(query.toString());
  return query;
};

export const updatePgTransaction = async (
  filter: Partial<PgTransaction>,
  update: Partial<PgTransaction>,
  { trx }: trx = {}
): Promise<PgTransaction | null> => {
  const query: Knex.QueryBuilder<PgTransaction, PgTransaction[]> = (trx || knex)<PgTransaction>(tablename)
    .returning("*")
    .where(filter)
    .update(update);
  const result = await query;
  return result[0] as unknown as PgTransaction;
};

export const softDeletePgTransaction = async (filter: Partial<PgTransaction>, { trx }: trx = {}): Promise<void> => {
  return (trx || knex)(tablename).returning("*").where(filter).update({ is_deleted: true });
};

export const getPgOrderIdHistory = (transaction_id: string) => {
  if (!transaction_id) throw new Error("Transaction ID is required");
  const columns = [
    "pg_order_id",
    "api_error",
    "pg_label",
    "payment_status",
    "payment_fail_count",
    "payment_req_method",
    "utr_id",
    "payment_creation_date",
    "payment_order_id",
    "latest_status",
    "latest_message",
    "pg_transaction.created_at",
    "pg_transaction.updated_at",
  ];

  const query = knexRead(tablename)
    .select(columns)
    .where({ transaction_id })
    .join("payout_gateway as pg", "pg.pg_id", "pg_transaction.pg_id")
    .orderBy("created_at", "desc");
  return query;
};
