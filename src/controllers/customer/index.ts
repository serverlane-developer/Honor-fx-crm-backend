import auth from "./auth";
import self from "./self";
import paymentMethod from "./paymentMethod";

export default {
  ...auth,
  ...self,
  ...paymentMethod,
};
