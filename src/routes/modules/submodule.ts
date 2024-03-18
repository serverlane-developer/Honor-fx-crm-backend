import express from "express";

import submodulesCtrl from "../../controllers/modules/submodule";
import modulesCtrl from "../../controllers/modules/module";

const router = express.Router();

router.get("/modules-dropdown", modulesCtrl.getModulesForDropdown);
router.get("/for-assignment", submodulesCtrl.getSubmodulesForRoleAssignment); // all submodules
router.get("/:submodule_id", submodulesCtrl.getSubmodule);
router.get("/", submodulesCtrl.getSubmodules); // all submodules

router.put("/:submodule_id", submodulesCtrl.updateSubmodule);

router.delete("/:submodule_id", submodulesCtrl.deleteSubmodule);

router.post("/", submodulesCtrl.createSubmodule);

export default router;
