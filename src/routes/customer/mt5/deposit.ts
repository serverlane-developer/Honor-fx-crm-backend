import express from "express";

import customerCtrl from "../../../controllers/customer/mt5/deposit";

const router = express.Router();

router.post("/", customerCtrl.createDeposit);

router.get("/:status", customerCtrl.getDepositList);
router.get("/", customerCtrl.getDepositList);

export default router;
