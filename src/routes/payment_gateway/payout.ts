import express from "express";

import payoutCtrl from "../../controllers/payment_gateway/payout";

const router = express.Router();

router.post("/", payoutCtrl.createPayoutGateway);
router.put("/:pg_id", payoutCtrl.updatePayoutGateway);
router.delete("/:pg_id", payoutCtrl.deletePayoutGateway);

router.get("/balance/:pg_id", payoutCtrl.getBalance);
router.get("/:pg_id", payoutCtrl.getPayoutGatewayById);
router.get("/", payoutCtrl.getPayoutGateways);

export default router;
