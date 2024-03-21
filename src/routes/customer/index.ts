import express from "express";

import auth from "../../middleware/customerAuth";

import authRouter from "./auth";
import selfRouter from "./self";
import paymentMethodRouter from "./paymentMethod";
import mt5Router from "./mt5";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/self", [auth], selfRouter);
router.use("/payment-method", [auth], paymentMethodRouter);
router.use("/payment-gateway", [auth], paymentMethodRouter);
router.use("/mt5", [auth], mt5Router);

export default router;
