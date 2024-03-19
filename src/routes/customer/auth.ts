import express from "express";

import customerCtrl from "../../controllers/customer/auth";
import auth from "../../middleware/auth";

const router = express.Router();

router.post("/send-otp", customerCtrl.sendOTP);
router.post("/verify-otp", customerCtrl.verifyOTP);
router.post("/resend-otp", customerCtrl.resendOTP);
router.post("/register", customerCtrl.register);

router.post("/signout", [auth], customerCtrl.signout);

router.post("/verify-pin", customerCtrl.verifyPin);
router.put("/update-pin", [auth], customerCtrl.updatePin);

export default router;
