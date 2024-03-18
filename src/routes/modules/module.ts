import express from "express";

import modulesCtrl from "../../controllers/modules/module";

const router = express.Router();

router.get("/:module_id", modulesCtrl.getModule);
router.put("/:module_id", modulesCtrl.updateModule);
router.delete("/:module_id", modulesCtrl.deleteModule);
router.get("/", modulesCtrl.getModules); // all modules
router.post("/", modulesCtrl.createModule);

export default router;
