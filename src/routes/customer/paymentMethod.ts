import express from "express";

import customerCtrl from "../../controllers/customer/paymentMethod";

const router = express.Router();

router.get("/", customerCtrl.getPaymentMethods);
router.put("/", customerCtrl.togglePaymentMethod);
router.post("/", customerCtrl.createPaymentMethod);

export default router;
