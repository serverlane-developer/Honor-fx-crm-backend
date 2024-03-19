type respCode = "0" | "1" | "2";
type statusCode = "0" | "1" | "2";

type respStatus = "SUCCESS" | "FAILED" | "PENDING";
type txnStatus = "SUCCESS" | "FAILED" | "PENDING";

enum ApiResponseCodes {
  0 = "SUCCESS",
  1 = "FAILED",
  2 = "PENDING",
}

/**
 * SAMPLE PAYOUT REQUEST
  {
    "Merchant_RefID": "OD1234",
    "Beneficiary_Mobile": "7845120635",
    "Beneficiary_Email": "test@mail.com",
    "Beneficiary_Name": "Demo",
    "AccountNo": "987451326540",
    "IFSC": "SBIN0020328",
    "Amount": "13000",
    "TxnMode": "IMPS",
    "Remark": "ft",
    "Hash": "4CBB9D95EABF9FC34265C26881F61F230C68DC37336AA0C9B792149541AFAFB0"
  }
*/
type PayoutRequest = {
  Merchant_RefID: string;
  Beneficiary_Mobile: string;
  Beneficiary_Email: string;
  Beneficiary_Name: string;
  AccountNo: string;
  IFSC: string;
  Amount: string;
  TxnMode: string;
  Remark: string;
  Hash?: string;
};

type Transaction = {
  Merchant_RefID: string;
  Gateway_RefID: string;
  Bank_RefID: string;
  StatusCode: statusCode;
  TxnStatus: txnStatus;
  Transfer_Amount: string;
  Charge: string;
  GST: string;
  TDS: string;
  Total_Amount: string;
  Balance: string;
};

type PayoutResponse = {
  respCode: respCode;
  respStatus: respStatus;
  respMsg: string;
  txnCount: number;
  data: Transaction;
};

/**
 * SAMPLE BALANCE RESPONSE
  {
    "respCode": "0",
    "respStatus": "SUCCESS",
    "respMsg": "Balance fetch successful",
    "data": {
      "balance": "7052.80"
    }
  }
 */
type BalanceResponse = {
  respCode: respCode;
  respStatus: respStatus;
  respMsg: string;
  data: {
    balance: string;
  };
};

type StatusRequest = {
  Merchant_RefID: string;
  Txn_Date: string;
  Hash: string;
};

type StatusResponse = {
  respCode: respCode;
  respStatus: respStatus;
  respMsg: string;
  txnCount: number;
  data: Transaction[];
};

export { PayoutRequest, PayoutResponse, BalanceResponse, StatusRequest, StatusResponse, ApiResponseCodes, Transaction };
