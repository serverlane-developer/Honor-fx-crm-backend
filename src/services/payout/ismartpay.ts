import axios from "axios";
import logger from "../../utils/logger";
import { AccountTransferResponse, ISmartPay } from "../../@types/Payout";
import { requestId } from "../../@types/Common";
import { PayoutGateway } from "../../@types/database";
import { decrypt } from "../../helpers/cipher";

const ENDPOINTS = {
  PAYOUT: "/create/payout",
  STATUS: "/payout/status", // :transaction_id
  BALANCE: "/payout/wallet/details",
};

const getHeaders = ({ MERCHANT_ID, SECRET }: { MERCHANT_ID: string; SECRET: string }) => ({
  mid: MERCHANT_ID,
  key: SECRET,
});

const getKeys = (pg: PayoutGateway) => ({
  PAYMENT_BASE_URL: decrypt(pg.base_url || ""),
  MERCHANT_ID: decrypt(pg.merchant_id || ""),
  SECRET: decrypt(pg.secret_key || ""),
  WALLET_ID: decrypt(pg.client_id || ""),
});

const accountTransfer = async (
  pg: PayoutGateway,
  data: ISmartPay.PayoutRequest,
  requestId: requestId
): Promise<AccountTransferResponse> => {
  try {
    const { MERCHANT_ID, PAYMENT_BASE_URL, SECRET, WALLET_ID } = getKeys(pg);
    const url = PAYMENT_BASE_URL + ENDPOINTS.PAYOUT;
    logger.info(`Initiating account transfer for ISmartPay payout api`, { data, requestId });

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

    const { amount, currency, narration, order_id, payment_details, phone_number, purpose } = data;

    const reqBody = {
      amount,
      currency,
      narration,
      order_id,
      payment_details,
      phone_number,
      purpose,
      wallet_id: WALLET_ID,
    };

    const config = {
      method: "post",
      url,
      headers: {
        "Content-Type": "application/json",
        ...getHeaders({ MERCHANT_ID, SECRET }),
      },
      data: reqBody,
    };

    logger.info(`Request to call ISmartPay payout api`, { config, requestId });
    const response = await axios(config);
    logger.info(`Response from ISmartPay payout api`, { response: response.data, requestId });

    const resData = response.data as ISmartPay.PayoutResponse;

    const { status_code } = resData;
    const isSuccess = ["PENDING", "SUCCESS", "CREATED"].includes(status_code);
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
  const { MERCHANT_ID, PAYMENT_BASE_URL, SECRET } = getKeys(pg);
  const url = PAYMENT_BASE_URL + ENDPOINTS.STATUS + "/" + id;

  const config = {
    method: "GET",
    url,
    headers: {
      "Content-Type": "application/json",
      ...getHeaders({ MERCHANT_ID, SECRET }),
    },
  };
  logger.info(`ISmartPay Transaction status for ID: ${id} | REQUEST`, { config, requestId });

  const { data } = await axios(config);

  logger.info(`Transaction status for ID: ${id} | RESPONSE`, { data, requestId });

  return data as ISmartPay.StatusResponse;
};

const getBalance = async (pg: PayoutGateway, requestId: requestId) => {
  try {
    const { MERCHANT_ID, PAYMENT_BASE_URL, SECRET, WALLET_ID } = getKeys(pg);
    const url = PAYMENT_BASE_URL + ENDPOINTS.BALANCE;

    const config = {
      method: "GET",
      url,
      headers: {
        "Content-Type": "application/json",
        ...getHeaders({ MERCHANT_ID, SECRET }),
      },
    };

    logger.info("ISmartPay get balance request", { config, requestId });
    const axiosRes = await axios(config);

    const resData = axiosRes.data as ISmartPay.WalletResponse;
    logger.info("ISmartPay get balance response", { requestId, resData });

    const wallets = resData.wallet_info;

    let balance = 0;

    if (wallets.length) {
      const wallet = wallets.find((w) => w.wallet_id === WALLET_ID);
      if (wallet) balance = Number(wallet.ballance || 0);
    }

    return { balance, walletBalance: balance };
  } catch (err) {
    logger.error(`Error while getting ISmartPay wallet balance`, { err, requestId });
    throw err;
  }
};

export default {
  accountTransfer,
  getTransationStatus,
  getBalance,
  getKeys,
};
