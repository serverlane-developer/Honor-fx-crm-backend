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
  CUST_NAME
}

export { TransactionRequest };
