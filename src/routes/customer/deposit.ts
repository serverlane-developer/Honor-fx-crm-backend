import express from "express";

import customerCtrl from "../../controllers/customer/deposit";

const router = express.Router();

router.post("/", customerCtrl.createDeposit);

export default router;
