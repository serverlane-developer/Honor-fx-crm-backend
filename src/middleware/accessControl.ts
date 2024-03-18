import { NextFunction, Response } from "express";
import myCache from "memory-cache";

import { Request } from "../@types/Express";
import * as accessControlRepo from "../db_services/access_control_repo";
import logger from "../utils/logger";

interface AssignedSubmodules {
  access_control_id: string;
  submodule_id: string;
  can_create: boolean;
  can_delete: boolean;
  can_read: boolean;
  can_update: boolean;
  submodule_name: string;
  module_name: string;
  role_created_by: string;
  role_name: string;
}

const methodRight = {
  GET: "can_read",
  POST: "can_create",
  PUT: "can_update",
  DELETE: "can_delete",
};

const accessControl = async (req: Request, res: Response, next: NextFunction) => {
  const { user, requestId } = req;
  try {
    if (!user)
      return res.status(401).json({
        status: false,
        message: "You are not allowed to access this module",
        data: null,
      });

    const cacheKey = `${user.role_id}-routes`;

    const userData = myCache.get(cacheKey);

    let assignedSubmodules: AssignedSubmodules[] = [];

    const moduleRoutes = req.baseUrl.split("/");
    let [, , , moduleName, submoduleName] = moduleRoutes;
    moduleName = moduleName.replace(/ /g, "").toLowerCase();
    submoduleName = submoduleName.replace(/ /g, "").toLowerCase();

    const method = req.method as "POST" | "GET" | "PUT" | "DELETE";

    let role_created_by = "";
    let role_name = "";

    if (!userData) {
      const allAllowedRoutes = await accessControlRepo.getAccessControlByRoleId(user.role_id);
      assignedSubmodules = allAllowedRoutes.map((m: AssignedSubmodules) => {
        if (!role_created_by) role_created_by = m.role_created_by;
        if (!role_name) role_name = m.role_name;
        return {
          ...m,
          module_name: m.module_name.replace(/ /g, "").toLowerCase(),
        };
      });
      myCache.put(cacheKey, assignedSubmodules, 86400);
    } else {
      assignedSubmodules = userData;
      const [firstModule] = assignedSubmodules;
      if (firstModule) {
        role_created_by = firstModule.role_created_by;
        role_name = firstModule.role_name;
      }
    }

    req.role_created_by = role_created_by;
    req.role_name = role_name;

    const isAssigned = assignedSubmodules.find(
      (x) => x.module_name === moduleName && x.submodule_name === submoduleName
    );
    if (isAssigned) {
      const accessRightKey = methodRight[method] as "can_read" | "can_create" | "can_update" | "can_delete";
      const hasAccess = isAssigned[accessRightKey];
      if (hasAccess) return next();
    }

    res.status(401).json({
      status: false,
      message: "You are not allowed to access this module",
      data: null,
    });
  } catch (err) {
    logger.error("Error while managing access control", { err, user, requestId });
    res.status(500).json({
      status: false,
      message: "Something went wrong! Please try again",
      data: null,
    });
  }
};

export default accessControl;
