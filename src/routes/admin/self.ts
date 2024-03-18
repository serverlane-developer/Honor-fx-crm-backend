import express from "express";

import adminCtrl from "../../controllers/admin/self";

const router = express.Router();

router.get("/profile", adminCtrl.getProfile);
router.get("/login-history", adminCtrl.getLoginHistory);
router.get("/2fa-status", adminCtrl.get2faStatus);

export default router;
