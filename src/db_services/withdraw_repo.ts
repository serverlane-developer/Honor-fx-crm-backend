import { v4 as uuidv4 } from "uuid";
import { Knex } from "knex";

import { count, trx } from "../@types/Knex";
import { Withdraw } from "../@types/database";

import { knex, knexRead } from "../data/knex";

import { PaginationParams } from "../@types/Common";
import { Status } from "../@types/database/Withdraw";
import { encrypt } from "../helpers/cipher";

const tablename = "withdraw";

export const statusForList: Record<string, Record<string, string | boolean>> = {
  pending: { status: Status.PENDING, pg_task: false },
  success: { status: Status.SUCCESS },
  failed: { status: Status.FAILED },
  processing: { status: Status.PENDING, pg_task: true },
  refund: { status: Status.REFUND },
  acknowledged: { status: Status.ACKNOWLEDGED },
};

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
  search = "",
  panel_id,
  customer,
}: PaginationParams): Promise<Partial<Withdraw>[] | count> => {
  const statusExists = status in statusForList;
  if (status && !statusExists) throw new Error("Status is not configured for list");

  const statusFilter = statusForList[status];

  // const searchColumns = ["account_name", "account_number"];

  const encryptedText = search ? encrypt(search) : "";
  const customerFilter = customer ? { ...customer } : {};
  // const searchTexts = Array.from({ length: searchColumns.length }, () => `%${encryptedText}%`);

  if (totalRecords) {
    let countQuery = knexRead(tablename)
      .select(knexRead.raw("count(transaction_id) as count"))
      .where({ ...statusFilter, panel_id, ...customerFilter })
      .first();

    if (search) {
      // countQuery = countQuery.whereRaw(`${searchColumns.join(" iLIKE ? or ")} iLIKE ?`, searchTexts);

      countQuery = countQuery.whereRaw(
        "account_number iLIKE ? OR account_name iLIKE ? OR utr_id iLIKE ? OR pg_order_id::text iLIKE ?",
        [`%${encryptedText}%`, `%${encryptedText}%`, `%${search}%`, `%${search}%`]
      );
    }

    return countQuery;
  }
  const showPgColumns = ![Status.PENDING, Status.FAILED].includes(status);
  const columns = [
    "t.transaction_id",
    "t.source_id",
    "t.username",
    "t.account_name",
    "t.account_number",
    "t.ifsc",
    "t.amount",
    "t.date",
    "t.transaction_type",
    "t.status",
    "t.api_error",
    "t.message",
    "t.created_at",
    "t.updated_at",
    "t.is_deleted",
    "t.pg_task",

    // admin
    "cb.username as created_by",
    "ub.username as updated_by",
  ];
  if (showPgColumns) {
    columns.push("t.rpa_status");
    columns.push("t.rpa_message");
    columns.push("t.is_receipt_uploaded");
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
    .where({ ...statusFilter, ...customerFilter, panel_id })
    .join("admin_user as cb", "t.created_by", "cb.user_id")
    .join("admin_user as ub", "t.updated_by", "ub.user_id")
    .orderBy(`t.${order}`, dir);

  if (showPgColumns) {
    query = query.leftJoin("payout_gateway as pg", "t.pg_id", "pg.pg_id");
  }

  if (search) {
    // query = query.whereRaw(`${searchColumns.join(" iLIKE ? or ")} iLIKE ?`, searchTexts);
    query = query.whereRaw(
      "t.account_number iLIKE ? OR t.account_name iLIKE ? OR t.utr_id iLIKE ? OR t.pg_order_id::text iLIKE ?",
      [`%${encryptedText}%`, `%${encryptedText}%`, `%${search}%`, `%${search}%`]
    );
  }

  if (limit) query = query.limit(limit).offset(skip || 0);
  // console.log(query.toString());
  return query;
};

export const getTransactionsByRpaStatus = async ({
  limit,
  skip,
  totalRecords = false,
  rpa_status = null,
  order = "updated_at",
  dir,
  search = "",
}: PaginationParams): Promise<Partial<Withdraw>[] | count> => {
  const encryptedText = search ? encrypt(search) : "";

  if (totalRecords) {
    let countQuery = knexRead(tablename)
      .select(knexRead.raw("count(transaction_id) as count"))
      .where({ rpa_status })
      .first();

    if (search) {
      // countQuery = countQuery.whereRaw(`${searchColumns.join(" iLIKE ? or ")} iLIKE ?`, searchTexts);

      countQuery = countQuery.whereRaw(
        "account_number iLIKE ? OR account_name iLIKE ? OR utr_id iLIKE ? OR pg_order_id::text iLIKE ?",
        [`%${encryptedText}%`, `%${encryptedText}%`, `%${search}%`, `%${search}%`]
      );
    }

    return countQuery;
  }
  const columns = [
    "t.transaction_id",
    "t.source_id",
    "t.username",
    "t.account_name",
    "t.account_number",
    "t.ifsc",
    "t.amount",
    "t.date",
    "t.transaction_type",
    "t.status",
    "t.message",
    "t.api_error",
    "t.message",
    "t.ip",
    "t.created_by",
    "t.updated_by",
    "t.created_at",
    "t.updated_at",
    "t.is_deleted",
    "t.pg_id",
    "t.payment_status",
    "t.payment_fail_count",
    "t.payment_req_method",
    "t.utr_id",
    "t.payment_creation_date",
    "t.payment_order_id",
    "t.pg_task",
    "t.pg_order_id",
    "t.rpa_status",
    "t.rpa_message",
    "t.is_receipt_uploaded",

    // admin
    "cb.username as created_by",
    "ub.username as updated_by",

    // payment gateway
    "pg.pg_label",

    // ...searchColumns,
  ];
  let query = knexRead(`${tablename} as t`)
    .select(columns)
    .where({ rpa_status })
    .leftJoin("payout_gateway as pg", "t.pg_id", "pg.pg_id")
    .join("admin_user as cb", "t.created_by", "cb.user_id")
    .join("admin_user as ub", "t.updated_by", "ub.user_id")
    .orderBy(`t.${order}`, dir);

  if (search) {
    // query = query.whereRaw(`${searchColumns.join(" iLIKE ? or ")} iLIKE ?`, searchTexts);
    query = query.whereRaw(
      "t.account_number iLIKE ? OR t.account_name iLIKE ? OR t.utr_id iLIKE ? OR t.pg_order_id::text iLIKE ?",
      [`%${encryptedText}%`, `%${encryptedText}%`, `%${search}%`, `%${search}%`]
    );
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
    "t.message",
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
    "t.is_receipt_uploaded",

    // PG
    "pg.pg_label",

    // rpa
    "t.rpa_status",
    "t.rpa_message",

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
        .leftJoin("payout_gateway as pg", knexRead.raw("CAST(t.pg_id as uuid) = pg.pg_id"))
        .join("admin_user as au", knexRead.raw("CAST(t.updated_by as uuid) = au.user_id"))
        .where("t.transaction_id", id);
    }, true)
    .orderBy("version", "asc");

  if (limit) query = query.limit(limit).offset(skip || 0);
  // console.log(query.toString());
  return query;
};

export const getTransactionCountForPanels = (panel_ids: string[], status: "pending" | "processing") => {
  const statusExists = status in statusForList;
  if (status && !statusExists) throw new Error("Status is not configured for list");

  const statusFilter = statusForList[status];

  const query = knexRead(tablename)
    .select(knexRead.raw("count(transaction_id) as count"))
    .where(statusFilter)
    .whereIn("panel_id", panel_ids)
    .first();
  // console.log(query.toString());
  return query;
};

export const getTransactionStatsForPanel = (panel_id: string, status: Status) => {
  const statusExists = status in statusForList;
  if (status && !statusExists) throw new Error("Status is not configured for list");

  const statusFilter = statusForList[status];

  const query = knexRead(tablename)
    .select(knexRead.raw("count(transaction_id) as count"))
    .where({ ...statusFilter, panel_id })
    .first();

  // console.log(query.toString());
  return query;
};

export const getDetailedTransactionByFilter = async (filter: {
  transaction_id: string;
  "t.username": string;
}): Promise<Withdraw | null> => {
  const columns = [
    "t.transaction_id",
    "t.source_id",
    "t.username",
    "t.account_name",
    "t.account_number",
    "t.ifsc",
    "t.amount",
    "t.date",
    "t.transaction_type",
    "t.status",
    "t.api_error",
    "t.message",
    "t.created_at",
    "t.updated_at",
    "t.is_deleted",
    "t.pg_task",

    // admin
    "cb.username as created_by",
    "ub.username as updated_by",

    // pg related
    "t.rpa_status",
    "t.rpa_message",
    "t.is_receipt_uploaded",
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
    .join("admin_user as cb", "t.created_by", "cb.user_id")
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
