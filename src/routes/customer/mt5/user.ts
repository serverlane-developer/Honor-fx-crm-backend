import express from "express";

import customerCtrl from "../../../controllers/customer/mt5/user";

const router = express.Router();

router.post("/", customerCtrl.createUser);

export default router;
