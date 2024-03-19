import axios from "axios";
import myCache from "memory-cache";

import logger from "../../utils/logger";

import { AccountTransferResponse, PayAnyTime } from "../../@types/Payout";
import { requestId } from "../../@types/Common";
import { PaymentGateway } from "../../@types/database";
import { decrypt } from "../../helpers/cipher";

const CACHE_KEY = `payanytime_api_token`;

const ENDPOINTS = {
  PAYOUT: "/api/v2/send-money/confirm",
  STATUS: "/api/v2/transactions/status",
  BALANCE: "/api/v2/available-balances",
  AUTHENTICATE: "/api/v2/login",
};

const getKeys = (pg: PaymentGateway) => ({
  PAYMENT_BASE_URL: decrypt(pg.base_url || ""),
  EMAIL: decrypt(pg.merchant_id || ""),
  PASSWORD: decrypt(pg.secret_key || ""),
});

const accountTransfer = async (
  pg: PaymentGateway,
  data: PayAnyTime.PayoutRequest,
  requestId: requestId
): Promise<AccountTransferResponse> => {
  try {
    const { PAYMENT_BASE_URL } = getKeys(pg);
    const url = PAYMENT_BASE_URL + ENDPOINTS.PAYOUT;
    logger.info(`Initiating account transfer for payanytime payout api`, { data, requestId });

    logger.info(`Trying to fetch auth token`, { requestId });
    const token = await getAuthToken(pg, 0, false, requestId);
    logger.info(`auth token fetched successfully`, { requestId });

    logger.info(`Trying to fetch balance`, { requestId });
    const balance = await getBalance(pg, requestId);
    logger.info(`balance fetched successfully`, { balance, requestId });

    if (Number(data.amount || 0) > Number(balance.balance || 0))
      return {
        status: false,
        payment_status: "ERROR",
        message: "Insufficient Balance on Payment Gateway",
        data: null,
      };

    const { email, phone, amount, note, account_name, account_number, ifsc, refer_number } = data;

    const reqBody = { amount, email, phone, note, account_name, account_number, ifsc, refer_number };

    const config = {
      method: "post",
      url,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: reqBody,
    };

    logger.info(`Request to call payanytime api`, { config, requestId });
    const response = await axios(config);

    const resData = response.data as PayAnyTime.PayoutResponse;
    logger.info(`Response from payanytime api`, { response: resData, requestId });

    const possibleStatus = ["PENDING", "PROCESSING", "SUCCESS"];

    const isSuccess =
      "response" in resData &&
      typeof resData.response.records.status === "string" &&
      "TxnId" in resData.response.records &&
      possibleStatus.includes(resData.response.records.status.toUpperCase());

    const isError = "error" in resData || "message" in resData.response.records;
    logger.info(`Response STATUS from PayAnyTime API`, { isSuccess, isError, requestId });

    if (isSuccess) {
      const rrn = resData.response.records.TxnId;

      if (isSuccess) {
        return {
          status: true,
          payment_status: "PENDING",
          message: "Transaction Successfull",
          data: { ...resData, rrn },
        };
      }
    } else if (isError) {
      let message = "Transaction Failed";
      if ("error" in resData) {
        if (typeof resData.error === "string") message = resData.error;
        else if (typeof resData.error === "object") {
          message = JSON.stringify(resData.error);
        }
      } else {
        const errorMsg = resData.response.records.message;
        if (errorMsg) message = errorMsg;
      }
      return {
        status: false,
        payment_status: "ERROR",
        message,
        data: null,
      };
    }

    return {
      status: false,
      payment_status: "ERROR",
      message: "Transaction Failed",
      data: null,
    };
  } catch (err) {
    let message = "";
    logger.error("Error with PayAnyTime Payout Request", { err, requestId });
    if (axios.isAxiosError(err)) {
      message = err.response?.data?.error || JSON.stringify(err.response?.data);
    } else if (err instanceof Error) {
      message = err.message;
    }

    if (message) {
      return {
        status: false,
        payment_status: "ERROR",
        message,
        data: null,
      };
    }

    message = "Something Wrong With Gateway. Refresh the list before making payment";
    throw {
      message,
      status: false,
      gatewayException: true,
    };
  }
};

const getTransationStatus = async (pg: PaymentGateway, id: string, requestId: requestId) => {
  const { PAYMENT_BASE_URL } = getKeys(pg);

  // const transaction = await pgTransactionRepo.getPgTransactionByFilter({ pg_order_id: id });

  // const trans_id = transaction?.payment_order_id;

  const url = PAYMENT_BASE_URL + ENDPOINTS.STATUS + `?trans_id=${id}`;

  const token = await getAuthToken(pg, 0, false, requestId);
  const config = {
    method: "POST",
    url,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const result = await axios(config);

  const data = result.data as PayAnyTime.TransactionStatus;

  logger.info(`Transaction status for ID: ${id}`, { data, requestId });

  if (
    data.response.records.error &&
    (data?.response?.records?.message || "").toLowerCase() == "please wait and try again later"
  )
    data.response.records.transaction_status = "Processing";

  return data;
};

// authenticate before each network call
const getAuthToken = async (
  pg: PaymentGateway,
  retryCount = 0,
  resetCache = false,
  requestId: requestId
): Promise<string> => {
  try {
    logger.info(`Trying to get auth token for api call | Retry Count  = ${retryCount} | resetCache = ${resetCache}}`, {
      requestId,
    });

    if (resetCache) {
      logger.info(`Removing api token from cache`, { requestId });
      myCache.del(CACHE_KEY);
    }

    const token = myCache.get(CACHE_KEY) as string;
    if (token) {
      logger.info(`Fetched PayAnyTime api token from cache`, { requestId });

      return token;
    }

    // get api auth token from payanytime payout api
    const newToken = await authenticate(pg, requestId);

    // if token valid, set it cache and return
    myCache.put(CACHE_KEY, newToken, 9 * 60 * 1000); // 9 minutes
    return newToken;
  } catch (err) {
    logger.error(
      `Error getting auth token for payanytime payout api | Retry Count  = ${retryCount} | resetCache = ${resetCache}}`,
      { err, requestId }
    );

    if (retryCount < 4) {
      return await getAuthToken(pg, retryCount + 1, true, requestId);
    }
    throw err;
  }
};

const authenticate = async (pg: PaymentGateway, requestId: requestId) => {
  try {
    const { PAYMENT_BASE_URL, EMAIL, PASSWORD } = getKeys(pg);
    const url = PAYMENT_BASE_URL + ENDPOINTS.AUTHENTICATE;
    logger.info(`Trying to authenticate payanytime payout api to get api token`, { requestId });
    const config = {
      method: "post",
      url,
      data: { email: EMAIL, password: PASSWORD },
    };

    logger.info(`trying to fetch payanytime api token`, { config, requestId });
    const result = await axios(config);
    const data = result.data as PayAnyTime.AuthResponse;
    logger.info(`successfully fetched payanytime api token`, { requestId });
    const token = data.response.records.token; // expiry ? minutes

    return token as string;
  } catch (err) {
    logger.error(`Error authenticating payanytime payout api`, { err, requestId });
    throw err;
  }
};

const getBalance = async (pg: PaymentGateway, requestId: requestId) => {
  try {
    const token = await getAuthToken(pg, 0, false, requestId);

    const { PAYMENT_BASE_URL } = getKeys(pg);

    const url = PAYMENT_BASE_URL + ENDPOINTS.BALANCE;

    const config = {
      method: "get",
      url,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    logger.debug(`Request to Get Balance from PayAnyTime`, { requestId, config });
    const response = await axios(config);

    const data = response.data as PayAnyTime.BalanceResponse;
    logger.debug(`Response from Get Balance API`, { requestId, response: data });

    const wallets = data.response.records;
    let balanceRes = "";

    if (wallets.length > 1) {
      const wallet = wallets.find((w) => w.is_default.toLowerCase() === "yes");
      if (wallet) balanceRes = String(wallet.balance).replace(",", "");
    } else if (wallets.length == 1) {
      balanceRes = String(wallets[0].balance).replace(/,/g, "");
    }

    const balance = Number(balanceRes || 0) || 0;

    return { balance };
  } catch (err) {
    logger.error(`Error while getting payanytime wallet balance`, { err, requestId });
    throw err;
  }
};

export default {
  accountTransfer,
  getTransationStatus,
  getBalance,
  getKeys,
};
