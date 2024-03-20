import express from "express";

import auth from "../../middleware/customerAuth";

import authRouter from "./auth";
import selfRouter from "./self";
import paymentMethodRouter from "./paymentMethod";
import withdrawRouter from "./withdraw";
import depositRouter from "./deposit";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/self", [auth], selfRouter);
router.use("/payment-method", [auth], paymentMethodRouter);
router.use("/withdraw", [auth], withdrawRouter);
router.use("/deposit", [auth], depositRouter);

export default router;
