import express from "express";

import transactionCtrl from "../../controllers/transaction";

const router = express.Router();

router.post("/paycoons", transactionCtrl.webhook.paycoons);
router.post("/zapay", transactionCtrl.webhook.zapay);
router.post("/ismartpay", transactionCtrl.webhook.ismartpay);
router.post("/payanytime", transactionCtrl.webhook.payanytime);
router.post("/finixpay", transactionCtrl.webhook.finixpay);

export default router;
