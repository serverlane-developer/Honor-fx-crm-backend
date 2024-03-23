import { v4 as uuidv4 } from "uuid";
import { Knex } from "knex";

import { count, trx } from "../@types/Knex";
import { Withdraw } from "../@types/database";

import { knex, knexRead } from "../data/knex";

import { PaginationParams } from "../@types/Common";
import { Status } from "../@types/database/Withdraw";

const tablename = "withdraw";

export const createTransaction = async (
  object: Partial<Withdraw>,
  transaction_id: string = uuidv4(),
  { trx }: trx = {}
): Promise<Withdraw | null> => {
  object.transaction_id = transaction_id;
  const query = (trx || knex)(tablename).returning("*").insert(object);
  const result = await query;
  return result?.[0] as unknown as Withdraw;
};

export const getTransactionById = async (transaction_id: string, { trx }: trx = {}): Promise<Withdraw | null> => {
  if (!transaction_id) throw new Error("Transaction ID is required");
  const query = (trx || knexRead)(tablename).where({ transaction_id }).where({ is_deleted: false }).select("*").first();
  return query;
};

export const getTransactionByFilter = async (
  filter: Partial<Withdraw>,
  { trx }: trx = {}
): Promise<Withdraw | null> => {
  const query = (trx || knexRead)(tablename).select("*").where(filter).first();
  // console.log(query.toString());
  return query;
};

export const getTransactionsByFilter = async (
  filter: Partial<Withdraw>,
  { trx }: trx = {}
): Promise<Withdraw[] | []> => {
  const query = (trx || knexRead)(tablename).select("*").where(filter);
  // console.log(query.toString());
  return query;
};

export const updateTransaction = async (
  filter: Partial<Withdraw>,
  update: Partial<Withdraw>,
  { trx }: trx = {}
): Promise<Withdraw | null> => {
  const query: Knex.QueryBuilder<Withdraw, Withdraw[]> = (trx || knex)<Withdraw>(tablename)
    .returning("*")
    .where(filter)
    .update(update);
  const result = await query;
  return result[0] as unknown as Withdraw;
};

export const softDeleteTransaction = async (filter: Partial<Withdraw>, { trx }: trx = {}): Promise<void> => {
  return (trx || knex)(tablename).returning("*").where(filter).update({ is_deleted: true });
};

export const getAllTransactions = async ({
  limit,
  skip,
  totalRecords = false,
  status = null,
  order = "updated_at",
  dir,
}: PaginationParams): Promise<Partial<Withdraw>[] | count> => {
  if (totalRecords) {
    const countQuery = knexRead(tablename)
      .select(knexRead.raw("count(transaction_id) as count"))
      .where({ status })
      .first();

    return countQuery;
  }

  const showPgColumns = ![Status.PROCESSING, Status.FAILED, Status.SUCCESS].includes(status);
  const columns = [
    "t.transaction_id",
    "t.amount",
    // 
    "t.status",
    "t.mt5_status",
    "t.payout_status",
    // 
    "t.admin_message",
    "t.payout_message",
    "t.mt5_message",
    // 
    "t.api_error",
    "t.created_at",
    "t.updated_at",
    "t.is_deleted",
    "t.pg_task",

    "t.dealid",
    "t.margin",
    "t.freemargin",
    "t.equity",
    // customer
    "c.phone_number",
    "c.username",

    // customer payment methods
    "cpm.bank_name",
    "cpm.account_name",
    "cpm.account_number",
    "cpm.ifsc",
    "cpm.upi_id",

    // admin
    "ub.username as updated_by",
  ];
  if (showPgColumns) {
    columns.push("t.pg_order_id");
    columns.push("t.payment_status");
    columns.push("t.payment_fail_count");
    columns.push("t.payment_req_method");
    columns.push("t.utr_id");
    columns.push("t.payment_creation_date");
    columns.push("t.payment_order_id");

    // payment gateway
    columns.push("pg.pg_label");
    columns.push("pg.nickname");
  }

  let query = knexRead(`${tablename} as t`)
    .select(columns)
    .where({ status })
    .join("customer as c", "t.customer_id", "c.customer_id")
    .join("customer_payment_method as cpm", "t.payment_method_id", "cpm.payment_method_id")
    .leftJoin("admin_user as ub", "t.updated_by", "ub.user_id")
    .orderBy(`t.${order}`, dir);

  if (showPgColumns) {
    query = query.leftJoin("payout_gateway as pg", "t.pg_id", "pg.pg_id");
  }

  if (limit) query = query.limit(limit).offset(skip || 0);
  // console.log(query.toString());
  return query;
};

export const getTransactionHistory = ({ id, skip, limit, totalRecords }: PaginationParams) => {
  const logColumns = [
    knexRead.raw(`row_number() over (partition by t.transaction_id order by t.created_at) as version`),
    "au.username as updated_by",
    "t.status",
    "t.mt5_status",
    "t.payout_status",
    "t.admin_message",
    "t.payout_message",
    "t.mt5_message",
    "t.api_error",
    knexRead.raw("t.pg_id::text as pg_id"),
    "t.payment_status",
    "t.payment_fail_count",
    "t.payment_req_method",
    "t.utr_id",
    "t.payment_creation_date",
    "t.payment_order_id",
    knexRead.raw("t.pg_task::text as pg_task"),
    knexRead.raw("t.pg_order_id::text"),

    // PG
    "pg.pg_label",

    // logs
    // knexRead.raw("cast(t.created_on as text) as updated_at"),
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
    .leftJoin("payout_gateway as pg", knexRead.raw("CAST(t.pg_id as uuid) = pg.pg_id"))
    .leftJoin("admin_user as au", knexRead.raw("CAST(t.updated_by as uuid) = au.user_id"))
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
        .leftJoin("payout_gateway as pg", knexRead.raw("CAST(t.pg_id as uuid) = pg.pg_id"))
        .leftJoin("admin_user as au", knexRead.raw("CAST(t.updated_by as uuid) = au.user_id"))
        .where("t.transaction_id", id);
    }, true)
    .orderBy("version", "asc");

  if (limit) query = query.limit(limit).offset(skip || 0);
  // console.log(query.toString());
  return query;
};

export const getDetailedTransactionByFilter = async (filter: {
  transaction_id: string;
  "t.username": string;
}): Promise<Withdraw | null> => {
  const columns = [
    "t.transaction_id",
    "t.username",
    "t.amount",
    "t.date",
    "t.transaction_type",
    "t.status",
    "t.api_error",
    "t.created_at",
    "t.updated_at",
    "t.is_deleted",
    "t.pg_task",

    // admin
    "cb.username as created_by",
    "ub.username as updated_by",

    // pg related
    "t.pg_order_id",
    "t.payment_status",
    "t.payment_fail_count",
    "t.payment_req_method",
    "t.utr_id",
    "t.payment_creation_date",
    "t.payment_order_id",

    // payment gateway
    "pg.pg_label",
    "pg.nickname",

    // extra columns
    "t.ip",
  ];

  const query = knexRead(`${tablename} as t`)
    .select(columns)
    .where(filter)
    .join("customer as cb", "t.customer_id", "cb.customer_id")
    .join("admin_user as ub", "t.updated_by", "ub.user_id")
    .leftJoin("payout_gateway as pg", "t.pg_id", "pg.pg_id")
    .first();
  // console.log(query.toString());
  return query;
};

export const getTotalAmountBetweenDates = (
  start_date: string,
  end_date: string,
  panel_id?: string
): Promise<{ total: string }> => {
  const columns = [knexRead.raw("coalesce(sum(amount::numeric), 0) as total")];

  let query = knexRead(tablename)
    .select(columns)
    .whereBetween("created_at", [start_date, end_date])
    .whereIn("status", [Status.SUCCESS, Status.ACKNOWLEDGED])
    .first();
  if (panel_id) query = query.where({ panel_id });

  // console.log(query.toString());
  return query;
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
}: PaginationParams): Promise<Partial<Withdraw>[] | count> => {
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
    "t.payout_status",
    "t.mt5_status",
    "t.payout_message",
    "t.mt5_message",
    "t.admin_message",

    "t.api_error",
    "t.created_at",
    "t.updated_at",
    "t.is_deleted",
    "t.pg_task",
    "t.dealid",
    "t.margin",
    "t.freemargin",
    "t.equity",

    // customer
    "c.phone_number",
    "c.username",

    // customer payment methods
    "cpm.bank_name",
    "cpm.account_name",
    "cpm.account_number",
    "cpm.ifsc",
  ];
  if (showPgColumns) {
    columns.push("t.pg_order_id");
    columns.push("t.payment_status");
    columns.push("t.payment_fail_count");
    columns.push("t.payment_req_method");
    columns.push("t.utr_id");
    columns.push("t.payment_creation_date");
    columns.push("t.payment_order_id");

    // payment gateway
    columns.push("pg.pg_label");
    columns.push("pg.nickname");
  }

  let query = knexRead(`${tablename} as t`)
    .select(columns)
    .where(filter)
    .join("customer as c", "t.customer_id", "c.customer_id")
    // .leftJoin("admin_user as ub", "t.updated_by", "ub.user_id")
    .join("customer_payment_method as cpm", "t.payment_method_id", "cpm.payment_method_id")
    .orderBy(`t.${order}`, dir);

  if (showPgColumns) {
    query = query.leftJoin("payout_gateway as pg", "t.pg_id", "pg.pg_id");
  }
  if (from_date && to_date) {
    query = query.whereBetween("t.created_at", [from_date, to_date]);
  }

  if (limit) query = query.limit(limit).offset(skip || 0);
  // console.log(query.toString());
  return query;
};
