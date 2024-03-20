import * as libphonenumber from "libphonenumber-js";
import { Customer, PgTransaction, Deposit, PayinGateway } from "../../@types/database";
import { requestId } from "../../@types/Common";
import { PAYIN, PAYIN_SERVICE, Paydunia } from "../../@types/Payin";

import { Status, transaction_status } from "../../@types/database/Deposit";

import logger from "../../utils/logger";

import * as depositRepo from "../../db_services/deposit_repo";
import config from "../../config";
import depositHelper from "../../helpers/deposit";
import { PayinServices } from ".";

const createPayinData = (
  pg_order_id: string,
  transaction: Partial<Deposit>,
  customer: Customer,
  pg: PayinGateway,
  requestId: requestId
) => {
  const { amount: amt } = transaction as Deposit;
  const amount = Number(amt);
  const phone = libphonenumber.parsePhoneNumber(customer.phone_number).number;
  const email = customer.email || `${customer.username}@test.com`;
  const { username } = customer;

  const RETURN_URL = config.PAYIN_RETURN_URL;

  const PAY_ID = PayinServices[pg.pg_service].getKeys(pg).MERCHANT_ID;

  logger.debug("Creating Payment Data for Payin", { requestId, pg_order_id, transaction });
  const payduniaObj: Paydunia.PayinRequest = {
    AMOUNT: amount,
    CUST_EMAIL: email,
    CUST_NAME: username,
    CUST_PHONE: Number(phone),
    ORDER_ID: pg_order_id,
    PAY_ID: Number(PAY_ID),
    RETURN_URL,
  };

  const payoutObj = {
    ...payduniaObj,
  };
  return payoutObj;
};

const WebhookStatus = {
  SUCCESS: ["SUCCESS"],
  FAILED: [
    "ERROR",
    "FAILURE",
    "REJECTED",
    "FAILED",
    "MISSING",
    "INVALID",
    "DUPLICATE",
    "DENIED",
    "FAIL",
    "UNAUTHORIZED",
    "NON_WHITELISTED_IP",
  ],
  PROCESSING: ["PROCESSING", "PENDING"],
};

const getPaymentStatus = (status: string) => {
  const paymentStatus = status.toUpperCase();

  for (const wStatus in WebhookStatus) {
    const statusArr = WebhookStatus[wStatus as keyof typeof WebhookStatus];
    if (statusArr.includes(paymentStatus)) return wStatus;
  }
};

const updatePayinStatus = async (
  data: Paydunia.StatusResponse,
  // transaction: Partial<Transaction>,
  id: string,
  requestId: requestId,
  PAYIN_GATEWAY: PAYIN
) => {
  // INITIAL PAYMENT OBJECT
  let mt5_user_id;

  const paymentObj = {
    pg_order_id: "",
    status: "",
    payment_status: "",
    utr_id: "",
    payment_order_id: "",
    payin_message: "",
    api_error: "",
  };
  let transactionExists = null;
  logger.debug("Updating Payin Status", { requestId, PAYMENT_GATEWAY: PAYIN_GATEWAY, id, data });

  // CASHFREE
  if (PAYIN_GATEWAY === PAYIN_SERVICE.PAYDUNIA) {
    const { statement } = data as Paydunia.StatusResponse;
    if (!statement) {
      logger.error("Paydunia Transaction Details not found", { requestId, data, id });
      throw new Error("Transaction Details not found");
    }
    const { rrn_no, status, transaction_id } = statement;

    const transaction = await depositRepo.getTransactionByFilter({ pg_order_id: id });
    if (!transaction) {
      logger.error("Paydunia Transaction not found", { requestId, data, id });
      throw new Error("Paydunia Transaction not found");
    }
    transactionExists = transaction;

    const paymentStatus = getPaymentStatus(status);
    if (!paymentStatus) {
      logger.error("Unhandled Transaction Status received from Paydunia", {
        requestId,
        data,
        status,
        paymentStatus,
      });
      throw new Error("Unhandled Transaction Status");
    }

    const txnStatus = paymentStatus.toLowerCase();
    mt5_user_id = transactionExists.mt5_user_id;

    paymentObj.status = txnStatus;
    paymentObj.pg_order_id = id;
    paymentObj.payment_status = paymentStatus;
    if (rrn_no) paymentObj.utr_id = rrn_no;
    if (transaction_id) paymentObj.payment_order_id = transaction_id;
  }

  // UPDATE PAYMENT STATUS IN DB
  if (!transactionExists?.transaction_id) {
    logger.error("Transaction not found", { requestId, data, id, PAYMENT_GATEWAY: PAYIN_GATEWAY });
    throw new Error("Transaction Not Found");
  }

  const paymentStatus = paymentObj.payment_status;
  const txnStatus = paymentObj.status as transaction_status;
  const transaction_id = transactionExists.transaction_id;

  type resObj = {
    status: boolean;
    message: string;
    data: Deposit | PgTransaction | null;
  };

  const resObj: resObj = {
    status: true,
    message: "",
    data: null,
  };

  if (paymentStatus === "PENDING" && txnStatus !== "pending") {
    resObj.message = "Transaction Status on gateway has changed. Please Try Again";
  } else if (["FAILED", "REFUND"].includes(paymentStatus) && txnStatus === "success") {
    resObj.message = "Transaction was already Resolved. Cannot Revert Status.";
  } else {
    const isProcessing = ["SUCCESS", "PENDING"].includes(paymentStatus);

    const updatedTxn = await depositRepo.updateTransaction(
      { transaction_id },
      {
        status: paymentStatus !== Status.FAILED ? Status.PROCESSING : Status.FAILED,
        payin_status: paymentStatus as transaction_status,
        payment_status: paymentStatus,
        payin_message: paymentObj.payin_message,
        api_error: paymentObj.api_error,
        utr_id: transactionExists.utr_id || paymentObj.utr_id,
        payment_order_id: paymentObj.payment_order_id,
        pg_task: isProcessing,
        ...(!isProcessing && {
          pg_id: null,
          pg_order_id: null,
          payment_status: null,
          payment_order_id: null,
          utr_id: null,
          pg_task: false,
        }),
      }
    );
    resObj.message = `Transaction Status has been updated to ${txnStatus}`;
    resObj.data = updatedTxn;
  }

  if (transaction_id && txnStatus === Status.SUCCESS && mt5_user_id) {
    await depositHelper.addTransactionOnMt5(transaction_id, mt5_user_id, requestId);
  }

  return resObj;
};

export { createPayinData, updatePayinStatus };
