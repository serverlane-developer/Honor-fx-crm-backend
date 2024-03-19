type Status = "Success" | "Pending" | "Processing" | "Failed" | "Refund";

type AuthRequest = {
  email: string;
  password: string;
};

type AuthResponse = {
  response: {
    records: {
      user_id: number;
      first_name: string;
      last_name: string;
      full_name: string;
      email: string;
      formattedPhone: string;
      picture: string;
      defaultCountry: string;
      token: string; // use this for auth
      userStatus: string;
    };
  };
};

type BalanceResponse = {
  response: {
    records: [
      {
        balance: string;
        is_default: string; // check for "Yes" if count > 1
        curr_id: number;
        curr_type: string;
        curr_code: string;
        curr_symbol: string;
      }
    ];
  };
};
// {
//   "response": {
//     "records": [
//       {
//         "balance": "0.00",
//         "is_default": "Yes",
//         "curr_id": 1,
//         "curr_type": "fiat",
//         "curr_code": "INR",
//         "curr_symbol": "₹"
//       }
//     ]
//   }
// }

type PayoutRequest = {
  email: string;
  phone: string;
  amount: number;
  note: string;
  account_name: string;
  account_number: string;
  ifsc: string;
  refer_number: string;
};

type PayoutSuccessResponse = {
  response: {
    records: {
      status: Status | false;
      tr_ref_id: number; // secondary payment_order_id
      user_refer: string; // pg_order_id
      charges: string;
      amount: string;
      total_amount: string;
      TxnId: string; // payment_order_id
      bankReferenceNumber: string; // utr
      message?: string;
    };
  };
};

type PayoutErrorResponse = {
  error:
    | string
    | {
        [key: string]: string[] | string;
      };
};

type PayoutResponse = PayoutSuccessResponse | PayoutErrorResponse;

type WebhookBody = {
  user_refer: string;
  trx_id: string;
  payanytime_trx_id: string;
  trx_status: string;
  trx_amount: string;
  bank_reference_number: string;
  beneficiary_name: string;
  timestamp: string;
};
// {
//   "user_refer": "user_refer123",
//   "trx_id": "99125",
//   "payanytime_trx_id": "payanytime_658e95166a14d",
//   "trx_status": "success",
//   "trx_amount": "-21.80000000",
//   "bank_reference_number": "336315199935",
//   "beneficiary_name": "Mr. Himanshu  .",
//   "timestamp": "2023-12-29T15:25:55.724735"
// }

type TransactionStatusRequest = {
  id: string;
  trans_id: string;
};

type TransactionStatus = {
  response: {
    records: {
      error: boolean;
      reference_Id?: string; // pg_order_ud
      transaction_status: Status;
      decentro_txn_id: string;
      utr?: string;
      message? :string;
    };
  };
};

export {
  PayoutRequest,
  AuthRequest,
  AuthResponse,
  BalanceResponse,
  WebhookBody,
  TransactionStatusRequest,
  TransactionStatus,
  PayoutResponse,
};
