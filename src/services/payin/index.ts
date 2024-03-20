import { PAYIN } from "../../@types/Payin";
import paydunia from "./paydunia";

import * as payoutHelper from "./helper";

type serviceType = typeof paydunia;

const PayinServices: Record<PAYIN, serviceType> = {
  PAYDUNIA: paydunia,
};

export { payoutHelper, PayinServices };
