import { Knex } from "knex";

import knexWriteInstance from "./knexWrite";
import knexReadInstance from "./knexRead";

export const knex: Knex = knexWriteInstance;
export const knexRead: Knex = knexReadInstance;
