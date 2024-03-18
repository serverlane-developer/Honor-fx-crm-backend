import express from "express";

import accessControl from "../../middleware/accessControl";
import roleRouter from "./role";

const router = express.Router();

router.use("/role", [accessControl], roleRouter);

export default router;
