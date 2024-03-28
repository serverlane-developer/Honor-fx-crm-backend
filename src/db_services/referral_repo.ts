import { v4 as uuidv4 } from "uuid";
import { Knex } from "knex";

import { trx, count } from "../@types/Knex";
import { Referral } from "../@types/database";

import { knex, knexRead } from "../data/knex";
import helpers from "../helpers/helpers";
import { PaginationParams } from "../@types/Common";

const tablename = "referral";

export const createReferral = async (
  object: Partial<Referral>,
  referral_id: string = uuidv4(),
  { trx }: trx = {}
): Promise<Referral> => {
  object.referral_id = referral_id;
  const query = (trx || knex)(tablename).returning("*").insert(object);
  const result = await query;
  return result?.[0] as unknown as Referral;
};

export const getReferralById = async (referral_id: string, { trx }: trx = {}): Promise<Referral | null> => {
  if (!referral_id) throw new Error("Referral ID is required");
  const query = (trx || knexRead)(tablename).where({ referral_id }).where({ is_deleted: false }).select("*").first();
  return query;
};

export const getReferralByFilter = async (filter: Partial<Referral>, { trx }: trx = {}): Promise<Referral | null> => {
  const query = (trx || knexRead)(tablename).select("*").where(filter).first();
  // console.log(query.toString());
  return query;
};

export const getReferralByName = async (role_name: string, { trx }: trx = {}): Promise<Referral | null> => {
  const query = (trx || knexRead)(tablename).select("*").whereRaw(`lower(role_name) = ?`, [role_name]).first();
  // console.log(query.toString());
  return query;
};

export const getAllReferrals = async ({
  limit,
  skip,
  totalRecords = false,
}: PaginationParams): Promise<Partial<Referral>[] | count> => {
  if (totalRecords) {
    const countQuery = knexRead(tablename).select(knexRead.raw("count(referral_id) as count")).first();
    return countQuery;
  }
  const columns = [
    "r.referral_id",
    "r.referral_code",
    "r.is_deleted",
    "r.created_at",
    "r.updated_at",
    "cb.username",
    "cb.email",
    "ub.username as updated_by",
    knexRead.raw("(select count(*) from customer as c where c.referral_id = r.referral_id limit 1)  as customer_count"),
  ];
  let query = knexRead(`${tablename} as r`)
    .select(columns)
    .join("admin_user as cb", "r.user_id", "cb.user_id")
    .leftJoin("admin_user as ub", "r.updated_by", "ub.user_id")
    .orderBy("r.created_at", "asc");

  if (limit) query = query.limit(limit).offset(skip || 0);
  // console.log(query.toString());
  return query;
};

export const updateReferral = async (
  filter: Partial<Referral>,
  update: Partial<Referral>,
  { trx }: trx = {}
): Promise<Referral | null> => {
  const query: Knex.QueryBuilder<Referral, Referral[]> = (trx || knex)<Referral>(tablename)
    .returning("*")
    .where(filter)
    .update(update);
  const result = await query;
  return result[0] as unknown as Referral;
};

export const softDeleteReferral = async (filter: Partial<Referral>, { trx }: trx = {}): Promise<void> => {
  return (trx || knex)(tablename).returning("*").where(filter).update({ is_deleted: true });
};

export const getUniqueReferralCode = async ({ trx }: trx = {}, retry: number = 0): Promise<string> => {
  if (!trx) throw new Error("Knex Transaction is required");
  const referral_code = helpers.generatePassword(4, { upper: true, lower: false, num: false, special: false });

  const codeExists = await trx(tablename).select("*").where({ referral_code }).first();
  if (!codeExists) return referral_code;
  if (retry < 5) return getUniqueReferralCode({ trx }, retry + 1);
  throw new Error("Error while getting Unique Referral CODE");
};

export const getCustomersByReferralId = ({
  limit = 10,
  skip = 0,
  // order = `created_at`,
  // dir = "asc",
  searchText = null,
  from_date,
  to_date,
  totalRecords = false,
  referral_id,
}: PaginationParams): Promise<Referral[] | count> => {
  const columns = ["c.customer_id", "c.username", "c.phone_number", "c.last_login_at", "c.created_at"];

  let query = knexRead(`customer as c`);

  if (totalRecords) {
    let countQuery = query.select(knexRead.raw("count(c.customer_id) as count")).where({ referral_id });
    if (searchText) {
      countQuery = countQuery.whereRaw(`c.phone_number LIKE ?`, [searchText]);
    }
    countQuery = countQuery.first();
    // console.log(countQuery.toString());
    return countQuery;
  }

  query = query.select(columns).where({ referral_id }).orderBy("c.created_at", "asc");

  if (searchText) {
    query = query.whereRaw(`c.phone_number LIKE ?`, [searchText]);
  }

  if (from_date && to_date) {
    query = query.whereBetween("c.created_at", [from_date, to_date]);
  }

  if (limit) query = query.limit(limit).offset(skip || 0);
  // console.log(query.toString());
  return query;
};
