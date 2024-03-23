import express from "express";

import customerCtrl from "../../../controllers/customer/mt5/transaction";

const router = express.Router();

router.get("/total", customerCtrl.getTotalTransactions);

export default router;
