import express from "express";

import transactionCtrl from "../../controllers/transaction";

const router = express.Router();

router.post("/approve/:transaction_id", transactionCtrl.withdraw.approveTransaction);
router.post("/retry/payout/:transaction_id", transactionCtrl.withdraw.retryPayout);

router.put("/payout-status/:pg_order_id", transactionCtrl.withdraw.updatePaymentStatus);
router.put("/payout-status", transactionCtrl.withdraw.updateMultiplePaymentStatus);
router.put("/pg-transaction-status/:pg_order_id", transactionCtrl.withdraw.updatePgTransactionStatus);

router.get("/payment-history/:transaction_id", transactionCtrl.withdraw.getPaymentHistory);
router.get("/history/:transaction_id", transactionCtrl.withdraw.getTransactionHistory);
router.get("/:status", transactionCtrl.withdraw.getTransactions);

export default router;
