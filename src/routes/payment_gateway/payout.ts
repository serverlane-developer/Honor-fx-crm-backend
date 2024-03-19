import express from "express";

import pgCtrl from "../../controllers/payment_gateway";

const router = express.Router();

router.post("/", pgCtrl.createPaymentGateway);
router.put("/:pg_id", pgCtrl.updatePaymentGateway);
router.delete("/:pg_id", pgCtrl.deletePaymentGateway);

router.get("/balance/:pg_id", pgCtrl.getBalance);
router.get("/:pg_id", pgCtrl.getPaymentGatewayById);
router.get("/", pgCtrl.getPaymentGateways);

export default router;
