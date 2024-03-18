import { knex } from "./data/knex";
import logger from "./utils/logger";
import knexFile from "./knexFile";

const requestId = "knex-migrations";

async function migrate() {
  logger.info("Running migrations...", { requestId });
  let directory = (knexFile.migrations?.directory || []) as string[];

  // yarn migrate considers src as root
  // migrate function cannot find data in root, that's why need to rename directory in knexfile to use src as parent dir
  directory = directory.map((x) => `./src${x.replace(".", "")}`);

  try {
    await knex.migrate
      .latest({
        directory,
        // extension,
      })
      .then((result) => {
        const [, log] = result;
        const count = log.length;
        if (!log.length) {
          logger.info("Database is already up to date", { requestId });
        } else {
          logger.info("Ran migrations:>> ", { requestId });
          for (let i = 0; i < count; i++) {
            logger.info(i + 1 + "=> " + log[i], { requestId });
          }
          logger.info(`Ran Migration Count: ${count}`, { count, requestId });
        }
      });
    logger.info("Ran migrations: Finish", { requestId });
  } catch (error) {
    logger.warn("Database migration Error!!", { error, requestId });
  }
}

export { migrate };
