import express from "express";

import accessControl from "../../middleware/accessControl";
import payoutRouter from "./payout";
import payinRouter from "./payin";

const router = express.Router();

router.use("/payout", [accessControl], payoutRouter);
router.use("/payin", [accessControl], payinRouter);

export default router;
