/* eslint-disable @typescript-eslint/no-explicit-any */
import _ from "lodash";
import axios, { AxiosError } from "axios";
import { LogObject } from "../@types/Logger";
import config from "../config";

function getlogged_line() {
  try {
    const logged_line_arr = new Error().stack?.split("\n");
    const estimated_index = 4;
    const max_length = logged_line_arr?.length || 0;
    const index = max_length - 1 < 4 ? max_length : estimated_index;

    let logged_line = (logged_line_arr || ["unknown"])[index];
    if (logged_line) {
      logged_line = logged_line.replace("    at", "").replace("(", "").replace(")", "");
      logged_line = logged_line.split(" ")[2] || logged_line.split(" ")[1];
      return logged_line;
    }
  } catch (error) {
    return "error";
  }
  return "";
}

const formatAxiosError = (axiosError: AxiosError) => ({
  status: axiosError.response ? axiosError.response.status : null,
  data: axiosError.response ? axiosError.response.data : null,
  message: axiosError.message,
  isAxiosError: true,
});

export const getLogObject = (data: LogObject) => {
  if (!config.LOG_SENSITIVE_DATA) data = hideSensitiveDataFromObject(data);
  if (data.error && axios.isAxiosError(data.error)) data.error = formatAxiosError(data.error);
  if (data.err && axios.isAxiosError(data.err)) data.err = formatAxiosError(data.err);
  return {
    logged_at: getlogged_line(),
    data,
    timestamp: new Date().toISOString(),
  };
};
export const keysToHide = ["token", "password", "oldPassword", "newPassword", "key"];

export const hideSensitiveDataFromObject = (data: LogObject) => {
  data = _.cloneDeep(data);
  for (const key of keysToHide) {
    // if key exists in logged object, replace value with "hidden"
    if (_.get(data, key, false)) _.set(data, key, "hidden");
  }
  return data;
};
