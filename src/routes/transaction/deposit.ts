import express from "express";

import transactionCtrl from "../../controllers/transaction";

const router = express.Router();

router.get("/history/:transaction_id", transactionCtrl.deposit.getTransactionHistory);
router.get("/:status", transactionCtrl.deposit.getTransactions);

export default router;
