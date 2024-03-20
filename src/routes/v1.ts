import express from "express";

import auth from "../middleware/auth";

import adminRoutes from "./admin";
import moduleRoutes from "./modules";
import roleRoutes from "./roles";
import customerRoutes from "./customer";
import paymentGatewayRoutes from "./payment_gateway";
import webhookRoutes from "./webhook";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/modules", [auth], moduleRoutes);
router.use("/roles", [auth], roleRoutes);
router.use("/paymentGateway", [auth], paymentGatewayRoutes);

// customer
router.use("/customer", customerRoutes);

// payout
router.use("/webhook", webhookRoutes);

export default router;
