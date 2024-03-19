import crypto from "crypto";
import axios from "axios";
import logger from "../../utils/logger";

import { requestId } from "../../@types/Common";
import { AccountTransferResponse, QikPay } from "../../@types/Payout";
import { PaymentGateway } from "../../@types/database";
import { decrypt } from "../../helpers/cipher";

const ENDPOINTS = {
  PAYOUT: "/payOut",
  STATUS: "/getStatus",
  BALANCE: "/getWalletBalance",
};
const getKeys = (pg: PaymentGateway) => ({
  PAYMENT_BASE_URL: decrypt(pg.base_url || ""),
  API_TOKEN: decrypt(pg.merchant_id || ""),
  HKEY: decrypt(pg.secret_key || ""),
});

const parsePgOrderId = (id = "") => id.replace(/-/g, "").slice(0, 30); // QikPay

const accountTransfer = async (
  pg: PaymentGateway,
  data: QikPay.PayoutRequest,
  requestId: requestId
): Promise<AccountTransferResponse> => {
  const { API_TOKEN, HKEY, PAYMENT_BASE_URL } = getKeys(pg);
  const url = PAYMENT_BASE_URL + ENDPOINTS.PAYOUT;
  logger.info(`Initiating account transfer for qikpay payout api`, { data, requestId });

  logger.info(`Trying to fetch balance`, { requestId });
  const { balance } = await getBalance(pg, requestId);
  logger.info(`balance fetched successfully`, { balance, requestId });

  if (Number(data.RemittanceAmount || 0) > Number(balance || 0))
    return {
      status: false,
      payment_status: "ERROR",
      message: "Insufficient Balance on Payment Gateway",
      data: null,
    };

  data.client_id = parsePgOrderId(data.pg_order_id);
  data.api_token = API_TOKEN;

  const { AccountNumber, BeneficiaryName, IFSCCode, MobileNumber, RemittanceAmount, type, client_id } = data;

  data.hash = generateHash({
    AccountNumber,
    BeneficiaryName,
    client_id,
    IFSCCode,
    MobileNumber,
    RemittanceAmount,
    type,
    hkey: HKEY,
  });

  const body = JSON.parse(JSON.stringify({ ...data, pg_order_id: undefined }));

  const config = {
    method: "post",
    url,
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
  };

  try {
    logger.info(`Request to call payout api`, { config, requestId });
    const response = await axios(config);
    logger.info(`Response from payout api`, { response: response.data, requestId });

    // console.log("APi response status::", response.data.status);
    const possibleStatus = ["SUCCESS", "PENDING"];

    if (response.data && possibleStatus.includes(response.data.STATUS)) {
      return {
        status: true,
        payment_status: response.data.STATUS,
        message: "Transaction Successfull",
        data: response.data,
      };
    }
    return {
      status: false,
      payment_status: response.data.STATUS,
      message: JSON.stringify(response.data.MSG),
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

const getBalance = async (pg: PaymentGateway, requestId: requestId) => {
  try {
    const { API_TOKEN, PAYMENT_BASE_URL } = getKeys(pg);
    logger.info("Request to QikPay for Balance Check", { requestId });
    const url = `${PAYMENT_BASE_URL}${ENDPOINTS.BALANCE}?api_token=${API_TOKEN}`;
    const config = {
      method: "get",
      url,
      headers: {
        "Content-Type": "application/json",
      },
    };
    const { data } = await axios(config);
    const balance = Number(data || 0);
    logger.info("Balance Check Response from QikPay", { response: data, balance, requestId });
    return { balance };
  } catch (err) {
    logger.error(`Error while getting qikpay wallet balance`, { err, requestId });
    throw err;
  }
};

const getTransationStatus = async (pg: PaymentGateway, id: string, requestId: requestId) => {
  try {
    const { API_TOKEN, PAYMENT_BASE_URL } = getKeys(pg);

    const url = `${PAYMENT_BASE_URL}${ENDPOINTS.STATUS}?api_token=${API_TOKEN}&client_id=${id}`;

    const config = {
      method: "get",
      url,
      headers: {
        "Content-Type": "application/json",
      },
    };

    logger.info("Request to get transaction status for QikPay", { config, requestId });
    const { data } = await axios(config);
    logger.info("Transaction Status Response from QikPay", { data, requestId });

    /** Sample Response
    {
      "STATUS":"SUCCESS",
      "MSG":"Transaction Success",
      "opid":"Bank Ref Number"
    }
    */

    return data as QikPay.TransactionStatus;
  } catch (err) {
    logger.error("Error while getting transaction status", { err, requestId });
    throw err;
  }
};

const generateHash = ({
  MobileNumber = "",
  IFSCCode = "",
  RemittanceAmount = 0,
  AccountNumber = "",
  BeneficiaryName = "",
  client_id = "",
  type = "",
  hkey = "",
} = {}) => {
  const fieldsToHash = [
    MobileNumber,
    IFSCCode,
    RemittanceAmount,
    AccountNumber,
    BeneficiaryName,
    client_id,
    type,
    hkey,
  ];
  const stringToHash = fieldsToHash.join("");
  const hash = crypto.createHmac("sha256", hkey).update(stringToHash).digest("hex");
  // console.log({ MobileNumber, IFSCCode, RemittanceAmount, AccountNumber, BeneficiaryName, client_id, type, hkey });
  return hash;
};

export default {
  accountTransfer,
  getTransationStatus,
  getBalance,
  getKeys,
};
