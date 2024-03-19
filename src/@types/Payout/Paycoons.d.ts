import { payment_req_method } from "../database/Withdraw";

type PayoutRequest = {
  payout_refno: string;
  amount: number;
  payout_mode: payment_req_method;
  user_mobile_number: string;
  account_name: string;
  account_no: string;
  ifsc: string;
};

type PaycoonsResponse = {
  status: string;
  response_code: string;
  message: string;
  data?: string;
};
/** POSSIBLE RESPONSE
  * RESPONSE 1
  {
    status: 'true',
    response_code: '1',
    message: 'Something Went Wrong',
    data: 'Object reference not set to an instance of an object.'
  }

  * RESPONSE 2
  {
    status: 'false',
    response_code: '2',
    message: 'Insufficient Wallet Balance (11.60)'
  }
*/

type StatusResponse = {
  status: string;
  response_code: string;
  message: string;
  Status: string;
  rrn?: string;
  accountnumber: string;
  ifsc: string;
};
/** POSSIBLE RESPONSE
  {
    status: 'true',
    response_code: '1',
    message: 'Transaction Found',
    Status: 'Hold',
    rrn: '',
    accountnumber: 'XXXXXXXXXXX',
    ifsc: 'XXXXXXXXXXX'
  }
*/

type BalanceResponse = {
  status: string;
  response_code: string;
  message: string;
  balance: string;
};

type TransactionStatus = {
  status: string;
  response_code: string;
  message: string;
  payout_ref: string;
  Amount: string;
  rrn?: string;
  accountnumber?: string;
  ifsc?: string;
};
/* Possible responses
  {
    status: "true",
    response_code: "1",
    message: "Transaction Successfull",
    payout_ref: "2154785412544",
    Amount: "100",
    rrn: "325487745521",
  }
  {
    status: "true",
    response_code: "1",
    message: "Transaction Found",
    Status: "Hold",
    rrn: "",
    accountnumber: "XXXXXXXXXXX",
    ifsc: "XXXXXXXXXXX",
  }
  {
    status: "false",
    response_code: "2",
    message: "Transaction Failed",
    payout_ref: "1235478",
  }
*/
export { PayoutRequest, PaycoonsResponse, StatusResponse, BalanceResponse, TransactionStatus };
