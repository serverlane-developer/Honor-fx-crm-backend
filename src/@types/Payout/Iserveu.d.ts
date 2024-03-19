import { payment_req_method } from "../database/Withdraw";

type PayoutRequest = {
  pg_order_id: string;
  transaction_id: string;
  amount: number;
  beneName: string;
  benePhoneNo: string;
  beneAccountNo: string;
  beneifsc: string;
  beneBankName: string;
  clientReferenceNo: string;
  fundTransferType: payment_req_method;
  custName: string;
  custMobNo: string;
  pincode: number;
  latlong: string;
};

type PayoutResponse = {
  status: string;
  subStatus: number;
  statusDesc: string;
  rrn: string;
  transactionId: number;
  beneName: string;
  beneAccountNo: string;
  beneifsc: string;
  benePhoneNo: number;
  beneBankName: string;
  clientReferenceNo: string;
  txnAmount: number;
  txnType: string;
  latlong: string;
  pincode: number;
  custName: string;
  custMobNo: number;
  dateTime: string;
  paramA: string;
  paramB: string;
};

/** POSSIBLE RESPONSE
  {
    "status": "SUCCESS",
    "subStatus": 0,
    "statusDesc": "CO00 - Transaction is Successful",
    "rrn": "2234543565",
    "transactionId": 102283304115791,
    "beneName": "Rajesh Kumar Nayak",
    "beneAccountNo": "33171402473",
    "beneifsc": "SBIN0001083",
    "benePhoneNo": 7381279922,
    "beneBankName": "State Bank of India",
    "clientReferenceNo": "22345231232231",
    "txnAmount": 100,
    "txnType ":"IMPS",
    "latlong": "22.8031731,88.7874172",
    "pincode":751024,
    "custName:"Vijay Nayak",
    "custMobNo":9821361027,
    "dateTime": "09-23-2022 05:03:20",
    "paramA": "",
    "paramB": ""
  }     
*/

/*
  subStatus:
    * success 0
    * inprogress 1
    * failed -1
*/

/** Sub Status Description
  FAILED        -1  Failed from Bank
  FAILED         2  Failed from wallet
  FAILED        -2  Failed from IServeU
  INPROGRESS     1  Transaction In Progress
  SUCCESS        0  Transaction success
*/

type TransactionStatus = {
  statusDesc: string;
  rrn: string;
  status: string;
  bankRefNumber?: string;
  reason?: string;
  dataObj?: string;
  statusCode?: number;
  createdDate?: string;
};

/** 
  * Request BODY
  {
    "rrn": "236211764895",
    "status": "SUCCESS",
    "statusDesc": "Transaction is Inprogress",
    "bankRefNumber": "NPCI8098709002022",
    "userType": "RECON"
  }

  * RESPONSE
  {
    "statusCode": 0,
    "statusDesc":"SUCCESS",
    "dataObj": "This Transaction has Already updated as Successful"
  }
  */

export { PayoutRequest, PayoutResponse, TransactionStatus };
