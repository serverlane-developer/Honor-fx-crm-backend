import { Response } from "express";
import bcrypt from "bcrypt";

import logger from "../../utils/logger";
import { AdminRequest } from "../../@types/Express";

import * as adminRepo from "../../db_services/admin_user_repo";
import { AdminUser } from "../../@types/database";
import { count } from "../../@types/Knex";
import validators from "../../validators";

const createAdmin = async (req: AdminRequest, res: Response) => {
  const { body, requestId, user_id: created_by } = req;
  try {
    const { username, password, email, cnf_password, role_id } = body;
    const validator = validators.adminUser.newUserValidator.validate({
      username,
      password,
      email,
      cnf_password,
      role_id,
    });
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Validation error while creating admin user", { body, message, requestId });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const userExists = await adminRepo.getAdminByFilter({ username });
    if (userExists) {
      return res.status(400).json({
        status: false,
        message: "Username already exists!",
        data: null,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const encPassword = await bcrypt.hash(password, salt);

    const newUserObj = {
      username: username.toLowerCase(),
      password: encPassword,
      email: email.toLowerCase(),
      role_id,
      created_by,
      updated_by: created_by,
    };

    const admin = await adminRepo.createAdmin(newUserObj);

    return res.status(201).json({
      status: true,
      message: "User created successfully.",
      data: { ...admin, password: "" },
    });
  } catch (err) {
    const message = "Error while creating admin user";
    logger.error(message, { err, requestId });
    return res.status(500).json({
      status: false,
      message: message,
      data: null,
    });
  }
};

const getAdminUsers = async (req: AdminRequest, res: Response) => {
  const { user_id, requestId, query } = req;
  try {
    const { limit: qLimit, skip: qSkip } = query;
    const limit = Number(qLimit || 0) || 0;
    const skip = Number(qSkip || 0) || 0;

    const users = (await adminRepo.getAllAdmins({ limit, skip })) as Partial<AdminUser>[];
    let count = 0;

    if (users?.length) {
      const allRolesCount = (await adminRepo.getAllAdmins({
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
        message: "Users Fetched Successfully",
        data: { users },
      });
  } catch (err) {
    const message = "Error while fetching all admin users";
    logger.error(message, { err, user_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getAdminById = async (req: AdminRequest, res: Response) => {
  const { requestId, params } = req;
  const { user_id } = params;
  try {
    const idValidator = validators.common.uuid.required().validate(user_id);
    if (idValidator.error) {
      return res.status(400).json({
        status: false,
        message: "Admin User ID is invalid",
        data: null,
      });
    }

    const adminData = await adminRepo.getAdminById(user_id);
    if (!adminData) {
      return res.status(400).json({
        status: false,
        message: "Admin User not found",
        data: null,
      });
    }
    return res.status(200).json({ status: true, message: "Admin User Found", data: { user: adminData } });
  } catch (err) {
    const message = "Error while Fetching Admin Users";
    logger.error(message, { err, requestId, user_id });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const updateAdmin = async (req: AdminRequest, res: Response) => {
  const { user_id: updated_by, requestId, body, params } = req;
  const { user_id } = params;

  try {
    const { email, username, role_id }: { module_name: string; email: string; username: string; role_id: string } =
      body;

    const bodyValidation = validators.adminUser.updateUserValidation.validate({
      email,
      user_id,
      username,
      role_id,
    });
    if (bodyValidation.error) {
      return res.status(400).json({
        status: false,
        message: bodyValidation.error.message,
        data: null,
      });
    }

    const userData = await adminRepo.getAdminById(user_id);
    if (!userData) {
      return res.status(400).json({
        status: false,
        message: "Admin User not found",
        data: null,
      });
    }

    const usernameExists = await adminRepo.getAdminByFilter({ username: username.toLowerCase() });
    if (usernameExists && usernameExists.user_id !== user_id) {
      return res.status(400).json({
        status: false,
        message: "Username already exists",
        data: null,
      });
    }

    const emailExists = await adminRepo.getAdminByFilter({ email: email.toLowerCase() });
    if (emailExists && emailExists.user_id !== user_id) {
      return res.status(400).json({
        status: false,
        message: "Email already exists",
        data: null,
      });
    }

    const updateObj = {
      email,
      username,
      role_id,
      updated_by,
      is_deleted: userData?.is_deleted,
    };

    const userObj = await adminRepo.updateAdmin({ user_id }, updateObj);

    return res.status(200).json({ status: true, message: "Admin User Updated Successfully", data: { user: userObj } });
  } catch (err) {
    const message = "Error while updated admin user";
    logger.error(message, { err, updated_by, requestId, body, user_id });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const deleteAdmin = async (req: AdminRequest, res: Response) => {
  const { user_id: updated_by, requestId, params, body } = req;
  const { user_id } = params;
  const { is_deleted }: { is_deleted: boolean } = body;
  const operation = is_deleted ? "disabled" : "enabled";

  try {
    const validator = validators.common.isDeleted.required().validate({ id: user_id, is_deleted });
    if (validator.error) {
      return res.status(400).json({
        status: false,
        message: "Admin User ID is invalid",
        data: null,
      });
    }

    if (updated_by === user_id) {
      return res.status(400).json({
        status: false,
        message: "Cannot switch self status",
        data: null,
      });
    }

    const userData = await adminRepo.getAdminByFilter({ user_id });
    if (!userData) {
      return res.status(400).json({
        status: false,
        message: "Admin User not found",
        data: null,
      });
    }

    if (userData?.is_deleted === is_deleted) {
      return res.status(200).json({ status: true, message: `Admin User was already ${operation}`, data: null });
    }

    await adminRepo.updateAdmin({ user_id }, { is_deleted, updated_by });

    return res.status(200).json({ status: true, message: `Admin User ${operation} successfully`, data: null });
  } catch (err) {
    const message = "Error while deleting admin user";
    logger.error(message, { err, updated_by, user_id, requestId, params, body });
    return res.status(500).json({ status: false, message, data: null });
  }
};

export default {
  createAdmin,
  getAdminUsers,
  getAdminById,
  updateAdmin,
  deleteAdmin,
};
