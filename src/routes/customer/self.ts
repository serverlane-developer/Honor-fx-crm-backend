import express from "express";

import customerCtrl from "../../controllers/customer/self";

const router = express.Router();

router.get("/profile", customerCtrl.getProfile);
router.get("/login-history", customerCtrl.getLoginHistory);
router.get("/2fa-status", customerCtrl.get2faStatus);

export default router;
