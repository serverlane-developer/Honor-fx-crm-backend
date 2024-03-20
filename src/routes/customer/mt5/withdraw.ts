import express from "express";

import customerCtrl from "../../../controllers/customer/mt5/withdraw";

const router = express.Router();

router.post("/", customerCtrl.createWithdraw);

export default router;
