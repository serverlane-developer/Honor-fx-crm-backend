import express from "express";

import accessControl from "../../middleware/accessControl";
import managementRouter from "./management";

const router = express.Router();

router.use("/management", [accessControl], managementRouter);

export default router;
