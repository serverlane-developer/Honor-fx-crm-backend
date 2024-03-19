import { payment_req_method } from "../database/Withdraw";

/** Status Codes
 * INVALID	Some parameters are missing. This error appears when you don't pass mandatory parameters.
 * DUPLICATE	If same order Id used multiple times.
 * UNAUTHORIZED	If tried with invalid MID and KEY.
 * CREATED	Transaction is valid and accepted to proceed further.
 * PENDING	Transaction is pending get final response.
 * FAIL	Transaction is failed. Final response.
 * SUCCESS	Transaction is captured and credited in your account. Final response.
 * DENIED	The transaction is denied if fraud is discovered, VPA or card's daily usage limit is exceeded, or it is blocked. Final response.
 * REFUNDED	The transaction is refunded. Final response.
 */
type status_code =
  | "INVALID"
  | "DUPLICATE"
  | "DENIED"
  | "REFUNDED"
  | "PENDING"
  | "FAIL"
  | "SUCCESS"
  | "CREATED"
  | "UNAUTHORIZED"
  | "NON_WHITELISTED_IP";
/**
 * SAMPLE RESPONSE
  {
    "status": false,
    "status_code": "UNAUTHORIZED",
    "errors": "Unauthorized request"
  }
  {
    status: false,
    status_code: "NON_WHITELISTED_IP",
    errors: "Ip address is not whitelist",
  }
 */
type ErrorResponse = {
  status: boolean;
  status_code: string;
  errors: string;
};

type Wallet = {
  wallet_id: string;
  ballance: number;
  channels: {
    NETBANKING?: boolean;
    UPI?: boolean;
    WALLET?: boolean;
  };
};

type WalletResponse = {
  status: boolean;
  wallet_info: Wallet[];
};

type PayoutRequest = {
  amount: number;
  wallet_id: string;
  currency: "INR";
  purpose: string;
  order_id: string;
  narration: string;
  phone_number: string;
  payment_details: {
    type: "NB";
    account_number: string;
    ifsc_code: string;
    beneficiary_name: string;
    mode: payment_req_method;
  };
};

type Transaction = {
  status: boolean;
  status_code: status_code;
  message: string;
  transaction_id: string;
  amount: number;
  bank_id: string; // utr
  order_id: string; // pg_order_id
  purpose: string;
  narration: string;
  currency: "INR";
  wallet_id: string;
  wallet_name: string;
  created_on: string;
};

type PayoutResponse = Transaction;

type StatusResponse = Transaction;

type WebhookBody = {
  status: boolean;
  status_code: status_code;
  currency: "INR";
  amount: number;
  order_id: string;
  transaction_id: string;
  hash: string;
};

export { ErrorResponse, Wallet, WalletResponse, PayoutRequest, PayoutResponse, StatusResponse, WebhookBody };
