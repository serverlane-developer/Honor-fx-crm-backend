import { PAYIN } from "../../@types/Payin";
import paydunia from "./paydunia";

import * as payinHelper from "./helper";

type serviceType = typeof paydunia;

const PayinServices: Record<PAYIN, serviceType> = {
  PAYDUNIA: paydunia,
};

export { payinHelper, PayinServices };
