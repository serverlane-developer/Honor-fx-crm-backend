import axios from "axios";
import moment from "moment";
import logger from "../../utils/logger";

import * as withdrawRepo from "../../db_services/withdraw_repo";
import { AccountTransferResponse, Iserveu } from "../../@types/Payout";
import { requestId } from "../../@types/Common";
import { PaymentGateway } from "../../@types/database";
import { decrypt } from "../../helpers/cipher";
import { parsePgOrderIdForIserverU } from "./helper";

const ENDPOINTS = {
  PAYOUT: "/cashtransfer",
};

const getKeys = (pg: PaymentGateway) => ({
  PAYMENT_BASE_URL: decrypt(pg.base_url || ""),
  STATUS_URL: decrypt(pg.base_url_alt || ""),
  CLIENT_ID: decrypt(pg.client_id || ""),
  CLIENT_SECRET: decrypt(pg.secret_key || ""),
});

const accountTransfer = async (
  pg: PaymentGateway,
  data: Iserveu.PayoutRequest,
  requestId: requestId
): Promise<AccountTransferResponse> => {
  const { transaction_id, ...reqBody } = data;
  try {
    const { CLIENT_ID, CLIENT_SECRET, PAYMENT_BASE_URL } = getKeys(pg);
    logger.info(`Initiating account transfer for iserveu payout api`, { data, requestId });

    const url = PAYMENT_BASE_URL + ENDPOINTS.PAYOUT;

    const headers = {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    };
    const config = {
      method: "post",
      url,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      data: reqBody,
    };

    logger.info(`Request to call payout api`, { config, requestId });
    const response = await axios(config);
    logger.info(`Response from payout api`, { response: response.data, requestId });

    const resData = response.data;

    const possibleStatus = ["SUCCESS", "PENDING", "INPROGRESS"];

    if (resData && possibleStatus.includes(resData.txnStatus)) {
      return {
        status: true,
        payment_status: resData.txnStatus,
        data: response?.data,
        message: resData.message || "Transaction Successfull",
      };
    }
    return {
      status: false,
      payment_status: resData.txnStatus,
      data: response?.data,
      message: resData?.statusDesc || response?.data?.message,
    };
  } catch (err) {
    let message = "Something Wrong With Gateway. Refresh the list before making payment";
    logger.error(message, { err, requestId, transaction_id });
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

const getTransationStatus = async (pg: PaymentGateway, id: string, requestId: requestId) => {
  const transaction = await withdrawRepo.getTransactionByFilter({ pg_order_id: id });

  if (!transaction) throw new Error("Transaction not found");

  const body = {
    $1: "Cashout_addbank_status",
    $4: moment(transaction.created_at).format("yyyy-MM-DD"),
    $5: moment(transaction.updated_at).format("yyyy-MM-DD"),
    $6: parsePgOrderIdForIserverU(id),
  };
  const { CLIENT_ID, CLIENT_SECRET, STATUS_URL } = getKeys(pg);
  const url = STATUS_URL;
  const headers = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  };
  const config = {
    method: "post",
    url,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    data: body,
  };

  const { data } = await axios(config);

  logger.info(`Transaction status for ID: ${id}`, { data, requestId });

  if (data.status === "ERROR") {
    return data;
  }
  if (data?.length > 0) return data?.results?.[0];
  throw new Error("Error fetching status");
};

const getBalance = async () => {
  throw new Error("Balance Check API Not Configured");
};

export default {
  accountTransfer,
  getTransationStatus,
  getBalance,
  getKeys,
};
