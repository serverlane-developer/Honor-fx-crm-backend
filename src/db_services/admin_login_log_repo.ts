import { v4 as uuidv4 } from "uuid";
import { count, trx } from "../@types/Knex";
import { AdminLoginLog } from "../@types/database";

import { knex, knexRead } from "../data/knex";

interface getLoginHistoryType {
  user_id: string;
  limit: number | null;
  skip: number | null;
  totalRecords?: boolean;
}

const tableName = "admin_login_log";

export const addLoginRecord = async (loginObject: Partial<AdminLoginLog>, { trx }: trx = {}) => {
  const query = (trx || knex)(tableName)
    .returning("*")
    .insert({
      admin_login_log_id: uuidv4(),
      ...loginObject,
    });
  return query;
};

export const getLoginHistory = async ({
  user_id,
  limit,
  skip,
  totalRecords = false,
}: getLoginHistoryType): Promise<Array<Partial<AdminLoginLog>> | count> => {
  if (totalRecords) {
    const countQuery = knexRead(tableName)
      .select(knexRead.raw("count(admin_login_log_id) as count"))
      .where({
        user_id,
      })
      .first();
    return countQuery;
  }

  const columns = [
    "admin_login_log_id",
    "ip",
    "login_device",
    "attempt_type",
    "two_factor_authenticated",
    "attempt_success",
    "attempt_status_char",
    "created_at",
  ];

  let query = knexRead.select(columns).from(tableName).where({ user_id }).orderBy("created_at", "desc");
  if (limit) query = query.limit(limit).offset(skip || 0);

  return query;
};
