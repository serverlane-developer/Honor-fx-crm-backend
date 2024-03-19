import { v4 as uuidv4 } from "uuid";
import { Knex } from "knex";

import { trx } from "../@types/Knex";
import { CustomerPaymentMethod } from "../@types/database";

import { knex, knexRead } from "../data/knex";

const tablename = "customer_payment_method";

export const createPaymentMethod = async (
  object: Partial<CustomerPaymentMethod>,
  payment_method_id: string = uuidv4(),
  { trx }: trx = {}
): Promise<CustomerPaymentMethod | null> => {
  object.payment_method_id = payment_method_id;
  const query = (trx || knex)(tablename).returning("*").insert(object);
  const result = await query;
  return result?.[0] as unknown as CustomerPaymentMethod;
};

export const getPaymentMethodById = async (
  payment_method_id: string,
  { trx }: trx = {}
): Promise<CustomerPaymentMethod | null> => {
  if (!payment_method_id) throw new Error("Payment Method ID is required");
  const query = (trx || knexRead)(tablename)
    .where({ payment_method_id })
    .where({ is_deleted: false })
    .select("*")
    .first();
  return query;
};

export const getPaymentMethodByFilter = async (
  filter: Partial<CustomerPaymentMethod>,
  { trx }: trx = {}
): Promise<CustomerPaymentMethod | null> => {
  const query = (trx || knexRead)(tablename).select("*").where(filter).first();
  // console.log(query.toString());
  return query;
};

export const getPaymentMethodsByFilter = async (
  filter: Partial<CustomerPaymentMethod>,
  { trx }: trx = {}
): Promise<CustomerPaymentMethod[]> => {
  const query = (trx || knexRead)(tablename).select("*").where(filter);
  // console.log(query.toString());
  return query;
};

export const updatePaymentMethod = async (
  filter: Partial<CustomerPaymentMethod>,
  update: Partial<CustomerPaymentMethod>,
  { trx }: trx = {}
): Promise<CustomerPaymentMethod | null> => {
  const query: Knex.QueryBuilder<CustomerPaymentMethod, CustomerPaymentMethod[]> = (trx || knex)<CustomerPaymentMethod>(
    tablename
  )
    .returning("*")
    .where(filter)
    .update(update);
  const result = await query;
  return result[0] as unknown as CustomerPaymentMethod;
};

export const softDeletePaymentMethod = async (
  filter: Partial<CustomerPaymentMethod>,
  { trx }: trx = {}
): Promise<void> => {
  return (trx || knex)(tablename).returning("*").where(filter).update({ is_deleted: true });
};
