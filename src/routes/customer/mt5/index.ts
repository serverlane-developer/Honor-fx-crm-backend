import express from "express";

import withdrawRouter from "./withdraw";
import depositRouter from "./deposit";
import userRouter from "./user";
import transactionRouter from "./transaction"

const router = express.Router();

router.use("/withdraw", withdrawRouter);
router.use("/deposit", depositRouter);
router.use("/user", userRouter);
router.use("/transaction", transactionRouter);

export default router;
