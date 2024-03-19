import express from "express";

import webhookRouter from "./webhook";

const router = express.Router();

router.use("/webhook", webhookRouter);

export default router;
