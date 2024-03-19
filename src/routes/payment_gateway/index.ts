import express from "express";

import accessControl from "../../middleware/accessControl";
import payoutRouter from "./payout";

const router = express.Router();

router.use("/payout", [accessControl], payoutRouter);

export default router;
