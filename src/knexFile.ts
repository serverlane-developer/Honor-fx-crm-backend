import { Knex } from "knex";
import config from "./config";

const configuration: Knex.Config = {
  client: "pg",
  connection: {
    host: config.DB_WRITER_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_DATABASE,
  },
  migrations: {
    extension: "ts",
    directory: ["./data/migrations", "./data/migrations/logs", "./data/migrations/triggers"],
  },
  seeds: { directory: "./data/seeds" },
};

export default configuration;
