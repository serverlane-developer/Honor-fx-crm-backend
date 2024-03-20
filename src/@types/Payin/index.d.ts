import * as Paydunia from "./Paydunia";

const enum PAYIN_SERVICE {
  PAYDUNIA = "PAYDUNIA",
}

type PAYIN = keyof typeof PAYIN_SERVICE;

type PayinResponse = {
  status: boolean;
  url: string;
  message: string;
  data: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  } | null;
};

export { PAYIN, PAYIN_SERVICE, Paydunia, PayinResponse };
