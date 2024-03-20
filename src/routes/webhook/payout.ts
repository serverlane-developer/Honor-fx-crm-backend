import express from "express";

import webhookCtrl from "../../controllers/webhook/payout";

const router = express.Router();

router.post("/paycoons", webhookCtrl.paycoons);
router.post("/zapay", webhookCtrl.zapay);
router.post("/ismartpay", webhookCtrl.ismartpay);
router.post("/payanytime", webhookCtrl.payanytime);
router.post("/finixpay", webhookCtrl.finixpay);

export default router;
