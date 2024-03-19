type PayoutRequest = {
  amount: number;
  transferId: string;
  transferMode: "banktransfer";
  remarks: string;
  beneDetails: {
    bankAccount: string;
    ifsc: string;
    name: string;
    email: string;
    phone: string;
    address1: string;
  };
};

type BalanceResponse = {
  status: string;
  subCode: string;
  message: string;
  data: {
    balance: string;
    availableBalance: string;
  };
};

type TransactionStatus = {
  transferId: string;
  referenceId?: string;
  bankAccount?: string;
  ifsc?: string;
  message?: string;
  beneId: string;
  amount: string;
  status: string;
  utr?: string;
  addedOn: string;
  processedOn: string;
  transferMode: string;
  acknowledged: number;
  reason?: string;
};
/* Possible responses
  {
    "transferId": "sample01139",
    "bankAccount": "000810139000385",
    "ifsc": "YESB0MAN001",
    "beneId": "test_bene",
    "amount": "1.2",
    "status": "SUCCESS",
    "utr": "N351200478962883",
    "addedOn": "2020-12-16 09:17:41",
    "processedOn": "2020-12-16 09:17:42",
    "transferMode": "BANK",
    "acknowledged": 1
  }
  {
    referenceId: 23772415,
    beneId: '',
    amount: '10',
    status: 'REJECTED',
    addedOn: '2022-11-27 20:11:31',
    processedOn: '2022-11-27 20:11:31',
    reason: 'Transfer mode not enabled for the account.',
    transferMode: 'BANK',
    acknowledged: 0
  }
*/

export { PayoutRequest, BalanceResponse, TransactionStatus };
