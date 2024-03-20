import * as Paydunia from "./Paydunia";

const enum PAYIN_SERVICE {
  PAYDUNIA = "PAYDUNIA",
}

type PAYIN = keyof typeof PAYIN_SERVICE;

export { PAYIN, PAYIN_SERVICE, Paydunia };
