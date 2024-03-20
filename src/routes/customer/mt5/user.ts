import express from "express";

import customerCtrl from "../../../controllers/customer/mt5/user";

const router = express.Router();

router.post("/", customerCtrl.createUser);
router.get("/:mt5_user_id", customerCtrl.getUserById);
router.get("/", customerCtrl.getUsers);

export default router;
