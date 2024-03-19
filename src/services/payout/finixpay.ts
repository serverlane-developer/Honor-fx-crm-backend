import axios from "axios";
import logger from "../../utils/logger";
import { AccountTransferResponse, FinixPay } from "../../@types/Payout";
import { requestId } from "../../@types/Common";
import { decrypt } from "../../helpers/cipher";
import { PaymentGateway } from "../../@types/database";

const ENDPOINTS = {
  PAYOUT: "/FinixPayPayout2",
  STATUS: "/FinixPayStatusCheck", // query param:
  BALANCE: "/FinixPayGetbalance",
};

const getBody = ({
  CLIENT_ID,
  SECRET_KEY,
  MERCHANT_ID,
}: {
  MERCHANT_ID: string;
  CLIENT_ID: string;
  SECRET_KEY: string;
}) => ({
  merchantId: MERCHANT_ID,
  clientid: CLIENT_ID,
  clientSecretKey: SECRET_KEY,
});

const getKeys = (pg: PaymentGateway) => ({
  PAYMENT_BASE_URL: decrypt(pg.base_url || ""),
  CLIENT_ID: decrypt(pg.client_id || ""),
  SECRET_KEY: decrypt(pg.secret_key || ""),
  MERCHANT_ID: decrypt(pg.merchant_id || ""),
});

const accountTransfer = async (
  pg: PaymentGateway,
  data: FinixPay.PayoutRequest,
  requestId: requestId
): Promise<AccountTransferResponse> => {
  try {
    const { CLIENT_ID, MERCHANT_ID, PAYMENT_BASE_URL, SECRET_KEY } = getKeys(pg);
    logger.info(`Initiating account transfer for finixpay payout api`, { data, requestId });

    logger.info(`Trying to fetch balance`, { requestId });
    const balance = await getBalance(pg, requestId);
    logger.info(`balance fetched successfully`, { balance, requestId });

    const amount = String(data.amount);

    if (Number(data.amount || 0) > Number(balance.balance || 0))
      return {
        status: false,
        payment_status: "ERROR",
        message: "Insufficient Balance on Payment Gateway",
        data: null,
      };

    const { payout_refno, payout_mode, user_mobile_number, account_name, account_no, ifsc } = data;

    const reqBody = {
      payout_refno,
      amount,
      payout_mode,
      user_mobile_number,
      account_name,
      account_no,
      ifsc,
    };

    const queryString = new URLSearchParams(reqBody).toString();
    const url = `${PAYMENT_BASE_URL}${ENDPOINTS.PAYOUT}?${queryString}`;

    const config = {
      method: "post",
      url,
      headers: {
        "Content-Type": "application/json",
      },
      data: getBody({ CLIENT_ID, MERCHANT_ID, SECRET_KEY }),
    };

    logger.info(`Request to call finixpay payout api`, { config, requestId });
    const response = await axios(config);
    // const response = {
    //   data: {
    //     status: "true",
    //     response_code: "1",
    //     message: "Dummy Response",
    //   },
    // };

    logger.info(`Response from finixpay payout api`, { response: response.data, requestId });

    const resData = response.data as FinixPay.FinixPayResponse;

    const { response_code } = resData;
    const isSuccess = Number(response_code) === 1;
    if (isSuccess) {
      return {
        status: true,
        payment_status: "PENDING",
        message: resData?.message || "Transaction Successfull",
        data: resData,
      };
    }
    return {
      status: false,
      payment_status: "ERROR",
      message: resData?.message,
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
      data: null,
    };
  }
};

const getTransationStatus = async (pg: PaymentGateway, id: string, requestId: requestId) => {
  const { CLIENT_ID, MERCHANT_ID, PAYMENT_BASE_URL, SECRET_KEY } = getKeys(pg);
  const url = `${PAYMENT_BASE_URL}${ENDPOINTS.STATUS}?payout_refno=${id}`;
  const config = {
    method: "POST",
    url,
    headers: {
      "Content-Type": "application/json",
    },
    data: getBody({ CLIENT_ID, MERCHANT_ID, SECRET_KEY }),
  };
  logger.info(`finixpay Transaction status for ID: ${id} | REQUEST`, { config, requestId });

  const { data } = await axios(config);

  logger.info(`Transaction status for ID: ${id} | RESPONSE`, { data, requestId });
  const result = data as FinixPay.StatusResponse;

  if (!result.Status) result.Status = "PENDING";
  // const responseCode = result?.response_code;
  // const isSuccess = Number(responseCode) === 1;

  // const responseStatus = isSuccess ? "SUCCESS" : "FAILED";

  // let status = result?.Status;
  // status = (status || "ERROR").toUpperCase();
  // return { ...result, status };
  return result;
};

const getBalance = async (pg: PaymentGateway, requestId: requestId) => {
  try {
    const { CLIENT_ID, MERCHANT_ID, PAYMENT_BASE_URL, SECRET_KEY } = getKeys(pg);
    const url = PAYMENT_BASE_URL + ENDPOINTS.BALANCE;

    const config = {
      method: "POST",
      url,
      headers: {
        "Content-Type": "application/json",
      },
      data: getBody({ CLIENT_ID, MERCHANT_ID, SECRET_KEY }),
    };

    logger.info("FinixPay get balance request", { config, requestId });
    const { data } = await axios(config);
    // const data = {
    //   status: "true",
    //   response_code: "1",
    //   message: "Record Fetched Successfully",
    //   balance: "130007.20",
    // };
    logger.info("FinixPay get balance response", { data, requestId });

    /* Sample Object 
      {
        status: 'true',
        response_code: '1',
        message: 'Record Fetched Successfully',
        balance: '137.20'
      }
    */
    return data as FinixPay.BalanceResponse;
  } catch (err) {
    logger.error(`Error while getting finixpay wallet balance`, { err, requestId });
    throw err;
  }
};

export default {
  accountTransfer,
  getTransationStatus,
  getBalance,
  getKeys,
};
