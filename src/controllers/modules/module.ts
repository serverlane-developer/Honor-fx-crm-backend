import { Response } from "express";

import logger from "../../utils/logger";
import { Request } from "../../@types/Express";

import { Module } from "../../@types/database";
import { count } from "../../@types/Knex";

import * as moduleRepo from "../../db_services/modules_repo";
import validators from "../../validators";

const createModule = async (req: Request, res: Response) => {
  const { user_id, requestId, body } = req;
  try {
    const { module_name }: { module_name: string } = body;
    const bodyValidation = validators.module.newModule.validate({ module_name });
    if (bodyValidation.error) {
      return res.status(400).json({
        status: false,
        message: bodyValidation.error.message,
        data: null,
      });
    }

    const moduleName = moduleRepo.getModuleName(module_name);

    const moduleExists = await moduleRepo.getModuleByFilter({ module_name: moduleName });
    if (moduleExists) {
      return res.status(400).json({
        status: false,
        message: "Module already exists",
        data: null,
      });
    }

    const module = await moduleRepo.createModule({
      module_name: moduleName,
      created_by: user_id,
      updated_by: user_id,
    });

    return res.status(200).json({ status: true, message: "Module Created Successfully", data: { module } });
  } catch (err) {
    const message = "Error while creating module";
    logger.error(message, { err, user_id, requestId, body });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const updateModule = async (req: Request, res: Response) => {
  const { user_id, requestId, body, params } = req;
  const { module_id } = params;

  try {
    const { module_name }: { module_name: string } = body;
    const bodyValidation = validators.module.oldModule.validate({ module_name, module_id });
    if (bodyValidation.error) {
      return res.status(400).json({
        status: false,
        message: bodyValidation.error.message,
        data: null,
      });
    }

    const moduleData = await moduleRepo.getModuleById(module_id);
    if (!moduleData) {
      return res.status(400).json({
        status: false,
        message: "Module not found",
        data: null,
      });
    }

    const moduleName = moduleRepo.getModuleName(module_name);

    const moduleExists = await moduleRepo.getModuleByFilter({ module_name: moduleName });
    if (moduleExists && moduleExists.module_id !== module_id) {
      return res.status(400).json({
        status: false,
        message: "Module name already exists",
        data: null,
      });
    }

    const updateObj = { module_name: moduleName, is_deleted: moduleExists?.is_deleted, updated_by: user_id };
    const module = await moduleRepo.updateModule({ module_id }, updateObj);

    return res.status(200).json({ status: true, message: "Module Updated Successfully", data: { module } });
  } catch (err) {
    const message = "Error while updated module";
    logger.error(message, { err, user_id, requestId, body, module_id });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getModule = async (req: Request, res: Response) => {
  const { user_id, requestId, params } = req;
  const { module_id } = params;
  try {
    const idValidator = validators.common.uuid.required().validate(module_id);
    if (idValidator.error) {
      return res.status(400).json({
        status: false,
        message: "Module ID is invalid",
        data: null,
      });
    }

    const moduleData = await moduleRepo.getModuleById(module_id);
    if (!moduleData) {
      return res.status(400).json({
        status: false,
        message: "Module not found",
        data: null,
      });
    }
    return res.status(200).json({ status: true, message: "Module Found", data: { module: moduleData } });
  } catch (err) {
    const message = "Error while Fetching Module";
    logger.error(message, { err, user_id, requestId, module_id });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getModules = async (req: Request, res: Response) => {
  const { user_id, requestId, query } = req;
  try {
    const { limit: qLimit, skip: qSkip } = query;
    const limit = Number(qLimit || 0) || 0;
    const skip = Number(qSkip || 0) || 0;

    const modules = (await moduleRepo.getAllModules({ limit, skip })) as Partial<Module>[];
    let count = 0;

    if (modules?.length) {
      const allModulesCount = (await moduleRepo.getAllModules({
        limit: null,
        skip: null,
        totalRecords: true,
      })) as count;
      count = Number(allModulesCount?.count);
    }

    return res
      .header("Access-Control-Expose-Headers", "x-total-count")
      .setHeader("x-total-count", count)
      .status(200)
      .json({
        status: true,
        message: "Modules Fetched Successfully",
        data: { modules },
      });
  } catch (err) {
    const message = "Error while fetching all modules";
    logger.error(message, { err, user_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const deleteModule = async (req: Request, res: Response) => {
  const { user_id, requestId, params, body } = req;
  const { module_id } = params;
  const { is_deleted }: { is_deleted: boolean } = body;
  const operation = is_deleted ? "disabled" : "enabled";

  try {
    const validator = validators.common.isDeleted.required().validate({ id: module_id, is_deleted });
    if (validator.error) {
      return res.status(400).json({
        status: false,
        message: "Module ID is invalid",
        data: null,
      });
    }

    const moduleData = await moduleRepo.getModuleByFilter({ module_id });
    if (!moduleData) {
      return res.status(400).json({
        status: false,
        message: "Module not found",
        data: null,
      });
    }

    if (moduleData?.is_deleted === is_deleted) {
      return res.status(200).json({ status: true, message: `Module was already ${operation}`, data: null });
    }

    await moduleRepo.updateModule({ module_id }, { is_deleted });

    return res.status(200).json({ status: true, message: `Module ${operation} successfully`, data: null });
  } catch (err) {
    const message = "Error while deleting module";
    logger.error(message, { err, user_id, requestId, params, body });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getModulesForDropdown = async (req: Request, res: Response) => {
  const { user_id, requestId } = req;
  try {
    let modules = await moduleRepo.getModulesForDropdown();
    if (modules.length) modules = modules.map((x) => ({ ...x, label: moduleRepo.parseModuleName(x.label) }));

    return res.status(200).json({
      status: true,
      message: "Module List for Dropdown Fetched Successfully",
      data: { modules },
    });
  } catch (err) {
    const message = "Error while fetching all modules";
    logger.error(message, { err, user_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

export default {
  createModule,
  updateModule,
  getModule,
  getModules,
  deleteModule,
  getModulesForDropdown,
};
