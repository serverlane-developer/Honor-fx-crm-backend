import express from "express";

import customerCtrl from "../../controllers/customer/paymentMethod";

const router = express.Router();

router.post("/", customerCtrl.createPaymentMethod);
router.get("/", customerCtrl.getPaymentMethods);
router.put("/:payment_method_id", customerCtrl.updatePaymentMethod);
router.delete("/:payment_method_id", customerCtrl.togglePaymentMethod);

export default router;
