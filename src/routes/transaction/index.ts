import express from "express";

import accessControl from "../../middleware/accessControl";
// import withdrawRouter from "./withdraw";
import withdrawRouter from "./withdraw";
import depositRouter from "./deposit";

const router = express.Router();

router.use("/withdraw", [accessControl], withdrawRouter);
router.use("/deposit", [accessControl], depositRouter);

export default router;
