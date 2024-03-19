import { payment_req_method } from "../database/Withdraw";

type PayoutRequest = {
  type: payment_req_method;
  Bank: string;
  MobileNumber: string;
  IFSCCode: string;
  AccountNumber: string;
  RemittanceAmount: number;
  BeneficiaryName: string;

  pg_order_id: string; // changed to client_id before payout request
  // appended before sending payout request
  client_id?: string;
  api_token?: string;
  hash?: string;
};

type TransactionStatus = {
  STATUS: string;
  MSG: string;
  opid?: string;
};

export { PayoutRequest, TransactionStatus };
