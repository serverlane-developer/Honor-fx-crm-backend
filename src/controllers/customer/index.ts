import auth from "./auth";
import self from "./self";
import paymentMethod from "./paymentMethod";
import mt5 from "./mt5";

export default {
  ...auth,
  ...self,
  ...paymentMethod,
  ...mt5,
};
