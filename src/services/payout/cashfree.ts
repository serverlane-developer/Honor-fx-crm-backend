import axios from "axios";
import myCache from "memory-cache";

import logger from "../../utils/logger";

import { AccountTransferResponse, CashFree } from "../../@types/Payout";
import { requestId } from "../../@types/Common";
import { PayoutGateway } from "../../@types/database";
import { decrypt } from "../../helpers/cipher";

const CACHE_KEY = `cashfree_api_token`;

const ENDPOINTS = {
  PAYOUT: "/payout/v1/directTransfer",
  STATUS: "/payout/v1/getTransferStatus", // query param: transferId | example: /payout/v1/getTransferStatus?transferId=ICICI01
  BALANCE: "/payout/v1/getBalance",
  AUTHENTICATE: "/payout/v1/authorize",
  VERIFY_TOKEN: "/payout/v1/verifyToken",
};

const getKeys = (pg: PayoutGateway) => ({
  PAYMENT_BASE_URL: decrypt(pg.base_url || ""),
  CLIENT_ID: decrypt(pg.client_id || ""),
  CLIENT_SECRET: decrypt(pg.secret_key || ""),
});

const accountTransfer = async (
  pg: PayoutGateway,
  data: CashFree.PayoutRequest,
  requestId: requestId
): Promise<AccountTransferResponse> => {
  try {
    const { PAYMENT_BASE_URL } = getKeys(pg);
    const url = PAYMENT_BASE_URL + ENDPOINTS.PAYOUT;
    logger.info(`Initiating account transfer for cashfree payout api`, { data, requestId });

    logger.info(`Trying to fetch auth token`, { requestId });
    const token = await getAuthToken(pg, 0, false, requestId);
    logger.info(`auth token fetched successfully`, { requestId });

    logger.info(`Trying to fetch balance`, { requestId });
    const balance = await getBalance(pg, requestId);
    logger.info(`balance fetched successfully`, { balance, requestId });

    if (Number(data.amount || 0) > Number(balance.availableBalance || 0))
      return {
        status: false,
        payment_status: "ERROR",
        message: "Insufficient Balance on Payment Gateway",
        data: null,
      };

    const { amount, remarks, transferId, transferMode, beneDetails } = data;

    const reqBody = { amount, remarks, transferId, transferMode, beneDetails };

    const config = {
      method: "post",
      url,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: reqBody,
    };

    logger.info(`Request to call payout api`, { config, requestId });
    const response = await axios(config);
    logger.info(`Response from payout api`, { response: response.data, requestId });

    const possibleStatus = ["SUCCESS", "PENDING"];

    if (response.data && possibleStatus.includes(response.data.status)) {
      return {
        status: true,
        payment_status: response.data.status,
        message: response.data.message || "Transaction Successfull",
        data: response.data,
      };
    }
    return {
      status: false,
      payment_status: response.data.status,
      message: response.data.message,
      data: null,
    };
  } catch (err) {
    let message = "Something Wrong With Gateway. Refresh the list before making payment";
    logger.error(message, { err, requestId });
    if (axios.isAxiosError(err)) {
      message = err.response?.data;
    } else if (err instanceof Error) {
      message = err.message;
    }
    throw {
      message,
      status: false,
      gatewayException: true,
    };
  }
};

const getTransationStatus = async (pg: PayoutGateway, id: string, requestId: requestId) => {
  const { PAYMENT_BASE_URL } = getKeys(pg);
  const url = `${PAYMENT_BASE_URL}${ENDPOINTS.STATUS}?transferId=${id}`;
  const token = await getAuthToken(pg, 0, false, requestId);
  const config = {
    method: "get",
    url,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const { data } = await axios(config);

  logger.info(`Transaction status for ID: ${id}`, { data, requestId });

  if (data.status === "ERROR") {
    return data;
  }

  const transferObject = data?.data?.transfer;

  return transferObject;
};

// authenticate and verify before each network call
// if verify returns 403 | retry authenticate | COUNT 3
const getAuthToken = async (
  pg: PayoutGateway,
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
    if (token) return token;

    // get api auth token from cashfree payout api
    const newToken = await authenticate(pg, requestId);

    // verify auth token
    const isTokenValid = await verifyToken(pg, newToken, requestId);
    if (!isTokenValid) {
      throw { is_not_valid: true }; // custom error | should not ever occur
    }
    // if token valid, set it cache and return
    myCache.put(CACHE_KEY, newToken, 9 * 60 * 1000); // 9 minutes
    return newToken;
  } catch (err) {
    logger.error(
      `Error getting auth token for cashfree payout api | Retry Count  = ${retryCount} | resetCache = ${resetCache}}`,
      { err, requestId }
    );

    const is_not_valid = (err as { is_not_valid?: boolean }).is_not_valid;
    let subCode = "";
    if (axios.isAxiosError(err)) subCode = err?.response?.data?.subCode;

    // 403 is verify token error | is_not_valid is custom error (should never be true)
    // if token is invalid and retry count is less than 4 retry | Else throw error
    if ((subCode === "403" || is_not_valid) && retryCount < 4) {
      return await getAuthToken(pg, retryCount + 1, true, requestId);
    }
    throw err;
  }
};

const authenticate = async (pg: PayoutGateway, requestId: requestId) => {
  try {
    const { CLIENT_ID, CLIENT_SECRET, PAYMENT_BASE_URL } = getKeys(pg);
    const url = PAYMENT_BASE_URL + ENDPOINTS.AUTHENTICATE;
    logger.info(`Trying to authenticate cashfree payout api to get api token`, { requestId });
    const config = {
      method: "post",
      url,
      headers: {
        "X-Client-Id": CLIENT_ID,
        "X-Client-Secret": CLIENT_SECRET,
      },
    };

    logger.info(`trying to fetch cashfree api token`, { config, requestId });
    const result = await axios(config);
    logger.info(`successfully fetched cashfree api token`, { requestId });
    const token = result?.data?.data?.token; // expiry 10 minutes

    return token as string;
  } catch (err) {
    logger.error(`Error authenticating cashfree payout api`, { err, requestId });
    throw err;
  }
};

const verifyToken = async (pg: PayoutGateway, token: string, requestId: requestId) => {
  try {
    const { PAYMENT_BASE_URL } = getKeys(pg);
    logger.info(`Trying to verify cashfree payout api's api token`, { requestId });

    const url = PAYMENT_BASE_URL + ENDPOINTS.VERIFY_TOKEN;

    const config = {
      method: "post",
      url,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    logger.info(`successfully fetched cashfree api verify token response`, { config, requestId });
    const result = await axios(config);
    logger.info(`successfully fetched cashfree api verify token response`, { requestId });
    const data = result?.data;

    const isValid = data?.subCode === "200" && data?.status === "SUCCESS";
    return isValid;
  } catch (err) {
    logger.error(`Error authenticating cashfree payout api`, { err, requestId });

    throw err;
  }
};

const getBalance = async (pg: PayoutGateway, requestId: requestId) => {
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

    const response = await axios(config);
    const data = response.data as CashFree.BalanceResponse;
    const balanceRes = data?.data;
    return { ...balanceRes, balance: balanceRes.availableBalance };
  } catch (err) {
    logger.error(`Error while getting cashfree wallet balance`, { err, requestId });
    throw err;
  }
};

export default {
  accountTransfer,
  getTransationStatus,
  getBalance,
  getKeys,
};
