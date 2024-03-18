import morgan from "morgan";
import json from "morgan-json";

import logger from "../utils/logger";
import { Request } from "../@types/Express";

const format = json({
  requestId: ":requestId",
  from: ":remote-addr",
  method: ":method",
  URL: ":url",
  status: ":status",
  contentLength: ":res[content-length]",
  responseTime: ":response-time",
});

const urlsToSkip = ["/health", "/favicon.ico", "/"];
const methodsToSkip = ["OPTIONS"];

const skip = (req: Request) => urlsToSkip.includes(req.originalUrl) || methodsToSkip.includes(req.method);
morgan.token("requestId", (req: Request) => req.requestId);

const morganMiddleware = morgan(format, {
  stream: { write: (message) => logger.http("", JSON.parse(message)) },
  skip,
});

export default morganMiddleware;
