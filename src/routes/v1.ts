import express from "express";

import auth from "../middleware/auth";

import adminRoutes from "./admin";
import moduleRoutes from "./modules";
import roleRoutes from "./roles";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/modules", [auth], moduleRoutes);
router.use("/roles", [auth], roleRoutes);

export default router;
