import express from "express";

import auth from "../../middleware/customerAuth";

import authRouter from "./auth";
import selfRouter from "./self";
import paymentMethodRouter from "./paymentMethod"

const router = express.Router();

router.use("/auth", authRouter);
router.use("/self", [auth], selfRouter);
router.use("/payment-method", [auth], paymentMethodRouter);

export default router;
