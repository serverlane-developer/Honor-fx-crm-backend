import axios, { AxiosRequestConfig } from "axios";

import { requestId } from "../../@types/Common";
import { RegisterRequest, RegisterResponse } from "../../@types/Mt5/Register";
import { DepositRequest, DepositResponse } from "../../@types/Mt5/Deposit";
import { WithdrawRequest, WithdrawResponse } from "../../@types/Mt5/Withdraw";

// import myCache from "memory-cache";
import logger from "../../utils/logger";
import config from "../../config";

// const CACHE_KEY = `mt5_token`;

const ENDPOINTS = {
  REGISTER: "/mtaccount/create",
  DEPOSIT: "/mtaccount/makedeposit",
  WITHDRAW: "/mtaccount/makewithdraw",
};

const { MT5_COUNTRY, MT5_LEVERAGE, MT5_SERVER_URL } = config;

const register = async (client_name: string, email: string, requestId: requestId) => {
  const body: RegisterRequest = {
    client_name,
    email,
    country: MT5_COUNTRY,
    leverage: MT5_LEVERAGE,
  };
  try {
    const url = MT5_SERVER_URL + ENDPOINTS.REGISTER;
    logger.info(`Trying to register user on mt5`, { requestId, body });
    const config: AxiosRequestConfig = {
      method: "POST",
      url,
      data: body,
    };

    logger.info(`mt5 register request`, { config, requestId });
    const result = await axios(config);
    const data = result.data as RegisterResponse;

    logger.info(`successfully registered user on mt5`, { requestId, data });

    return data;
  } catch (err) {
    let message = "Error while registering user on mt5";
    logger.error(message, { err, requestId, body });
    if (axios.isAxiosError(err)) {
      message = err.response?.data;
    } else if (err instanceof Error) {
      message = err.message;
    }
    return {
      message,
      status: false,
      data: null,
      error: true,
      result: null
    };
  }
};

const deposit = async (mt5_id: string, amount: string, requestId: requestId) => {
  const body: DepositRequest = {
    mt5_id,
    amount,
  };
  try {
    const url = MT5_SERVER_URL + ENDPOINTS.DEPOSIT;
    logger.info(`Trying to deposit on mt5`, { requestId, body });
    const config: AxiosRequestConfig = {
      method: "POST",
      url,
      data: body,
    };

    logger.info(`mt5 deposit request`, { config, requestId });
    const result = await axios(config);
    const data = result.data as DepositResponse;

    logger.info(`successfully deposited  on mt5`, { requestId, result });

    return data;
  } catch (err) {
    let message = "Error while depositing on mt5";
    logger.error(message, { err, requestId, body });
    if (axios.isAxiosError(err)) {
      message = err.response?.data;
    } else if (err instanceof Error) {
      message = err.message;
    }
    return {
      message,
      status: false,
      data: null,
      error: true,
      result: null

    };
  }
};

const withdraw = async (mt5_id: string, amount: string, requestId: requestId) => {
  const body: WithdrawRequest = {
    mt5_id,
    amount,
  };
  try {
    const url = MT5_SERVER_URL + ENDPOINTS.WITHDRAW;
    logger.info(`Trying to withdraw on mt5`, { requestId, body });
    const config: AxiosRequestConfig = {
      method: "POST",
      url,
      data: body,
    };

    logger.info(`mt5 withdraw request`, { config, requestId });
    const result = await axios(config);
    const data = result.data as WithdrawResponse;

    logger.info(`successfully withdrew from mt5`, { requestId, result });

    return data;
  } catch (err) {
    let message = "Error while withdrawing on mt5";
    logger.error(message, { err, requestId, body });
    if (axios.isAxiosError(err)) {
      message = err.response?.data;
    } else if (err instanceof Error) {
      message = err.message;
    }
    return {
      message,
      status: false,
      data: null,
      error: true,
      result: null
    };
  }
};

export default {
  register,
  deposit,
  withdraw,
};
