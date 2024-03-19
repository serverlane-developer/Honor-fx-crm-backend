import * as CashFree from "./Cashfree";
import * as QikPay from "./QikPay";
import * as EasyPaymentz from "./EasyPaymentz";
import * as Iserveu from "./Iserveu";
import * as Paycoons from "./Paycoons";
import * as ZaPay from "./ZaPay";
import * as ISmartPay from "./ISmartPay";
import * as PayAnyTime from "./PayAnyTime";
import * as FinixPay from "./FinixPay";


const enum PAYOUT_SERVICE {
  CASHFREE = "CASHFREE",
  QIKPAY = "QIKPAY",
  EASYPAYMENTZ = "EASYPAYMENTZ",
  ISERVEU = "ISERVEU",
  PAYCOONS = "PAYCOONS",
  ZAPAY = "ZAPAY",
  ISMARTPAY = "ISMARTPAY",
  PAYANYTIME = "PAYANYTIME",
  FINIXPAY = "FINIXPAY",
}

type PAYOUT = keyof typeof PAYOUT_SERVICE;

type AccountTransferResponse = {
  status: boolean;
  payment_status: string;
  message: string;
  data: {
    rrn?: string; // for ISERVEU
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  } | null;
};

export {
  PAYOUT,
  PAYOUT_SERVICE,
  AccountTransferResponse,
  CashFree,
  QikPay,
  EasyPaymentz,
  Iserveu,
  Paycoons,
  ZaPay,
  ISmartPay,
  PayAnyTime,
  FinixPay
};
