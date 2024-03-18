import { Response } from "express";
import { v4 as uuidv4 } from "uuid";

import myCache from "memory-cache";
import logger from "../../utils/logger";
import { Request } from "../../@types/Express";

import { knex } from "../../data/knex";

import { AccessControl, Role } from "../../@types/database";
import { count } from "../../@types/Knex";

import * as roleRepo from "../../db_services/roles_repo";
import * as accessControlRepo from "../../db_services/access_control_repo";
import validators from "../../validators";

const createRole = async (req: Request, res: Response) => {
  const { user_id, requestId, body } = req;
  const trx = await knex.transaction();
  try {
    const { role_name, access_detail }: { role_name: string; access_detail: Partial<AccessControl>[] } = body;
    const bodyValidation = validators.role.newRole.validate({ role_name, access_detail });
    if (bodyValidation.error) {
      await trx.rollback();
      return res.status(400).json({
        status: false,
        message: bodyValidation.error.message,
        data: null,
      });
    }

    const roleExists = await roleRepo.getRoleByFilter({ role_name }, { trx });
    if (roleExists) {
      await trx.rollback();
      return res.status(400).json({
        status: false,
        message: "Role already exists",
        data: null,
      });
    }

    const role_id = uuidv4();

    const role = await roleRepo.createRole(
      {
        role_name,
        created_by: user_id,
        updated_by: user_id,
      },
      role_id,
      { trx }
    );

    const access_control = [];
    let i;
    let accessRights;
    for (i = 0; i < access_detail.length; i++) {
      accessRights = access_detail[i];
      if (!accessRights) continue;
      const { submodule_id, can_create, can_delete, can_read, can_update } = accessRights;
      const accessControlObj = {
        access_control_id: uuidv4(),
        role_id,
        created_by: user_id,
        updated_by: user_id,
        submodule_id,
        can_create,
        can_delete,
        can_read,
        can_update,
      };
      const objValidator = validators.accessControl.validator.required().validate(accessControlObj);
      if (objValidator.error) {
        await trx.rollback();
        return res.status(400).json({
          status: false,
          message: objValidator.error.message,
          data: null,
        });
      }
      access_control.push(accessControlObj);
    }

    if (access_control.length) {
      await accessControlRepo.bulkInsertAccessControl(access_control, { trx });
    }

    await trx.commit();
    return res.status(200).json({ status: true, message: "Role Created Successfully", data: { role } });
  } catch (err) {
    await trx.rollback();
    const message = "Error while creating role";
    logger.error(message, { err, user_id, requestId, body });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const updateRole = async (req: Request, res: Response) => {
  const { user_id, requestId, body, params } = req;
  const { role_id } = params;
  const trx = await knex.transaction();
  try {
    const {
      role_name,
      access_detail,
    }: { role_name: string; role_id: string; access_detail: Partial<AccessControl>[] } = body;
    const bodyValidation = validators.role.oldRole.validate({ role_name, role_id, access_detail });
    if (bodyValidation.error) {
      return res.status(400).json({
        status: false,
        message: bodyValidation.error.message,
        data: null,
      });
    }

    const roleData = await roleRepo.getRoleById(role_id);
    if (!roleData) {
      await trx.rollback();
      return res.status(400).json({
        status: false,
        message: "Role not found",
        data: null,
      });
    }

    const roleExists = await roleRepo.getRoleByFilter({ role_name });
    if (roleExists && roleExists.role_id !== role_id) {
      await trx.rollback();
      return res.status(400).json({
        status: false,
        message: "Role name already exists",
        data: null,
      });
    }

    const updateObj = { role_name, updated_by: user_id };
    if (!roleExists?.created_by && roleExists?.role_name) updateObj.role_name = roleExists?.role_name;

    const role = await roleRepo.updateRole({ role_id }, updateObj, { trx });

    // delete old access rights
    await accessControlRepo.hardDeleteAccessControl({ role_id }, { trx });

    const access_control = [];
    let i;
    let accessRights;
    for (i = 0; i < access_detail.length; i++) {
      accessRights = access_detail[i];
      if (!accessRights) continue;
      const { submodule_id, can_create, can_delete, can_read, can_update } = accessRights;
      const accessControlObj = {
        access_control_id: uuidv4(),
        role_id,
        created_by: user_id,
        updated_by: user_id,
        submodule_id,
        can_create,
        can_delete,
        can_read,
        can_update,
      };
      const objValidator = validators.accessControl.validator.required().validate(accessControlObj);
      if (objValidator.error) {
        await trx.rollback();
        return res.status(400).json({
          status: false,
          message: objValidator.error.message,
          data: null,
        });
      }
      access_control.push(accessControlObj);
    }

    if (access_control.length) {
      await accessControlRepo.bulkInsertAccessControl(access_control, { trx });
    }

    await trx.commit();
    myCache.del(`${role_id}-routes`);
    return res.status(200).json({ status: true, message: "Role Updated Successfully", data: { role } });
  } catch (err) {
    await trx.rollback();
    const message = "Error while updated Role";
    logger.error(message, { err, user_id, requestId, body, role_id });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getRole = async (req: Request, res: Response) => {
  const { user_id, requestId, params } = req;
  const { role_id } = params;
  try {
    const idValidator = validators.common.uuid.required().validate(role_id);
    if (idValidator.error) {
      return res.status(400).json({
        status: false,
        message: "Role ID is invalid",
        data: null,
      });
    }

    const roleData = await roleRepo.getRoleById(role_id);
    if (!roleData) {
      return res.status(400).json({
        status: false,
        message: "Role not found",
        data: null,
      });
    }
    const accessRights = await accessControlRepo.getAccessControlByRoleId(role_id);
    return res
      .status(200)
      .json({ status: true, message: "Role Found", data: { role: { ...roleData, access_rights: accessRights } } });
  } catch (err) {
    const message = "Error while Fetching Role";
    logger.error(message, { err, user_id, requestId, role_id });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getRoles = async (req: Request, res: Response) => {
  const { user_id, requestId, query } = req;
  try {
    const { limit: qLimit, skip: qSkip } = query;
    const limit = Number(qLimit || 0) || 0;
    const skip = Number(qSkip || 0) || 0;

    const roles = (await roleRepo.getAllRoles({ limit, skip })) as Partial<Role>[];
    let count = 0;

    if (roles?.length) {
      const allRolesCount = (await roleRepo.getAllRoles({
        limit: null,
        skip: null,
        totalRecords: true,
      })) as count;
      count = Number(allRolesCount?.count);
    }

    return res
      .header("Access-Control-Expose-Headers", "x-total-count")
      .setHeader("x-total-count", count)
      .status(200)
      .json({
        status: true,
        message: "Roles Fetched Successfully",
        data: { roles },
      });
  } catch (err) {
    const message = "Error while fetching all Roles";
    logger.error(message, { err, user_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const deleteRole = async (req: Request, res: Response) => {
  const { user_id, requestId, params, body } = req;
  const { role_id } = params;
  const { is_deleted }: { is_deleted: boolean } = body;
  const operation = is_deleted ? "disabled" : "enabled";

  try {
    const validator = validators.common.isDeleted.required().validate({ id: role_id, is_deleted });
    if (validator.error) {
      return res.status(400).json({
        status: false,
        message: "Role ID is invalid",
        data: null,
      });
    }

    const roleData = await roleRepo.getRoleByFilter({ role_id });
    if (!roleData) {
      return res.status(400).json({
        status: false,
        message: "Role not found",
        data: null,
      });
    }

    if (roleData?.is_deleted === is_deleted) {
      return res.status(200).json({ status: true, message: `Role was already ${operation}`, data: null });
    }

    await roleRepo.updateRole({ role_id }, { is_deleted });

    return res.status(200).json({ status: true, message: `Role ${operation} successfully`, data: null });
  } catch (err) {
    const message = "Error while deleting Role";
    logger.error(message, { err, user_id, requestId, params, body });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getAccessControl = async (req: Request, res: Response) => {
  const { user_id, requestId, params } = req;
  const { role_id } = params;
  try {
    const idValidator = validators.common.uuid.required().validate(role_id);
    if (idValidator.error) {
      return res.status(400).json({
        status: false,
        message: "Role ID is invalid",
        data: null,
      });
    }
    const roleData = await roleRepo.getRoleById(role_id);
    if (!roleData) {
      return res.status(400).json({
        status: false,
        message: "Role not found",
        data: null,
      });
    }

    const accessRights = await accessControlRepo.getAccessControlByRoleId(role_id);
    if (!accessRights.length) {
      return res.status(200).json({
        status: false,
        message: "No Access Rights found",
        data: null,
      });
    }
    const roleAccess = accessRights.map((row) => {
      return {
        ...row,
        value: row.submodule_id,
        label: row.submodule_name,
      };
    });
    // return console.log(output);
    return res.status(200).json({
      status: true,
      message: "Successfully fetched Role Access Details",
      data: roleAccess,
    });
  } catch (err) {
    const message = "Error while getting Role Access Details";
    logger.error(message, { err, user_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getRolesForDropdown = async (req: Request, res: Response) => {
  const { user_id, requestId } = req;
  try {
    const roles = (await roleRepo.getRolesForDropdown()) as Partial<Role>[];

    return res.status(200).json({
      status: true,
      message: "roles Fetched Successfully",
      data: { roles },
    });
  } catch (err) {
    const message = "Error while fetching all roles";
    logger.error(message, { err, user_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

export default {
  createRole,
  updateRole,
  getRole,
  getRoles,
  deleteRole,
  getAccessControl,
  getRolesForDropdown,
};
