import express, { Application, NextFunction, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import useragent from "express-useragent";

import morgan from "./middleware/morgan";

import assignId from "./middleware/assignId";

import healthRoute from "./routes/health";
import routes from "./routes";
import logger from "./utils/logger";
import { Request } from "./@types/Express";

const app: Application = express();

// disable `X-Powered-By` header that reveals information about the server
app.disable("x-powered-by");
app.enable("trust proxy");

// set security HTTP headers
app.use(helmet());
app.use(useragent.express());

function handleJsonSyntaxError(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof SyntaxError && "body" in err && "status" in err && err.status === 400) {
    logger.error("Invalid JSON", { requestId: req.requestId });
    return res.status(400).json({ status: false, data: null, message: "Invalid JSON" });
  }
  next();
}

// parse json request body
app.use(express.json());

app.use(handleJsonSyntaxError);

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// enable cors
app.use(cors());
app.options("*", cors());

app.use(express.static("public"));

// log endpoints
app.use(assignId);
app.use(morgan);

app.use("/health", healthRoute);

app.use("/api", routes);

export default app;
