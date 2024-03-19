import { v4 as uuidv4 } from "uuid";
import { count, trx } from "../@types/Knex";
import { CustomerLoginLog } from "../@types/database";

import { knex, knexRead } from "../data/knex";

interface getLoginHistoryType {
  customer_id: string;
  limit: number | null;
  skip: number | null;
  totalRecords?: boolean;
}

const tableName = "customer_login_log";

export const addLoginRecord = async (loginObject: Partial<CustomerLoginLog>, { trx }: trx = {}) => {
  const query = (trx || knex)(tableName)
    .returning("*")
    .insert({
      customer_login_log_id: uuidv4(),
      ...loginObject,
    });
  return query;
};

export const getLoginHistory = async ({
  customer_id,
  limit,
  skip,
  totalRecords = false,
}: getLoginHistoryType): Promise<Array<Partial<CustomerLoginLog>> | count> => {
  if (totalRecords) {
    const countQuery = knexRead(tableName)
      .select(knexRead.raw("count(customer_login_log_id) as count"))
      .where({
        customer_id,
      })
      .first();
    return countQuery;
  }

  const columns = [
    "customer_login_log_id",
    "ip",
    "login_device",
    "attempt_type",
    "two_factor_authenticated",
    "is_attempt_success",
    "message",
    "created_at",
  ];

  let query = knexRead.select(columns).from(tableName).where({ customer_id }).orderBy("created_at", "desc");
  if (limit) query = query.limit(limit).offset(skip || 0);

  return query;
};
