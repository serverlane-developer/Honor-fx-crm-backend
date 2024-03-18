import { Knex } from "knex";

export interface trx {
  trx?: Knex.Transaction | null;
}

export interface count {
  count: number;
}
