import axios from "axios";
import moment from "moment-timezone";
import envConfig from "../../config/index";
import logger from "../../utils/logger";
import { AccountTransferResponse, ZaPay } from "../../@types/Payout";
import { requestId } from "../../@types/Common";
import base64Helper from "../../helpers/base64";
import hashHelper from "../../helpers/hash";
import { PaymentGateway } from "../../@types/database";
import { decrypt } from "../../helpers/cipher";
import * as pgTransactionRepo from "../../db_services/pg_transaction_repo";

// AKA PayMantra
const ENDPOINTS = {
  PAYOUT: "/Transfer",
  STATUS: "/TransferStatus",
  BALANCE: "/BalanceEnquiry",
};
const getKeys = (pg: PaymentGateway) => {
  const PAYMENT_BASE_URL = decrypt(pg.base_url || "");
  const MERCHANT_ID = decrypt(pg.merchant_id || "");
  const SECRET_KEY = decrypt(pg.secret_key || "");
  const ENCODED_KEY = base64Helper.encode(`${MERCHANT_ID}:${SECRET_KEY}`);

  return {
    PAYMENT_BASE_URL,
    MERCHANT_ID,
    SECRET_KEY,
    ENCODED_KEY,
  };
};

const parsePgOrderId = (id: string) => id.replace(/-/g, "");

const accountTransfer = async (
  pg: PaymentGateway,
  data: ZaPay.PayoutRequest,
  requestId: requestId
): Promise<AccountTransferResponse> => {
  try {
    const { ENCODED_KEY, SECRET_KEY, PAYMENT_BASE_URL } = getKeys(pg);
    const url = PAYMENT_BASE_URL + ENDPOINTS.PAYOUT;
    logger.info(`Initiating account transfer for ZaPay payout api`, { data, requestId });

    logger.info(`Trying to fetch balance`, { requestId });
    const balance = await getBalance(pg, requestId);
    logger.info(`balance fetched successfully`, { balance, requestId });

    if (Number(data.Amount || 0) > Number(balance.balance || 0))
      return {
        status: false,
        payment_status: "ERROR",
        message: "Insufficient Balance on Payment Gateway",
        data: null,
      };

    const {
      AccountNo,
      Amount,
      Beneficiary_Email,
      Beneficiary_Mobile,
      Beneficiary_Name,
      IFSC,
      Merchant_RefID,
      Remark,
      TxnMode,
    } = data;

    const reqBody = {
      AccountNo,
      Amount,
      Beneficiary_Email,
      Beneficiary_Mobile,
      Beneficiary_Name,
      IFSC,
      Merchant_RefID: parsePgOrderId(Merchant_RefID),
      Remark,
      TxnMode,
    };

    const hash = hashHelper.generateZapayHash(reqBody, SECRET_KEY);

    const config = {
      method: "post",
      url,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ENCODED_KEY}`,
      },
      data: { ...reqBody, hash },
    };

    logger.info(`Request to call ZaPay payout api`, { config, requestId });
    const response = await axios(config);
    logger.info(`Response from ZaPay payout api`, { response: response.data, requestId });

    const resData = response.data as ZaPay.PayoutResponse;

    const { respStatus } = resData;
    const isSuccess = respStatus === "SUCCESS";
    if (isSuccess) {
      return {
        status: true,
        payment_status: "PENDING",
        message: resData?.respMsg || "Transaction Successfull",
        data: resData,
      };
    }
    return {
      status: false,
      payment_status: "ERROR",
      message: resData?.respMsg,
      data: null,
    };
  } catch (err) {
    let message = "";
    logger.error("Error with PayAnyTime Payout Request", { err, requestId });
    if (axios.isAxiosError(err)) {
      message = err.response?.data;
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
  const { ENCODED_KEY, SECRET_KEY, PAYMENT_BASE_URL } = getKeys(pg);
  const url = PAYMENT_BASE_URL + ENDPOINTS.STATUS;
  const transaction = await pgTransactionRepo.getPgTransactionByFilter({ pg_order_id: id });
  const Txn_Date = moment(transaction?.created_at).tz(envConfig.TIMEZONE).format("YYYY-MM-DD");
  const reqBody = {
    Merchant_RefID: parsePgOrderId(id),
    Txn_Date,
  };
  const hash = hashHelper.generateZapayHash(reqBody, SECRET_KEY);

  const config = {
    method: "POST",
    url,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${ENCODED_KEY}`,
    },
    data: {
      ...reqBody,
      hash,
    },
  };
  logger.info(`ZaPay Transaction status for ID: ${id} | REQUEST`, { config, requestId });

  const { data: statusRes } = await axios(config);

  logger.info(`Transaction status for ID: ${id} | RESPONSE`, { statusRes, requestId });

  const data = statusRes as ZaPay.StatusResponse;
  return data.data;
};

const getBalance = async (pg: PaymentGateway, requestId: requestId) => {
  try {
    const { ENCODED_KEY, PAYMENT_BASE_URL } = getKeys(pg);
    const url = PAYMENT_BASE_URL + ENDPOINTS.BALANCE;

    const config = {
      method: "GET",
      url,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ENCODED_KEY}`,
      },
    };

    logger.info("ZaPay get balance request", { config, requestId });
    const axiosRes = await axios(config);
    logger.info("ZaPay get balance response", { response: axiosRes.data, requestId });

    const data = axiosRes.data as ZaPay.BalanceResponse;
    return data.data;
  } catch (err) {
    logger.error(`Error while getting ZaPay wallet balance`, { err, requestId });
    throw err;
  }
};

export default {
  accountTransfer,
  getTransationStatus,
  getBalance,
  getKeys,
};
