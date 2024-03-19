import { PAYOUT } from "../../@types/Payout";
import cashfree from "./cashfree";
import qikpay from "./qikpay";
import easypaymentz from "./easypaymentz";
import iserveu from "./iserveu";
import paycoons from "./paycoons";
import zapay from "./zapay";

import * as payoutHelper from "./helper";
import ismartpay from "./ismartpay";
import payanytime from "./payanytime";
import finixpay from "./finixpay";

type serviceType =
  | typeof cashfree
  | typeof qikpay
  | typeof easypaymentz
  | typeof iserveu
  | typeof paycoons
  | typeof zapay
  | typeof ismartpay
  | typeof payanytime
  | typeof finixpay;

const PayoutServices: Record<PAYOUT, serviceType> = {
  CASHFREE: cashfree,
  QIKPAY: qikpay,
  EASYPAYMENTZ: easypaymentz,
  ISERVEU: iserveu,
  PAYCOONS: paycoons,
  ZAPAY: zapay,
  ISMARTPAY: ismartpay,
  PAYANYTIME: payanytime,
  FINIXPAY: finixpay,
};

export { payoutHelper, PayoutServices };
