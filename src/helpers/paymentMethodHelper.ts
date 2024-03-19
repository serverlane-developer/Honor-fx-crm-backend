import { CustomerPaymentMethod } from "../@types/database";
import { encrypt, decrypt } from "./cipher";

const getPaymentMethod = (data: Partial<CustomerPaymentMethod>, type: "encrypt" | "decrypt") => {
  const { account_name, account_number, bank_name, ifsc, upi_id } = data;

  const operation = type === "encrypt" ? encrypt : decrypt;
  if (account_name) data.account_name = operation(account_name);
  if (account_number) data.account_number = operation(account_number);
  if (bank_name) data.bank_name = operation(bank_name);
  if (ifsc) data.ifsc = operation(ifsc);
  if (upi_id) data.upi_id = operation(upi_id);

  return data as CustomerPaymentMethod;
};

export { getPaymentMethod };
