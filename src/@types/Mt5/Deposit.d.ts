interface DepositRequest {
  mt5_id: string;
  amount: string;
}

interface DepositResponse {
  status: boolean;
  statusCode: number;
  message: string;
  result: null | {
    mt5_id: number;
    dealid: number;
    deposited_amount: string;
    margin: number;
    freemargin: number;
    equity: number;
  };
}

export { DepositRequest, DepositResponse };
