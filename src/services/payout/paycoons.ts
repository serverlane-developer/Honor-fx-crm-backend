import axios from "axios";
import logger from "../../utils/logger";
import { AccountTransferResponse, Paycoons } from "../../@types/Payout";
import { requestId } from "../../@types/Common";
import { decrypt } from "../../helpers/cipher";
import { PayoutGateway } from "../../@types/database";

const ENDPOINTS = {
  PAYOUT: "/PaycoonPayout2",
  STATUS: "/PaycoonStatusCheck", // query param:
  BALANCE: "/PaycoonGetbalance",
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

const getKeys = (pg: PayoutGateway) => ({
  PAYMENT_BASE_URL: decrypt(pg.base_url || ""),
  CLIENT_ID: decrypt(pg.client_id || ""),
  SECRET_KEY: decrypt(pg.secret_key || ""),
  MERCHANT_ID: decrypt(pg.merchant_id || ""),
});

const accountTransfer = async (
  pg: PayoutGateway,
  data: Paycoons.PayoutRequest,
  requestId: requestId
): Promise<AccountTransferResponse> => {
  try {
    const { CLIENT_ID, MERCHANT_ID, PAYMENT_BASE_URL, SECRET_KEY } = getKeys(pg);
    logger.info(`Initiating account transfer for paycoons payout api`, { data, requestId });

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

    logger.info(`Request to call paycoons payout api`, { config, requestId });
    const response = await axios(config);
    // const response = {
    //   data: {
    //     status: "true",
    //     response_code: "1",
    //     message: "Dummy Response",
    //   },
    // };

    logger.info(`Response from paycoons payout api`, { response: response.data, requestId });

    const resData = response.data as Paycoons.PaycoonsResponse;

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

const getTransationStatus = async (pg: PayoutGateway, id: string, requestId: requestId) => {
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
  logger.info(`paycoons Transaction status for ID: ${id} | REQUEST`, { config, requestId });

  const { data } = await axios(config);

  logger.info(`Transaction status for ID: ${id} | RESPONSE`, { data, requestId });
  /** POSSIBLE RESPONSE
    {
      status: 'true',
      response_code: '1',
      message: 'Transaction Found',
      Status: 'Hold',
      rrn: '',
      accountnumber: 'XXXXXXXXXXX',
      ifsc: 'XXXXXXXXXXX'
    }
   */
  const result = data as Paycoons.StatusResponse;

  const responseCode = result?.response_code;
  const isSuccess = Number(responseCode) === 1;

  const responseStatus = isSuccess ? "SUCCESS" : "FAILED";

  let status = result?.Status || responseStatus;
  status = (status || "ERROR").toUpperCase();
  return { ...result, status };
};

const getBalance = async (pg: PayoutGateway, requestId: requestId) => {
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

    logger.info("Paycoons get balance request", { config, requestId });
    const { data } = await axios(config);
    // const data = {
    //   status: "true",
    //   response_code: "1",
    //   message: "Record Fetched Successfully",
    //   balance: "130007.20",
    // };
    logger.info("Paycoons get balance response", { data, requestId });

    /* Sample Object 
      {
        status: 'true',
        response_code: '1',
        message: 'Record Fetched Successfully',
        balance: '137.20'
      }
    */
    return data as Paycoons.BalanceResponse;
  } catch (err) {
    logger.error(`Error while getting paycoons wallet balance`, { err, requestId });
    throw err;
  }
};

export default {
  accountTransfer,
  getTransationStatus,
  getBalance,
  getKeys,
};
