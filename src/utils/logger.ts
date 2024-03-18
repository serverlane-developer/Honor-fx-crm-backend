/* eslint-disable @typescript-eslint/no-explicit-any */
import winston, { LoggerOptions } from "winston";

import config from "../config";

import { getLogObject } from "../helpers/logHelpers";
import { LOG_FORMAT, LOG_FORMATS, LevelKeys, Levels, LogLevel, LogObject } from "../@types/Logger";

// Define your severity levels.
// With them, You can create log files,
// see or hide levels based on the running ENV.

const levels: Levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  silly: 5,
};

const levelsArray: LevelKeys[] = Object.keys(levels) as LevelKeys[];

const LOG_LEVEL: LogLevel = config.LOG_LEVEL;

const level: LogLevel = levelsArray.includes(LOG_LEVEL) ? LOG_LEVEL : "http";

// Create the logger instance that has to be exported and used to log messages.
const transports = [
  new winston.transports.Console(),
  ...(config.LOG_TO_FILE
    ? [
        new winston.transports.File({
          filename: "winston_logs/error.log",
          level: "error",
        }),
        new winston.transports.File({ filename: "winston_logs/all.log" }),
      ]
    : []),
];

const LOG_FORMATS: LOG_FORMATS = {
  JSON: winston.format.json(),
  PRETTY_PRINT: winston.format.prettyPrint(),
};

const getLogFormat = () =>
  Object.keys(LOG_FORMATS).includes(config.LOG_FORMAT) ? (config.LOG_FORMAT as LOG_FORMAT) : "PRETTY_PRINT";

const loggerOptions: LoggerOptions = {
  level,
  levels,
  format: LOG_FORMATS[getLogFormat()],
  transports,
};

const winstonLogger = winston.createLogger(loggerOptions);

const logger = {
  error: (message: string, data: LogObject) => winstonLogger.error(message, getLogObject(data)),
  warn: (message: string, data: LogObject) => winstonLogger.warn(message, getLogObject(data)),
  info: (message: string, data: LogObject) => winstonLogger.info(message, getLogObject(data)),
  http: (message: string, data: LogObject) => winstonLogger.http(message, getLogObject(data)),
  debug: (message: string, data: LogObject) => winstonLogger.debug(message, getLogObject(data)),
  silly: (message: string, data: LogObject) => winstonLogger.silly(message, getLogObject(data)),
};

export default logger;
