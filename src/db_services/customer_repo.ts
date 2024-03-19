import { v4 as uuidv4 } from "uuid";
import { Knex } from "knex";

import { count, trx } from "../@types/Knex";
import { Customer } from "../@types/database";

import { knex, knexRead } from "../data/knex";

import { PaginationParams } from "../@types/Common";

const tablename = "customer";

export const createCustomer = async (
  object: Partial<Customer>,
  customer_id: string = uuidv4(),
  { trx }: trx = {}
): Promise<Customer | null> => {
  object.customer_id = customer_id;
  const query = (trx || knex)(tablename).returning("*").insert(object);
  const result = await query;
  return result?.[0] as unknown as Customer;
};

export const getCustomerById = async (customer_id: string, { trx }: trx = {}): Promise<Customer | null> => {
  if (!customer_id) throw new Error("Customer ID is required");
  const query = (trx || knexRead)(tablename).where({ customer_id }).where({ is_deleted: false }).select("*").first();
  return query;
};

export const getAllCustomers = async ({
  limit,
  skip,
  totalRecords = false,
}: PaginationParams): Promise<Partial<Customer>[] | count> => {
  if (totalRecords) {
    const countQuery = knexRead(tablename).select(knexRead.raw("count(customer_id) as count")).first();
    return countQuery;
  }
  const columns = ["c.*", "cb.username as created_by", "ub.username as updated_by"];
  let query = knexRead(`${tablename} as c`)
    .select(columns)
    .leftJoin("admin_user as cb", "c.created_by", "cb.customer_id")
    .leftJoin("admin_user as ub", "c.updated_by", "ub.customer_id")
    .orderBy("c.updated_at", "desc");

  if (limit) query = query.limit(limit).offset(skip || 0);
  // console.log(query.toString());
  return query;
};

export const getCustomer2faStatusById = async (customer_id: string, { trx }: trx = {}): Promise<Customer | null> => {
  if (!customer_id) throw new Error("Customer ID is required");
  const query = (trx || knexRead)(tablename)
    .where({ customer_id })
    .where({ is_deleted: false })
    .select(["is_2fa_enabled as is_enabled"])
    .first();
  return query;
};

export const getCustomerByFilter = async (filter: Partial<Customer>, { trx }: trx = {}): Promise<Customer | null> => {
  const query = (trx || knexRead)(tablename).select("*").where(filter).first();
  // console.log(query.toString());
  return query;
};

export const updateCustomer = async (
  filter: Partial<Customer>,
  update: Partial<Customer>,
  { trx }: trx = {}
): Promise<Customer | null> => {
  const query: Knex.QueryBuilder<Customer, Customer[]> = (trx || knex)<Customer>(tablename)
    .returning("*")
    .where(filter)
    .update(update);
  const result = await query;
  return result[0] as unknown as Customer;
};

export const softDeleteCustomer = async (filter: Partial<Customer>, { trx }: trx = {}): Promise<void> => {
  return (trx || knex)(tablename).returning("*").where(filter).update({ is_deleted: true });
};
