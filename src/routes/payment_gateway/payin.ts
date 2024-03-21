import express from "express";

import payinCtrl from "../../controllers/payment_gateway/payin";

const router = express.Router();

router.post("/", payinCtrl.createPayinGateway);
router.put("/:pg_id", payinCtrl.updatePayinGateway);
router.delete("/:pg_id", payinCtrl.deletePayinGateway);

router.get("/:pg_id", payinCtrl.getPayinGatewayById);
router.get("/", payinCtrl.getPayinGateways);

export default router;
