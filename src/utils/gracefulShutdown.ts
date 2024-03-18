import { Server } from "http";
import logger from "./logger";

const gracefulShutdown = async (server: Server) => {
  try {
    server.close();
    process.exit();
  } catch (error: Error | unknown) {
    logger.error("Error during Graceful Shutdown", { err: error, requestId: "shoutdown" });
    process.exit(1);
  }
};

export default gracefulShutdown;
