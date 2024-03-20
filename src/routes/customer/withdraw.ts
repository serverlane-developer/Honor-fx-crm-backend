import express from "express";

import customerCtrl from "../../controllers/customer/withdraw";

const router = express.Router();

router.post("/", customerCtrl.createWithdraw);

export default router;
