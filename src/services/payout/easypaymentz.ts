import axios from "axios";

import { AccountTransferResponse, EasyPaymentz } from "../../@types/Payout";
import logger from "../../utils/logger";
import { requestId } from "../../@types/Common";
import { decrypt } from "../../helpers/cipher";
import { PayoutGateway } from "../../@types/database";

const ENDPOINTS = {
  PAYOUT: "/accountTransfer",
  BALANCE: "/balanceCheck",
  STATUS: "/transactionStatus",
};

const getKeys = (pg: PayoutGateway) => ({
  PAYMENT_BASE_URL: decrypt(pg.base_url || ""),
  MERCHANT_ID: decrypt(pg.merchant_id || ""),
  SECRET: decrypt(pg.secret_key || ""),
});

const accountTransfer = async (
  pg: PayoutGateway,
  data: EasyPaymentz.PayoutRequest,
  requestId: requestId
): Promise<AccountTransferResponse> => {
  try {
    const { PAYMENT_BASE_URL, MERCHANT_ID, SECRET } = getKeys(pg);

    const url = PAYMENT_BASE_URL + ENDPOINTS.PAYOUT;

    logger.info(`Initiating account transfer for easypaymentz payout api`, { data, requestId });

    const { amount, bankaccount, beneficiaryName, ifsc, orderid, phonenumber, purpose, requestType } = data;
    const reqBody = { amount, bankaccount, beneficiaryName, ifsc, orderid, phonenumber, purpose, requestType };

    const config = {
      method: "post",
      url,
      headers: {
        merchantid: MERCHANT_ID,
        sec: SECRET,
        "Content-Type": "application/json",
      },
      data: reqBody,
    };

    logger.info(`Request to call payout api`, { config, requestId });
    const response = await axios(config);
    logger.info(`Response from payout api`, { response: response.data, requestId });

    if (response.data && response.data.status === "ACCEPTED") {
      return {
        status: true,
        payment_status: response.data.status,
        message: "Transaction Successfull",
        data: null,
      };
    }
    return {
      status: false,
      payment_status: response.data.status,
      message: response.data.msg[0],
      data: response.data,
    };
  } catch (err) {
    let message = "Something Wrong With Gateway. Refresh the list before making payment";
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

const getTransationStatus = async (pg: PayoutGateway, orderId: string, requestId: requestId) => {
  const { MERCHANT_ID, PAYMENT_BASE_URL, SECRET } = getKeys(pg);
  const url = PAYMENT_BASE_URL + ENDPOINTS.STATUS;
  const config = {
    method: "post",
    url,
    headers: {
      merchantid: MERCHANT_ID,
      sec: SECRET,
      "Content-Type": "application/json",
    },
    data: { orderId },
  };
  const { data } = await axios(config);
  logger.info(`Transaction status for ID: ${orderId}`, { data, requestId });

  return data;
};

const getBalance = async (pg: PayoutGateway, requestId: requestId) => {
  try {
    const { MERCHANT_ID, PAYMENT_BASE_URL, SECRET } = getKeys(pg);
    const url = PAYMENT_BASE_URL + ENDPOINTS.BALANCE;
    const config = {
      method: "get",
      url,
      headers: {
        merchantid: MERCHANT_ID,
        sec: SECRET,
        "Content-Type": "application/json",
      },
    };

    const { data } = await axios(config);
    const balancRes = data as EasyPaymentz.BalanceResponse;
    return { ...data, balance: balancRes.walletBalance };
  } catch (err) {
    logger.error(`Error while getting easypaymentz wallet balance`, { err, requestId });
    throw err;
  }
};

export default {
  accountTransfer,
  getTransationStatus,
  getBalance,
  getKeys,
};
