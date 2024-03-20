interface TransactionRequest {
  // MERCHANT DETAILS
  PAY_ID: number;
  ORDER_ID: string;
  RETURN_URL: string;
  HASH: string;

  // CUSTOMER DETAILS
  CUST_NAME: string;
  CUST_PHONE: number;
  CUST_EMAIL: string;

  // PAYMENT DETAILS
  AMOUNT: number;
}

interface TransactionResponse {
  CUST_NAME: string;
  AMOUNT: string;
  ORDER_ID: string;
  PAY_ID: string;
  TRANSACTION_ID: string;
  STATUS: string;
  "TEXT MESSAGE": string;
  HASH: string;
  RRN: string;
  STATUS: string;
  CUST_EMAIL: string;
  CUST_PHONE: string;
  RETURN_URL: string;
}

export { TransactionRequest };
