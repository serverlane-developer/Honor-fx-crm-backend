import express from "express";

import adminCtrl from "../../controllers/admin/user";
import rolesCtrl from "../../controllers/roles";

const router = express.Router();

router.get("/roles", rolesCtrl.getRolesForDropdown);
router.get("/:user_id", adminCtrl.getAdminById);
router.get("/", adminCtrl.getAdminUsers);

router.put("/:user_id", adminCtrl.updateAdmin);
router.post("/", adminCtrl.createAdmin);
router.delete("/:user_id", adminCtrl.deleteAdmin);

export default router;
