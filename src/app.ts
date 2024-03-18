import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import useragent from "express-useragent";

import morgan from "./middleware/morgan";

import assignId from "./middleware/assignId";

import healthRoute from "./routes/health";
import routes from "./routes";

const app: Application = express();

// disable `X-Powered-By` header that reveals information about the server
app.disable("x-powered-by");
app.enable("trust proxy");

// set security HTTP headers
app.use(helmet());
app.use(useragent.express());

// parse json request body
app.use(express.json());

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
