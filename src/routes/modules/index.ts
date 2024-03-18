import express from "express";

import accessControl from "../../middleware/accessControl";
import moduleRouter from "./module";
import submoduleRouter from "./submodule";

const router = express.Router();

router.use("/module", [accessControl], moduleRouter);
router.use("/submodule", [accessControl], submoduleRouter);

export default router;
