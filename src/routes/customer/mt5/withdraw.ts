import express from "express";

import customerCtrl from "../../../controllers/customer/mt5/withdraw";

const router = express.Router();

router.post("/", customerCtrl.createWithdraw);

router.get("/:status", customerCtrl.getWithdrawList);
router.get("/", customerCtrl.getWithdrawList);

export default router;
