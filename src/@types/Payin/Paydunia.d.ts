type status = "success" | "error";

type possibleResponse =
  | "Success"
  | "Duplicate"
  | "Canceled by User"
  | "Authorization success but error processing recurring payment"
  | "Denied due to fraud detection";

interface PayinRequest {
  // MERCHANT DETAILS
  PAY_ID: number;
  ORDER_ID: string;
  RETURN_URL: string;
  HASH?: string;

  // CUSTOMER DETAILS
  CUST_NAME: string;
  CUST_PHONE: number;
  CUST_EMAIL: string;

  // PAYMENT DETAILS
  AMOUNT: number;
}

interface PayinUrlResponse {
  url: string;
  message: string;
}

interface TransactionResponse {
  CUST_NAME: string;
  AMOUNT: string;
  ORDER_ID: string;
  PAY_ID: string;
  TRANSACTION_ID: string;
  STATUS: string;
  "TEXT MESSAGE": possibleResponse | string;
  HASH: string;
  RRN: string;
  STATUS: status;
  CUST_EMAIL: string;
  CUST_PHONE: string;
  RETURN_URL: string;
}

interface AuthResponse {
  token: string;
}

interface StatusResponse {
  status: boolean;
  message: string;
  statement?: {
    order_id: string;
    transaction_id: string;
    rrn_no: string;
    transaction_date: string;
    cust_name: string;
    cust_email: string;
    cust_phone: string;
    amount: string;
    status: status;
  };
}

export { PayinRequest, PayinUrlResponse, TransactionResponse, AuthResponse, StatusResponse };
