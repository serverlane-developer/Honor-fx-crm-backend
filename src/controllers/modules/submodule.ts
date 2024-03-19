import { Response } from "express";

import logger from "../../utils/logger";
import { AdminRequest } from "../../@types/Express";

import * as moduleRepo from "../../db_services/modules_repo";
import * as submoduleRepo from "../../db_services/submodules_repo";
import { Module, Submodule } from "../../@types/database";
import { count } from "../../@types/Knex";
import validators from "../../validators";

const createSubmodule = async (req: AdminRequest, res: Response) => {
  const { user_id, requestId, body } = req;
  try {
    const { submodule_name, module_id }: { submodule_name: string; module_id: string } = body;
    const bodyValidation = validators.submodule.newSubmodule.validate({ submodule_name, module_id });
    if (bodyValidation.error) {
      return res.status(400).json({
        status: false,
        message: bodyValidation.error.message,
        data: null,
      });
    }

    const submoduleName = moduleRepo.getModuleName(submodule_name);

    const moduleExists = await moduleRepo.getModuleByFilter({ module_id });
    if (!moduleExists) {
      return res.status(400).json({
        status: false,
        message: "Module not Found",
        data: null,
      });
    }

    const submoduleExists = await submoduleRepo.getSubmoduleByFilter({ submodule_name: submoduleName, module_id });
    if (submoduleExists) {
      return res.status(400).json({
        status: false,
        message: "Submodule already exists",
        data: null,
      });
    }

    const submodule = await submoduleRepo.createSubmodule({
      submodule_name: submoduleName,
      module_id,
      created_by: user_id,
      updated_by: user_id,
    });

    return res.status(200).json({ status: true, message: "Submodule Created Successfully", data: { submodule } });
  } catch (err) {
    const message = "Error while creating submodule";
    logger.error(message, { err, user_id, requestId, body });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const updateSubmodule = async (req: AdminRequest, res: Response) => {
  const { user_id, requestId, body, params } = req;
  const { submodule_id } = params;
  try {
    const {
      submodule_name,
      module_id,
      is_deleted,
    }: { submodule_name: string; module_id: string; is_deleted: boolean } = body;

    const bodyValidation = validators.submodule.oldSubmodule.validate({
      submodule_id,
      submodule_name,
      module_id,
      is_deleted,
    });
    if (bodyValidation.error) {
      return res.status(400).json({
        status: false,
        message: bodyValidation.error.message,
        data: null,
      });
    }

    const submoduleName = moduleRepo.getModuleName(submodule_name);

    const submoduleExists = await submoduleRepo.getSubmoduleByFilter({ submodule_id });
    if (!submoduleExists) {
      return res.status(400).json({
        status: false,
        message: "Submodule not Found",
        data: null,
      });
    }

    const moduleExists = await moduleRepo.getModuleByFilter({ module_id });
    if (!moduleExists) {
      return res.status(400).json({
        status: false,
        message: "Module not Found",
        data: null,
      });
    }

    const sameNameSubmoduleExists = await submoduleRepo.getSubmoduleByFilter({
      submodule_name: submoduleName,
      module_id,
    });
    if (sameNameSubmoduleExists && submoduleExists.submodule_id !== submodule_id) {
      return res.status(400).json({
        status: false,
        message: "Submodule already exists",
        data: null,
      });
    }

    const updateObj = {
      submodule_name: submoduleName,
      module_id,
      is_deleted: submoduleExists?.is_deleted,
      updated_by: user_id,
    };
    if (!is_deleted) updateObj.is_deleted = false;
    const submodule = await submoduleRepo.updateSubmodule({ submodule_id }, updateObj);

    return res.status(200).json({ status: true, message: "Submodule Updated Successfully", data: { submodule } });
  } catch (err) {
    const message = "Error while updating submodule";
    logger.error(message, { err, user_id, requestId, body, params });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getSubmodule = async (req: AdminRequest, res: Response) => {
  const { user_id, requestId, params } = req;
  const { submodule_id } = params;
  try {
    const idValidator = validators.common.uuid.required().validate(submodule_id);
    if (idValidator.error) {
      return res.status(400).json({
        status: false,
        message: "Submodule ID is invalid",
        data: null,
      });
    }

    const submodule = await submoduleRepo.getSubmoduleById(submodule_id);
    if (!submodule) {
      return res.status(400).json({
        status: false,
        message: "Submodule not found",
        data: null,
      });
    }
    return res.status(200).json({ status: true, message: "Submodule Found", data: { submodule } });
  } catch (err) {
    const message = "Error while fetching submodule";
    logger.error(message, { err, user_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getSubmodules = async (req: AdminRequest, res: Response) => {
  const { user_id, requestId, query } = req;
  try {
    const { limit: qLimit, skip: qSkip, module_id: qModuleId } = query;
    const module_id = qModuleId as string;
    if (!module_id) {
      return res.status(400).json({
        status: false,
        message: "Module ID is required to Fetch Modules",
        data: null,
      });
    }

    const idValidator = validators.common.uuid.required().validate(module_id);
    if (idValidator.error) {
      return res.status(400).json({
        status: false,
        message: "Module ID is invalid",
        data: null,
      });
    }

    const moduleExists = await moduleRepo.getModuleByFilter({ module_id });
    if (!moduleExists) {
      return res.status(400).json({
        status: false,
        message: "Module not Found",
        data: null,
      });
    }

    const limit = Number(qLimit || 0) || 0;
    const skip = Number(qSkip || 0) || 0;

    const submodules = (await submoduleRepo.getAllSubmodules({ limit, skip, module_id })) as Partial<Submodule>[];
    let count = 0;

    if (submodules?.length) {
      const allSubmodulesCount = (await submoduleRepo.getAllSubmodules({
        module_id,
        limit: null,
        skip: null,
        totalRecords: true,
      })) as count;
      count = Number(allSubmodulesCount?.count);
    }

    return res
      .header("Access-Control-Expose-Headers", "x-total-count")
      .setHeader("x-total-count", count)
      .status(200)
      .json({
        status: true,
        message: "Submodules Fetched Successfully",
        data: { submodules },
      });
  } catch (err) {
    const message = "Error while fetching all submodules";
    logger.error(message, { err, user_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getSubmodulesForRoleAssignment = async (req: AdminRequest, res: Response) => {
  const { user_id, requestId } = req;
  try {
    let submodules = (await submoduleRepo.getSubmodulesForRoleAssignment()) as Partial<Submodule & Module>[];
    if (submodules.length > 0)
      submodules = submodules.map((x) => ({
        ...x,
        ...(x.module_name && { module_label: moduleRepo.parseModuleName(x?.module_name) }),
        ...(x.submodule_name && { submodule_label: moduleRepo.parseModuleName(x?.submodule_name) }),
      }));

    return res.status(200).json({
      status: true,
      message: "Submodules Fetched Successfully",
      data: { submodules },
    });
  } catch (err) {
    const message = "Error while fetching all submodules";
    logger.error(message, { err, user_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const deleteSubmodule = async (req: AdminRequest, res: Response) => {
  const { user_id, requestId, params, body } = req;
  const { submodule_id } = params;
  const { is_deleted }: { is_deleted: boolean } = body;
  const operation = is_deleted ? "disabled" : "enabled";
  try {
    const validator = validators.common.isDeleted.required().validate({ id: submodule_id, is_deleted });
    if (validator.error) {
      return res.status(400).json({
        status: false,
        message: "Submodule ID is invalid",
        data: null,
      });
    }

    const submoduleData = await submoduleRepo.getSubmoduleByFilter({ submodule_id });
    if (!submoduleData) {
      return res.status(400).json({
        status: false,
        message: "Submodule not found",
        data: null,
      });
    }

    if (submoduleData?.is_deleted === is_deleted) {
      return res.status(200).json({ status: true, message: `Submodule was already ${operation}`, data: null });
    }

    await submoduleRepo.updateSubmodule({ submodule_id }, { is_deleted });

    return res.status(200).json({ status: true, message: `Submodule ${operation} successfully`, data: null });
  } catch (err) {
    const message = "Error while deleting submodule";
    logger.error(message, { err, user_id, requestId, params, body });
    return res.status(500).json({ status: false, message, data: null });
  }
};

export default {
  createSubmodule,
  updateSubmodule,
  getSubmodule,
  getSubmodules,
  getSubmodulesForRoleAssignment,
  deleteSubmodule,
};
