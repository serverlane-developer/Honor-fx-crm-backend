import { v4 as uuidv4 } from "uuid";
import { Knex } from "knex";

import { count, trx } from "../@types/Knex";
import { Deposit } from "../@types/database";

import { knex, knexRead } from "../data/knex";

import { PaginationParams } from "../@types/Common";
import { Status } from "../@types/database/Deposit";
import helpers from "../helpers/helpers";

const tablename = "deposit";

export const createTransaction = async (
  object: Partial<Deposit>,
  transaction_id: string = uuidv4(),
  { trx }: trx = {}
): Promise<Deposit | null> => {
  object.transaction_id = transaction_id;
  const query = (trx || knex)(tablename).returning("*").insert(object);
  const result = await query;
  return result?.[0] as unknown as Deposit;
};

export const getTransactionById = async (transaction_id: string, { trx }: trx = {}): Promise<Deposit | null> => {
  if (!transaction_id) throw new Error("Transaction ID is required");
  const query = (trx || knexRead)(tablename).where({ transaction_id }).where({ is_deleted: false }).select("*").first();
  return query;
};

export const getTransactionByFilter = async (filter: Partial<Deposit>, { trx }: trx = {}): Promise<Deposit | null> => {
  const query = (trx || knexRead)(tablename).select("*").where(filter).first();
  // console.log(query.toString());
  return query;
};

export const getTransactionsByFilter = async (filter: Partial<Deposit>, { trx }: trx = {}): Promise<Deposit[]> => {
  const query = (trx || knexRead)(tablename).select("*").where(filter);
  // console.log(query.toString());
  return query;
};

export const getTxnWithSimilarUTR = async (utr_number: string, { trx }: trx = {}) => {
  const query = (trx || knexRead)(tablename)
    .select("*")
    .where({ utr_number })
    .whereIn("status", [Status.PENDING, Status.SUCCESS])
    .first();
  // console.log("UTR QUERY", query.toString());
  return query;
};

export const updateTransaction = async (
  filter: Partial<Deposit>,
  update: Partial<Deposit>,
  { trx }: trx = {}
): Promise<Deposit | null> => {
  const query: Knex.QueryBuilder<Deposit, Deposit[]> = (trx || knex)<Deposit>(tablename)
    .returning("*")
    .where(filter)
    .update(update);
  const result = await query;
  return result[0] as unknown as Deposit;
};

export const softDeleteTransaction = async (filter: Partial<Deposit>, { trx }: trx = {}): Promise<void> => {
  return (trx || knex)(tablename).returning("*").where(filter).update({ is_deleted: true });
};

export const getAllTransactions = async ({
  limit,
  skip,
  totalRecords = false,
  status = null,
  order = "updated_at",
  dir,
}: // search = "",
PaginationParams): Promise<Partial<Deposit>[] | count> => {
  if (totalRecords) {
    const countQuery = knexRead(tablename)
      .select(knexRead.raw("count(transaction_id) as count"))
      .where({ status })
      .first();

    return countQuery;
  }

  const columns = [
    "t.transaction_id",
    "t.amount",
    "t.transaction_type",
    "t.utr_id",
    "t.status",

    "t.created_at",
    "t.updated_at",

    // admin
    "cb.username as created_by",
    "ub.username as updated_by",
  ];

  let query = knexRead(`${tablename} as t`)
    .select(columns)
    .where({ status })
    .join("customer as cb", "t.customer_id", "cb.customer_id")
    .leftJoin("admin_user as ub", "t.updated_by", "ub.user_id")
    .orderBy(`t.${order}`, dir);

  if (limit) query = query.limit(limit).offset(skip || 0);
  // console.log(query.toString());
  return query;
};

export const getTransactionHistory = ({ id, skip, limit, totalRecords }: PaginationParams) => {
  const logColumns = [
    knexRead.raw(`row_number() over (partition by t.transaction_id order by t.created_at) as version`),
    "au.username as updated_by",
    "t.status",
    "t.message",

    // logs
    "t.created_on as updated_at",
  ];
  if (totalRecords) {
    const countQuery = knexRead(`${tablename}_logs as t`)
      .select(knexRead.raw("count(t.transaction_id)+1 as count"))
      .first();
    return countQuery;
  }
  let query = knexRead
    .select(logColumns)
    .from(`${tablename}_logs as t`)
    .join("admin_user as au", knexRead.raw("CAST(t.updated_by as uuid) = au.user_id"))
    .where("t.transaction_id", id);
  query = query
    .union((qb) => {
      const columns = [...logColumns];
      columns[0] = knexRead.raw(
        `(select COUNT(*) + 1 from ${tablename}_logs where transaction_id = '${id}') as version`
      );
      // columns[columns.length - 1] = knexRead.raw("cast(t.updated_at as text)");
      columns[columns.length - 1] = "t.updated_at";

      qb.select(columns)
        .from(`${tablename} as t`)
        .join("admin_user as au", knexRead.raw("CAST(t.updated_by as uuid) = au.user_id"))
        .where("t.transaction_id", id);
    }, true)
    .orderBy("version", "asc");

  if (limit) query = query.limit(limit).offset(skip || 0);
  // console.log(query.toString());
  return query;
};

export const getUniqueOrderId = async (retry = 0): Promise<string | undefined> => {
  const id = helpers.getRandomId(20);
  const idExists = await knexRead("deposit").select("transaction_id").where({ pg_order_id: id }).first();
  if (!idExists) return id;
  if (retry > 10) throw new Error("Unable to generate Unique Order ID for Payin");
  if (idExists) return getUniqueOrderId(retry + 1);
};

export const getCustomerTransactions = async ({
  limit,
  skip,
  totalRecords = false,
  status = null,
  order = "updated_at",
  dir,
  customer_id,
  mt5_user_id,
  from_date,
  to_date,
}: PaginationParams): Promise<Partial<Deposit>[] | count> => {
  const filter = {
    "t.customer_id": customer_id,
    ...(status && { "t.status": status }),
    ...(mt5_user_id && { "t.mt5_user_id": mt5_user_id }),
  };

  if (totalRecords) {
    const countQuery = knexRead(`${tablename} as t`)
      .select(knexRead.raw("count(t.transaction_id) as count"))
      .where(filter)
      .first();

    return countQuery;
  }

  const showPgColumns = ![Status.PROCESSING, Status.FAILED].includes(status);
  const columns = [
    "t.transaction_id",
    "t.amount",
    "t.transaction_type",

    "t.status",
    "t.payin_status",
    "t.mt5_status",
    "t.payin_message",
    "t.mt5_message",
    "t.admin_message",

    "t.api_error",
    "t.created_at",
    "t.updated_at",
    "t.is_deleted",
    "t.dealid",
    "t.margin",
    "t.freemargin",
    "t.equity",

    // customer
    "c.phone_number",
    "c.username",
  ];
  if (showPgColumns) {
    columns.push("t.pg_order_id");
    columns.push("t.payment_status");
    columns.push("t.utr_id");
    columns.push("t.payment_order_id");

    // payment gateway
    columns.push("pg.pg_label");
  }

  let query = knexRead(`${tablename} as t`)
    .select(columns)
    .where(filter)
    .join("customer as c", "t.customer_id", "c.customer_id")
    .join("payin_gateway as pg", "t.pg_id", "pg.pg_id")
    .orderBy(`t.${order}`, dir);

  if (from_date && to_date) {
    query = query.whereBetween("t.created_at", [from_date, to_date]);
  }

  if (limit) query = query.limit(limit).offset(skip || 0);
  // console.log(query.toString());
  return query;
};
