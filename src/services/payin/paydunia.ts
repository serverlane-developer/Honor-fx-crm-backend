import axios from "axios";
import myCache from "memory-cache";
import logger from "../../utils/logger";
import { requestId } from "../../@types/Common";
import { decrypt } from "../../helpers/cipher";
import { PayinGateway } from "../../@types/database";
import { Paydunia, PayinResponse } from "../../@types/Payin";
import hashHelper from "../../helpers/hash";

const CACHE_KEY = `paydunia_api_token`;

const ENDPOINTS = {
  URL: "/",
  STATUS: "/", // query param: username, password, orderid
  AUTHENTICATE: "/token", // query params: username, password
};

const getKeys = (pg: PayinGateway) => ({
  PAYIN_BASE_URL: decrypt(pg.base_url || ""),
  STATUS_BASE_URL: decrypt(pg.base_url_alt || ""),
  MERCHANT_ID: decrypt(pg.merchant_id || ""),
  SECRET_KEY: decrypt(pg.secret_key || ""),
  USERNAME: decrypt(pg.username || ""),
  PASSWORD: decrypt(pg.password || ""),
});

const getUrl = async (pg: PayinGateway, data: Paydunia.PayinRequest, requestId: requestId): Promise<PayinResponse> => {
  try {
    const { MERCHANT_ID, PAYIN_BASE_URL, SECRET_KEY } = getKeys(pg);
    logger.info(`Initiating payin request for payduniya payout api`, { data, requestId });

    const { AMOUNT, CUST_EMAIL, CUST_NAME, CUST_PHONE, ORDER_ID, PAY_ID, RETURN_URL } = data;

    const reqBody = { AMOUNT, CUST_EMAIL, CUST_NAME, CUST_PHONE, ORDER_ID, PAY_ID, RETURN_URL };
    const HASH = hashHelper.generatePayduniaHash(MERCHANT_ID, SECRET_KEY, reqBody);

    const url = PAYIN_BASE_URL;

    const config = {
      method: "post",
      url,
      headers: {
        "Content-Type": "application/json",
      },
      data: { ...reqBody, HASH },
    };

    logger.info(`Request to call payduniya payout api`, { config, requestId });
    const response = await axios(config);

    logger.info(`Response from payduniya payout api`, { response: response.data, requestId });

    const resData = response.data as Paydunia.PayinUrlResponse;

    const payment_url = resData.url;

    return {
      status: true,
      url: payment_url,
      message: resData?.message,
      data: null,
    };
  } catch (err) {
    let message = "Something Wrong With Gateway. Retry again some time later";
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
      data: null,
    };
  }
};

const getTransationStatus = async (pg: PayinGateway, orderid: string, requestId: requestId) => {
  const { STATUS_BASE_URL, USERNAME, PASSWORD } = getKeys(pg);
  const query = {
    username: USERNAME,
    password: PASSWORD,
    orderid,
  };

  const url = `${STATUS_BASE_URL + ENDPOINTS.STATUS}?${new URLSearchParams(query).toString()}`;

  const token = await getAuthToken(pg, 0, false, requestId);

  const config = {
    method: "GET",
    url,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };
  logger.info(`payduniya Transaction status for ID: ${orderid} | REQUEST`, { config, requestId });

  const { data } = await axios(config);

  logger.info(`Transaction status for ID: ${orderid} | RESPONSE`, { data, requestId });
  const result = data as Paydunia.StatusResponse;
  return result;
};

// authenticate before each network call
const getAuthToken = async (
  pg: PayinGateway,
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
      logger.info(`Fetched Paydunia api token from cache`, { requestId });

      return token;
    }

    // get api auth token from paydunia payout api
    const newToken = await authenticate(pg, requestId);

    // if token valid, set it cache and return
    myCache.put(CACHE_KEY, newToken, 1000 * 60 * 60); // 60 minutes
    return newToken;
  } catch (err) {
    logger.error(
      `Error getting auth token for paydunia payout api | Retry Count  = ${retryCount} | resetCache = ${resetCache}}`,
      { err, requestId }
    );

    if (retryCount < 4) {
      return await getAuthToken(pg, retryCount + 1, true, requestId);
    }
    throw err;
  }
};

const authenticate = async (pg: PayinGateway, requestId: requestId) => {
  try {
    const { STATUS_BASE_URL, USERNAME, PASSWORD } = getKeys(pg);
    const query = {
      username: USERNAME,
      password: PASSWORD,
    };

    const url = `${STATUS_BASE_URL + ENDPOINTS.AUTHENTICATE}?${new URLSearchParams(query).toString()}`;
    logger.info(`Trying to authenticate paydunia payout api to get api token`, { requestId });
    const config = {
      method: "get",
      url,
    };

    logger.info(`trying to fetch paydunia api token`, { config, requestId });
    const result = await axios(config);
    const data = result.data as Paydunia.AuthResponse;
    logger.info(`successfully fetched paydunia api token`, { requestId });
    const token = data.token; // expiry 1 hour

    return token as string;
  } catch (err) {
    logger.error(`Error authenticating paydunia payout api`, { err, requestId });
    throw err;
  }
};

export default {
  getUrl,
  getTransationStatus,
  getKeys,
};
