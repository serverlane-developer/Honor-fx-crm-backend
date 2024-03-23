import express from "express";

import customerCtrl from "../../controllers/customer/paymentGateway";

const router = express.Router();

router.get("/:pg_type", customerCtrl.getPaymentGateway);

export default router;
