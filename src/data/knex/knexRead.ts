import knex from "knex";
import configuration from "../../knexFile";
import config from "../../config";

const configOptions = JSON.parse(JSON.stringify(configuration));
configOptions.connection.host = config.DB_READER_HOST;

export default knex(configuration);
