import { v4 as uuidv4 } from "uuid";
import { Knex } from "knex";

import { count, trx } from "../@types/Knex";
import { Customer } from "../@types/database";

import { knex, knexRead } from "../data/knex";

import { PaginationParams } from "../@types/Common";
import { CustomerTransactions } from "../@types/database/Customer";

const tablename = "customer";

export const createCustomer = async (
  object: Partial<Customer>,
  customer_id?: string,
  { trx }: trx = {}
): Promise<Customer | null> => {
  object.customer_id = customer_id || uuidv4();
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
  search,
}: PaginationParams): Promise<Partial<Customer>[] | count> => {
  if (totalRecords) {
    let countQuery = knexRead(tablename).select(knexRead.raw("count(customer_id) as count")).first();
    if (search) {
      countQuery = countQuery.whereRaw("c.username iLIKE ? OR c.phone_number iLIKE ?", [`%${search}%`, `%${search}%`]);
    }
    return countQuery;
  }
  const columns = ["c.*"];
  let query = knexRead(`${tablename} as c`).select(columns).orderBy("c.created_at", "desc");

  if (search) {
    query = query.whereRaw("c.username iLIKE ? OR c.phone_number iLIKE ?", [`%${search}%`, `%${search}%`]);
  }
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

export const getCustomerTransactions = ({
  limit,
  skip,
  totalRecords = false,
  order = "updated_at",
  dir = "desc",
  customer_id,
  status,
  type,
}: PaginationParams): Promise<CustomerTransactions[] | count> => {
  const commonCols = ["t.transaction_id", "t.amount", "t.created_at", "t.updated_at", "t.status"];

  const allowedTypes = ["withdraw", "deposit"];

  if (type && !allowedTypes.includes(type)) throw new Error("Invalid Transaction Type");

  const withdrawCols = [...commonCols, "pg_task", knexRead.raw("'withdraw' as transaction_type")];
  const depositCols = [
    ...commonCols,
    knexRead.raw("'false' as pg_task"),
    knexRead.raw("'deposit' as transaction_type"),
  ];

  const filterObject = {
    customer_id,
  };

  const withdrawFilter = {
    ...filterObject,
    ...(status && { status }),
  };

  const depositFilter = {
    ...filterObject,
    ...(status && { status }),
  };

  if (totalRecords) {
    const col = [knexRead.raw("count(transaction_id) as count")];
    const withdrawQuery = knexRead("withdraw")
      .select([...col, knexRead.raw("'withdraw' as type")])
      .where(withdrawFilter);
    const depositQuery = knexRead("deposit")
      .select([...col, knexRead.raw("'deposit' as type")])
      .where(depositFilter);

    const unionQuery = !type
      ? knexRead.union([withdrawQuery, depositQuery])
      : type === "withdraw"
      ? withdrawQuery
      : depositQuery;
    const countQuery = knexRead(unionQuery.as("transactions")).select(knexRead.raw("sum(count) as count")).first();
    // console.log(countQuery.toString());

    return countQuery;
  }

  const withdrawQuery = knexRead("withdraw as t").select(withdrawCols).where(withdrawFilter);

  const depositQuery = knexRead("deposit as t").select(depositCols).where(depositFilter);

  let unionQuery = !type
    ? knexRead.union([withdrawQuery, depositQuery])
    : type === "withdraw"
    ? withdrawQuery
    : depositQuery;

  unionQuery = unionQuery.orderBy(order, dir);
  if (limit) unionQuery = unionQuery.limit(limit).offset(skip || 0);
  // console.log(unionQuery.toString());
  return unionQuery;
};
