import * as libphonenumber from "libphonenumber-js";
import { Customer, PgTransaction, Withdraw } from "../../@types/database";
import { requestId } from "../../@types/Common";
import {
  CashFree,
  EasyPaymentz,
  Iserveu,
  QikPay,
  Paycoons,
  PAYOUT_SERVICE,
  ZaPay,
  ISmartPay,
  PAYOUT,
  PayAnyTime,
  FinixPay,
} from "../../@types/Payout";

import { Status, payment_req_method, transaction_status } from "../../@types/database/Withdraw";

import logger from "../../utils/logger";

import * as withdrawRepo from "../../db_services/withdraw_repo";
import * as pgTransactionRepo from "../../db_services/pg_transaction_repo";
import CustomerPaymentMethod from "../../@types/database/CustomerPaymentMethod";
// import { getSourceTransaction } from "../../helpers/withdrawEncryption";

const parsePgOrderIdForIserverU = (id = "") => id.replace(/-/g, "").slice(0, 14); // IServeU

const createPaymentData = (
  pg_order_id: string,
  transaction: Partial<Withdraw>,
  customer: Customer,
  customer_payment_method: CustomerPaymentMethod,
  mode: payment_req_method,
  requestId: requestId
) => {
  const { amount: amt, transaction_id } = transaction as Withdraw;
  const amount = Number(amt);
  const phone = libphonenumber.parsePhoneNumber(customer.phone_number).number;
  const email = customer.email || `${customer.username}@test.com`;
  const remarks = "PG transfer";

  const { account_name, account_number, ifsc: transaction_ifsc, bank_name } = customer_payment_method;
  const ifsc = transaction_ifsc.toUpperCase();

  logger.debug("Creating Payment Data for Payout", { requestId, pg_order_id, transaction });
  // if (PAYMENT_GATEWAY === "CASHFREE") {
  const cashfreeObj: CashFree.PayoutRequest = {
    amount,
    remarks,
    transferId: pg_order_id,
    transferMode: "banktransfer",
    beneDetails: {
      address1: "Dummy Address",
      bankAccount: account_number,
      email,
      ifsc,
      name: account_name,
      phone,
    },
  };
  //   return payoutObj;
  // }
  // if (PAYMENT_GATEWAY === "EASYPAYMENTZ") {
  const easyPaymentzObj: EasyPaymentz.PayoutRequest = {
    amount,
    bankaccount: account_number,
    beneficiaryName: account_name,
    ifsc,
    orderid: pg_order_id,
    phonenumber: phone,
    purpose: remarks,
    requestType: mode,
  };
  //   return payoutObj;
  // }
  // if (PAYMENT_GATEWAY === "QIKPAY") {
  const qikPayObj: QikPay.PayoutRequest = {
    AccountNumber: account_number,
    Bank: bank_name,
    BeneficiaryName: account_name,
    IFSCCode: ifsc,
    MobileNumber: phone,
    pg_order_id,
    RemittanceAmount: amount,
    type: mode,
  };
  //   return payoutObj;
  // }
  // if (PAYMENT_GATEWAY === "ISERVEU") {
  const iserveuObj: Iserveu.PayoutRequest = {
    amount,
    beneAccountNo: account_number,
    beneBankName: bank_name,
    beneifsc: ifsc,
    beneName: account_name,
    benePhoneNo: phone,
    clientReferenceNo: parsePgOrderIdForIserverU(pg_order_id),
    custMobNo: phone,
    custName: account_name,
    fundTransferType: mode,
    latlong: "22.8031731,88.7874172",
    pg_order_id,
    pincode: 751024,
    transaction_id,
  };
  //   return payoutObj;
  // }
  // if (PAYMENT_GATEWAY === "PAYCOONS") {
  const paycoonsObj: Paycoons.PayoutRequest = {
    account_name,
    account_no: account_number,
    amount,
    ifsc,
    payout_mode: mode,
    payout_refno: pg_order_id,
    user_mobile_number: phone,
  };

  const zapayObj: ZaPay.PayoutRequest = {
    AccountNo: account_number,
    Amount: String(amount),
    Beneficiary_Email: email,
    Beneficiary_Mobile: phone,
    Beneficiary_Name: account_name,
    IFSC: ifsc,
    Merchant_RefID: pg_order_id,
    Remark: remarks,
    TxnMode: mode,
  };

  const ismartpayObj: ISmartPay.PayoutRequest = {
    amount: amount,
    currency: "INR",
    narration: remarks,
    order_id: pg_order_id,
    payment_details: {
      account_number,
      beneficiary_name: account_name,
      ifsc_code: ifsc,
      mode,
      type: "NB",
    },
    phone_number: phone,
    purpose: remarks,
    wallet_id: "",
  };

  const payAnyTime: PayAnyTime.PayoutRequest = {
    email,
    phone,
    amount,
    note: remarks,
    account_name,
    account_number,
    ifsc,
    refer_number: pg_order_id,
  };

  const finixpayObj: FinixPay.PayoutRequest = {
    account_name,
    account_no: account_number,
    amount,
    ifsc,
    payout_mode: mode,
    payout_refno: pg_order_id,
    user_mobile_number: phone,
  };

  const payoutObj = {
    ...cashfreeObj,
    ...easyPaymentzObj,
    ...qikPayObj,
    ...iserveuObj,
    ...paycoonsObj,
    ...zapayObj,
    ...ismartpayObj,
    ...payAnyTime,
    ...finixpayObj,
  };
  return payoutObj;
  // }
};

const WebhookStatus = {
  PENDING: ["ACCEPTED", "PENDING", "INPROGRESS", "PROCESSING", "HOLD", "IN PROCESS"],
  SUCCESS: ["SUCCESS", "CREATED", "SUCCESS"],
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
  REFUND: ["REVERSED", "REFUND", "REFUNDED", "REVERTED"],
};

const getPaymentStatus = (status: string) => {
  const paymentStatus = status.toUpperCase();

  for (const wStatus in WebhookStatus) {
    const statusArr = WebhookStatus[wStatus as keyof typeof WebhookStatus];
    if (statusArr.includes(paymentStatus)) return wStatus;
  }
};

const updatePaymentStatus = async (
  data:
    | CashFree.TransactionStatus
    | QikPay.TransactionStatus
    | EasyPaymentz.TransactionStatus
    | Iserveu.TransactionStatus
    | Paycoons.TransactionStatus
    | ZaPay.Transaction
    | ISmartPay.StatusResponse
    | PayAnyTime.TransactionStatus
    | FinixPay.TransactionStatus,
  // transaction: Partial<Transaction>,
  id: string,
  requestId: requestId,
  PAYMENT_GATEWAY: PAYOUT,
  pg_transaction_only: boolean = false
) => {
  // INITIAL PAYMENT OBJECT
  const paymentObj = {
    pg_order_id: "",
    status: "",
    payment_status: "",
    utr_id: "",
    payment_creation_date: "",
    payment_order_id: "",
    under_processing: false,
    message: "",
    api_error: "",
  };
  let transactionExists = null;
  logger.debug("Updating Payment Status", { requestId, PAYMENT_GATEWAY, id, data });

  // CASHFREE
  if (PAYMENT_GATEWAY === PAYOUT_SERVICE.CASHFREE) {
    const { referenceId, message, transferId, status, utr, reason, acknowledged, processedOn } =
      data as CashFree.TransactionStatus;

    const transaction = pg_transaction_only
      ? await pgTransactionRepo.getPgTransactionById(id)
      : await withdrawRepo.getTransactionByFilter({ pg_order_id: id });
    if (!transaction) {
      logger.error("Cashfree Transaction not found", { requestId, data, id });
      throw new Error("Cashfree Transaction not found");
    }
    transactionExists = transaction;

    const paymentStatus = getPaymentStatus(status);
    if (!paymentStatus) {
      logger.error("Unhandled Transaction Status received from Cashfree", {
        requestId,
        data,
        status,
        paymentStatus,
      });
      throw new Error("Unhandled Transaction Status");
    }

    const txnStatus = paymentStatus.toLowerCase();

    paymentObj.status = txnStatus;
    paymentObj.pg_order_id = transferId;
    paymentObj.payment_status =
      paymentStatus === "SUCCESS" ? (acknowledged ? paymentStatus.toLowerCase() : "PENDING") : paymentStatus;
    paymentObj.payment_creation_date = processedOn;
    if (utr) paymentObj.utr_id = utr;
    if (referenceId) paymentObj.payment_order_id = referenceId;
    if (message) paymentObj.message = message;
    if (reason) paymentObj.api_error = reason;
    paymentObj.under_processing =
      paymentStatus === "PENDING" ? true : paymentStatus === "SUCCESS" ? !acknowledged : false;
  }

  // EASYPAYMENTZ
  if (PAYMENT_GATEWAY === PAYOUT_SERVICE.EASYPAYMENTZ) {
    const { creationDate, merchantOrderId, orderid, pgOrderId, status, message, transactionMessage, utrId, utrid } =
      data as EasyPaymentz.TransactionStatus;

    const transaction = pg_transaction_only
      ? await pgTransactionRepo.getPgTransactionById(id)
      : await withdrawRepo.getTransactionByFilter({ pg_order_id: id });
    if (!transaction) {
      logger.error("EasyPaymentz Transaction not found", { requestId, data, id });
      throw new Error("EasyPaymentz Transaction not found");
    }
    transactionExists = transaction;

    const paymentStatus = getPaymentStatus(status);
    if (!paymentStatus) {
      logger.error("Unhandled Transaction Status received from EasyPaymentz", {
        requestId,
        data,
        status,
        paymentStatus,
      });
      throw new Error("Unhandled Transaction Status");
    }

    const utr = utrId || utrid;
    const paymentOrderId = pgOrderId || merchantOrderId;

    const txnStatus = paymentStatus.toLowerCase();

    paymentObj.status = txnStatus;
    paymentObj.pg_order_id = orderid;
    paymentObj.payment_status = paymentStatus;
    paymentObj.payment_creation_date = creationDate;
    if (utr) paymentObj.utr_id = utr;
    if (paymentOrderId) paymentObj.payment_order_id = paymentOrderId;
    if (transactionMessage || message) paymentObj.message = transactionMessage || message;
    paymentObj.under_processing = paymentStatus === "PENDING";
  }

  // QIKPAY
  if (PAYMENT_GATEWAY === PAYOUT_SERVICE.QIKPAY) {
    const { MSG, STATUS, opid } = data as QikPay.TransactionStatus;

    const transaction = pg_transaction_only
      ? await pgTransactionRepo.getPgTransactionById(id)
      : await withdrawRepo.getTransactionByFilter({ pg_order_id: id });
    if (!transaction) {
      logger.error("QIKPAY Transaction not found", { requestId, data, id });
      throw new Error("QIKPAY Transaction not found");
    }
    transactionExists = transaction;

    const { pg_order_id } = transaction;

    const paymentStatus = getPaymentStatus(STATUS);
    if (!paymentStatus) {
      logger.error("Unhandled Status received from QikPay", {
        requestId,
        data,
        STATUS,
        paymentStatus,
      });
      throw new Error("Unhandled Transaction Status");
    }

    const txnStatus = paymentStatus.toLowerCase();

    paymentObj.status = txnStatus;
    if (pg_order_id) paymentObj.pg_order_id = pg_order_id;
    paymentObj.payment_status = paymentStatus;
    if (opid) paymentObj.utr_id = opid;
    if (MSG && paymentStatus === "FAILED") paymentObj.api_error = MSG;
    else if (MSG) paymentObj.message = MSG;
    paymentObj.under_processing = paymentStatus === "PENDING";
  }

  // ISERVEU
  if (PAYMENT_GATEWAY === PAYOUT_SERVICE.ISERVEU) {
    const { bankRefNumber, status, statusDesc, reason, rrn, createdDate } = data as Iserveu.TransactionStatus;

    const transaction = pg_transaction_only
      ? await pgTransactionRepo.getPgTransactionById(id)
      : await withdrawRepo.getTransactionByFilter({ payment_order_id: id });
    if (!transaction) {
      logger.error("IserveU Transaction not found", { requestId, data, id });
      throw new Error("IserveU Transaction not found");
    }
    transactionExists = transaction;

    const { pg_order_id } = transaction;

    const paymentStatus = getPaymentStatus(status);
    if (!paymentStatus) {
      logger.error("Unhandled Status received from IserveU", {
        requestId,
        data,
        status,
        txnStatus: paymentStatus,
      });
      throw new Error("Unhandled Transaction Status");
    }

    const txnStatus = paymentStatus.toLowerCase();

    paymentObj.status = txnStatus;
    if (pg_order_id) paymentObj.pg_order_id = pg_order_id;
    paymentObj.payment_status = paymentStatus;
    if (createdDate) paymentObj.payment_creation_date = createdDate;
    if (bankRefNumber) paymentObj.utr_id = bankRefNumber;
    paymentObj.payment_order_id = rrn;
    if (statusDesc) paymentObj.message = statusDesc;
    if (reason) paymentObj.api_error = reason;
    paymentObj.under_processing = paymentStatus === "PENDING";
  }

  // PAYCOONS
  if (PAYMENT_GATEWAY === PAYOUT_SERVICE.PAYCOONS) {
    const { message, payout_ref, status, rrn } = data as Paycoons.TransactionStatus;

    const transaction = pg_transaction_only
      ? await pgTransactionRepo.getPgTransactionById(id)
      : await withdrawRepo.getTransactionByFilter({ pg_order_id: id });
    if (!transaction) {
      logger.error("Paycoons Transaction Not Found", { requestId, data, id });
      throw new Error("Paycoons Transaction Not Found");
    }
    transactionExists = transaction;

    const paymentStatus = getPaymentStatus(status);
    if (!paymentStatus) {
      logger.error("Unhandled Status received from Paycoons", {
        requestId,
        data,
        status,
        txnStatus: paymentStatus,
      });
      throw new Error("Unhandled Transaction Status");
    }

    const txnStatus = paymentStatus.toLowerCase();

    paymentObj.status = txnStatus;
    paymentObj.pg_order_id = payout_ref;
    paymentObj.payment_status = paymentStatus;
    if (rrn) paymentObj.utr_id = rrn;
    if (message && paymentStatus === "FAILED") paymentObj.api_error = message;
    if (message) paymentObj.message = message;
    paymentObj.under_processing = paymentStatus === "PENDING";
  }

  // ZAPAY
  if (PAYMENT_GATEWAY === PAYOUT_SERVICE.ZAPAY) {
    const { Bank_RefID, Gateway_RefID, Merchant_RefID, TxnStatus } = data as ZaPay.Transaction;

    const transaction = pg_transaction_only
      ? await pgTransactionRepo.getPgTransactionById(id)
      : await withdrawRepo.getTransactionByFilter({ pg_order_id: id });
    if (!transaction) {
      logger.error("Zapay Transaction Not Found", { requestId, data, id });
      throw new Error("Zapay Transaction Not Found");
    }
    transactionExists = transaction;

    const paymentStatus = getPaymentStatus(TxnStatus);
    if (!paymentStatus) {
      logger.error("Unhandled Status received from Zapay", {
        requestId,
        data,
        TxnStatus,
        txnStatus: paymentStatus,
      });
      throw new Error("Unhandled Transaction Status");
    }

    const txnStatus = paymentStatus.toLowerCase();

    paymentObj.status = txnStatus;
    paymentObj.pg_order_id = Merchant_RefID;
    paymentObj.payment_order_id = Gateway_RefID;
    paymentObj.payment_status = paymentStatus;
    if (Bank_RefID) paymentObj.utr_id = Bank_RefID;
    paymentObj.under_processing = paymentStatus === "PENDING";
  }

  // ISMARTPAY
  if (PAYMENT_GATEWAY === PAYOUT_SERVICE.ISMARTPAY) {
    const { bank_id, created_on, message, order_id, status_code, transaction_id } = data as ISmartPay.StatusResponse;

    const transaction = pg_transaction_only
      ? await pgTransactionRepo.getPgTransactionById(id)
      : await withdrawRepo.getTransactionByFilter({ pg_order_id: id });
    if (!transaction) {
      logger.error("ISmartpay Transaction Not Found", { requestId, data, id });
      throw new Error("ISmartpay Transaction Not Found");
    }
    transactionExists = transaction;

    const paymentStatus = getPaymentStatus(status_code);
    if (!paymentStatus) {
      logger.error("Unhandled Status received from ISmartpay", {
        requestId,
        data,
        status_code,
        txnStatus: paymentStatus,
      });
      throw new Error("Unhandled Transaction Status");
    }

    const txnStatus = paymentStatus.toLowerCase();

    paymentObj.status = txnStatus;
    paymentObj.pg_order_id = order_id;
    paymentObj.payment_order_id = transaction_id;
    paymentObj.payment_status = paymentStatus;
    paymentObj.under_processing = paymentStatus === "PENDING";
    paymentObj.payment_creation_date = created_on;
    if (bank_id) paymentObj.utr_id = bank_id;
    if (message && paymentStatus === "FAILED") paymentObj.api_error = message;
    else if (message) paymentObj.message = message;
  }

  // PAYANYTIME
  if (PAYMENT_GATEWAY === PAYOUT_SERVICE.PAYANYTIME) {
    const { response } = data as PayAnyTime.TransactionStatus;
    const { records } = response;
    const { decentro_txn_id, transaction_status, utr } = records;

    const transaction = pg_transaction_only
      ? await pgTransactionRepo.getPgTransactionById(id)
      : await withdrawRepo.getTransactionByFilter({ pg_order_id: id });
    if (!transaction) {
      logger.error("PayAnyTime Transaction Not Found", { requestId, data, id });
      throw new Error("PayAnyTime Transaction Not Found");
    }
    transactionExists = transaction;

    const paymentStatus = transaction_status ? getPaymentStatus(transaction_status) : "PENDING";
    if (!paymentStatus) {
      logger.error("Unhandled Status received from PayAnyTime", {
        requestId,
        data,
        transaction_status,
        txnStatus: paymentStatus,
      });
      throw new Error("Unhandled Transaction Status");
    }

    const txnStatus = paymentStatus.toLowerCase();

    paymentObj.status = txnStatus;
    paymentObj.pg_order_id = id;
    paymentObj.payment_order_id = decentro_txn_id;
    paymentObj.payment_status = paymentStatus;
    paymentObj.under_processing = paymentStatus === "PENDING";
    // paymentObj.payment_creation_date = timestamp;
    if (utr && paymentStatus === "SUCCESS") paymentObj.utr_id = utr;
  }

  // FINIXPAY
  if (PAYMENT_GATEWAY === PAYOUT_SERVICE.FINIXPAY) {
    const { message, payout_ref, Status, rrn } = data as FinixPay.TransactionStatus;

    const transaction = pg_transaction_only
      ? await pgTransactionRepo.getPgTransactionById(id)
      : await withdrawRepo.getTransactionByFilter({ pg_order_id: id });
    if (!transaction) {
      logger.error("FinixPay Transaction Not Found", { requestId, data, id });
      throw new Error("FinixPay Transaction Not Found");
    }
    transactionExists = transaction;

    const paymentStatus = getPaymentStatus(Status);
    if (!paymentStatus) {
      logger.error("Unhandled Status received from FinixPay", {
        requestId,
        data,
        status: Status,
        txnStatus: paymentStatus,
      });
      throw new Error("Unhandled Transaction Status");
    }

    const txnStatus = paymentStatus.toLowerCase();

    paymentObj.status = txnStatus;
    paymentObj.pg_order_id = payout_ref;
    paymentObj.payment_status = paymentStatus;
    if (rrn) paymentObj.utr_id = rrn;
    if (message && paymentStatus === "FAILED") paymentObj.api_error = message;
    if (message) paymentObj.message = message;
    paymentObj.under_processing = paymentStatus === "PENDING";
  }

  // UPDATE PAYMENT STATUS IN DB
  if (!transactionExists?.transaction_id) {
    logger.error("Transaction not found", { requestId, data, id, PAYMENT_GATEWAY });
    throw new Error("Transaction Not Found");
  }

  const paymentStatus = paymentObj.payment_status;
  const txnStatus = paymentObj.status as transaction_status;
  const transaction_id = transactionExists.transaction_id;

  type resObj = {
    status: boolean;
    message: string;
    data: Withdraw | PgTransaction | null;
  };

  const resObj: resObj = {
    status: true,
    message: "",
    data: null,
  };

  if (paymentStatus === "PENDING" && txnStatus !== "pending") {
    resObj.message = "Transaction Status on gateway has changed. Please Try Again";
  } else if (["FAILED", "REFUND"].includes(paymentStatus) && txnStatus === "success") {
    resObj.message = "Transaction was already Paid. Cannot Revert Status.";
  } else {
    const payment_fail_count = ["FAILED", "REFUND"].includes(paymentStatus)
      ? Number(transactionExists.payment_fail_count || 0) + 1
      : transactionExists.payment_fail_count;

    const isProcessing = ["SUCCESS", "PENDING"].includes(paymentStatus);
    const isSuccess = paymentStatus === "SUCCESS";

    let updatedTxn = null;

    if (pg_transaction_only) {
      updatedTxn = await pgTransactionRepo.updatePgTransaction(
        { pg_order_id: id },
        {
          latest_status: paymentStatus,
          latest_message: paymentObj.message || paymentObj.api_error,
          utr_id: paymentObj.utr_id,
          ...(paymentObj.payment_creation_date && { payment_creation_date: paymentObj.payment_creation_date }),
          under_processing: paymentObj.under_processing,
        }
      );
    } else {
      updatedTxn = await withdrawRepo.updateTransaction(
        { transaction_id },
        {
          status: isSuccess ? Status.SUCCESS : Status.PROCESSING,
          payout_status: txnStatus,
          payment_status: paymentStatus,
          payout_message: paymentObj.message,
          api_error: paymentObj.api_error,
          utr_id: transactionExists.utr_id || paymentObj.utr_id,
          payment_order_id: paymentObj.payment_order_id,
          payment_fail_count,
          pg_task: isProcessing,
          ...(!isProcessing && {
            pg_order_id: null,
            payment_status: null,
            payment_order_id: null,
            utr_id: null,
            pg_task: false,
          }),
        }
      );
      if (id) {
        await pgTransactionRepo.updatePgTransaction(
          { pg_order_id: id },
          {
            payment_status: paymentStatus,
            payment_order_id: paymentObj.payment_order_id,
            utr_id: paymentObj.utr_id,
            ...(paymentObj.payment_creation_date && { payment_creation_date: paymentObj.payment_creation_date }),
            under_processing: paymentObj.under_processing,
            api_error: paymentObj.message || paymentObj.api_error,
          }
        );
      }
    }
    resObj.message = `Transaction Status has been updated to ${txnStatus}`;
    resObj.data = updatedTxn;
  }

  return resObj;
};

export { createPaymentData, parsePgOrderIdForIserverU, updatePaymentStatus };
