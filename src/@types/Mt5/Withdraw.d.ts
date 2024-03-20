interface WithdrawRequest {
  mt5_id: string;
  amount: string;
}

interface WithdrawResponse {
  status: boolean;
  statusCode: number;
  message: string;
  result?: {
    mt5_id: number;
    dealid: number;
    withdrawn_amount: string;
    margin: number;
    freemargin: number;
    equity: number;
  };
}

export { WithdrawRequest, WithdrawResponse };
