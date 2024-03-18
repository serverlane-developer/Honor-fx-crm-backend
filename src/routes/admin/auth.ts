import express from "express";

import adminCtrl from "../../controllers/admin/auth";
import auth from "../../middleware/auth";

const router = express.Router();

router.post("/signin", adminCtrl.signin);
router.post("/verify-otp", adminCtrl.verifyOtp);
router.post("/resend-otp", adminCtrl.resendOtp);

router.post("/signout", [auth], adminCtrl.signout);

router.put("/update-password", [auth], adminCtrl.updatePassword);
router.post("/forgot-password", adminCtrl.forgotPassword);
router.put("/reset-password", adminCtrl.resetPassword);

router.post("/toggle-2fa", [auth], adminCtrl.toggle2faStatus);
router.put("/confirm-2fa", [auth], adminCtrl.confirm2faToggle);

export default router;
