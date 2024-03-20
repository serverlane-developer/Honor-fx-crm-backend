import express from "express";

import auth from "../middleware/auth";

import adminRoutes from "./admin";
import moduleRoutes from "./modules";
import roleRoutes from "./roles";
import customerRoutes from "./customer";
import paymentGatewayRoutes from "./payment_gateway";
import webhookRoutes from "./webhook";
import transactionRouter from "./transaction";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/modules", [auth], moduleRoutes);
router.use("/roles", [auth], roleRoutes);
router.use("/paymentGateway", [auth], paymentGatewayRoutes);
router.use("/transaction", [auth], transactionRouter);

// customer
router.use("/customer", customerRoutes);

// webhook for external apis
router.use("/webhook", webhookRoutes);

export default router;
