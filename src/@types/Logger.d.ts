/* eslint-disable @typescript-eslint/no-explicit-any */
import winston from "winston";

export interface Levels extends winston.config.AbstractConfigSetLevels {
  error: number;
  warn: number;
  info: number;
  http: number;
  debug: number;
  silly: number;
}

export type LogLevel = "error" | "warn" | "info" | "http" | "debug" | "silly";

export type LogLevels = readonly LogLevel[];

export type LevelKeys = keyof Levels;

export type LOG_FORMAT = "PRETTY_PRINT" | "JSON";

export interface LOG_FORMATS {
  JSON: winston.Logform.Format;
  PRETTY_PRINT: winston.Logform.Format;
}

export interface LogObject {
  [key: string]: any;
  requestId: string | undefined;
}
