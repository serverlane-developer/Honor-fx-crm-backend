import { Response } from "express";
import config from "./config";
import logger from "./utils/logger";

import app from "./app";

import gracefulShutdown from "./utils/gracefulShutdown";
import { migrate } from "./migrate";
import { Request } from "./@types/Express";

app.use((err: unknown, req: Request, res: Response) => {
  logger.error("SOMETHING BROKE", { requestId: req?.requestId, err });
  return res.status(500).json({ status: false, message: "Something BROKE!", data: null });
});

const server = app.listen(config.PORT, async () => {
  logger.info("Server Started", { port: config.PORT, requestId: "listen" });
  await migrate();
});

// Handle unhandled promise rejections
process.on("unhandledRejection", async (err) => {
  logger.error("UNHANDLED REJECTION! 💥 Shutting down...", { err, requestId: "unhandledRejection" });
  await gracefulShutdown(server);
});

// Graceful shutdown on SIGINT and SIGTERM signals
["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, async () => {
    logger.warn(`Received ${signal} signal. Shutting down...`, { requestId: "exit" });
    await gracefulShutdown(server);
  });
});
