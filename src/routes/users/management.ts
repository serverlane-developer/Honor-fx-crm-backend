import express from "express";

import usersCtrl from "../../controllers/users";

const router = express.Router();

router.get("/:customer_id/transaction/:transaction_type/:transaction_id", usersCtrl.management.getDetailedTransaction);
router.get("/:customer_id/transactions", usersCtrl.management.getCustomerTransactions);
router.get("/:customer_id/login-history", usersCtrl.management.getLoginHistory);
router.get("/:customer_id/mt5-users", usersCtrl.management.getMt5Users);
router.get("/:customer_id", usersCtrl.management.getCustomerById);
router.get("/", usersCtrl.management.getCustomers);

export default router;
