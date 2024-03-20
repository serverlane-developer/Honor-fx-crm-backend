import express from "express";

import payoutRouter from "./payout";

const router = express.Router();

router.use("/payout", payoutRouter);

export default router;
