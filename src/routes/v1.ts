import express from "express";

import auth from "../middleware/auth";

import adminRoutes from "./admin";
import moduleRoutes from "./modules";
import roleRoutes from "./roles";
import customerRoutes from "./customer";
import paymentGatewayRoutes from "./payment_gateway";
import webhookRoutes from "./webhook";
import transactionRouter from "./transaction";
import usersRouter from "./users";
import referralRouter from "./referral";

const router = express.Router();

// backoffice routes
router.use("/admin", adminRoutes);
router.use("/modules", [auth], moduleRoutes);
router.use("/roles", [auth], roleRoutes);
router.use("/paymentGateway", [auth], paymentGatewayRoutes);
router.use("/transaction", [auth], transactionRouter);
router.use("/users", [auth], usersRouter);
router.use("/referral", [auth], referralRouter);

// frontend routes
router.use("/customer", customerRoutes);

// webhook for external apis
router.use("/webhook", webhookRoutes);

export default router;
