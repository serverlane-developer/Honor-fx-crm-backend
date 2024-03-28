import express from "express";

import referralCtrl from "../../controllers/referral/management";

const router = express.Router();

router.get("/code/:user_id", referralCtrl.getReferralCode);
router.get("/code", referralCtrl.getReferralCode);
router.get("/list", referralCtrl.getReferralList);
router.get("/customers/:referral_id", referralCtrl.getCustomersByReferralId);

router.put("/code/:user_id", referralCtrl.updateReferralCode);
router.put("/code", referralCtrl.updateReferralCode);

export default router;
