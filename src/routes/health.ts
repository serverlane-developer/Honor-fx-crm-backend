import express from "express";

import healthCtrl from "./../controllers/health";

const router = express.Router();

router.route("/").get(healthCtrl.getHealth);

export default router;
