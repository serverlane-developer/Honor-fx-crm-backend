import { payment_req_method } from "../database/Withdraw";

type PayoutRequest = {
  phonenumber: string;
  orderid: string;
  amount: number;
  bankaccount: string;
  ifsc: string;
  purpose: string;
  beneficiaryName: string;
  requestType: payment_req_method;
};

type BalanceResponse = {
  walletBalance: string;
};

type TransactionStatus = {
  message: string;
  merchantOrderId: string;
  utrid?: string;
  pgOrderId: string;
  creationDate: string;
  transactionMessage: string;
  orderid: string;
  status: string;
  utrId?: string;
};

export { PayoutRequest, BalanceResponse, TransactionStatus };
