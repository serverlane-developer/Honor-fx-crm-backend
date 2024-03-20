interface RegisterRequest {
  client_name: string;
  email: string;
  country: string;
  leverage: number;
}

interface RegisterResponse {
  status: boolean;
  statusCode: number;
  message: string;
  result: null | {
    mt5_id: number;
    master_password: string;
    investor_password: string;
    leverage: string;
    mt_group: string;
    client_name: string;
    email: string;
    country: string;
  };
}

export { RegisterRequest, RegisterResponse };
