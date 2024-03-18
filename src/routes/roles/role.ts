import express from "express";

import rolesCtrl from "../../controllers/roles";

const router = express.Router();

router.get("/", rolesCtrl.getRoles);
router.post("/", rolesCtrl.createRole);
router.get("/:role_id", rolesCtrl.getRole);
router.put("/:role_id", rolesCtrl.updateRole);
router.delete("/:role_id", rolesCtrl.deleteRole);

export default router;
