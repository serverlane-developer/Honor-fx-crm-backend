import { Response } from "express";

import { v4 } from "uuid";
import { AdminRequest } from "../../@types/Express";

import logger from "../../utils/logger";
import validators from "../../validators";

import * as pgRepo from "../../db_services/payin_gateway_repo";
import { PayinGateway } from "../../@types/database";
import { count } from "../../@types/Knex";
import { knex } from "../../data/knex";
import { decrypt, encrypt } from "../../helpers/cipher";

const createPayinGateway = async (req: AdminRequest, res: Response) => {
  const { user_id, requestId, body } = req;
  const pg_id = v4();
  const trx = await knex.transaction();
  try {
    const {
      pg_label,
      pg_service,
      nickname,

      base_url,
      base_url_alt,
      merchant_id,
      secret_key,
      client_id,
      description,
      username,
      password,
    } = body;

    let pgObject = {
      pg_label,
      pg_service,
      nickname,

      base_url,
      base_url_alt,
      merchant_id,
      secret_key,
      client_id,
      description,
      username,
      password,
    };

    const validator = validators.payinGateway.pgValidation("new").validate(pgObject);
    if (validator.error) {
      await trx.rollback();
      const message = validator.error.message;
      logger.debug("Validation error while adding new Payment Gateway", { body, message, requestId, pgObject });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    pgObject = {
      ...pgObject,
      base_url: base_url ? encrypt(base_url) : null,
      base_url_alt: base_url_alt ? encrypt(base_url_alt) : null,
      merchant_id: merchant_id ? encrypt(merchant_id) : null,
      secret_key: secret_key ? encrypt(secret_key) : null,
      client_id: client_id ? encrypt(client_id) : null,
      username: username ? encrypt(username) : null,
      password: password ? encrypt(password) : null,
    };

    const pgExists = await pgRepo.getPayinGatewayByFilter({ nickname });
    if (pgExists) {
      await trx.rollback();
      return res.status(400).json({
        status: false,
        message: "Payment Gateway with a same nickname already exists!",
        data: null,
      });
    }

    const pg = (await pgRepo.createPayinGateway(
      {
        pg_id,
        ...pgObject,
        created_by: user_id,
        updated_by: user_id,
      },
      pg_id,
      { trx }
    )) as PayinGateway;

    await trx.commit();
    return res.status(200).json({
      status: true,
      data: pg,
      message: "Payment Gateway Added",
    });
  } catch (err) {
    await trx.rollback();
    const message = "Error while adding Payment Gateway";
    logger.error(message, { err, user_id, requestId, body });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const updatePayinGateway = async (req: AdminRequest, res: Response) => {
  const { user_id, requestId, body, params } = req;
  const { pg_id } = params;
  const trx = await knex.transaction();
  try {
    const {
      pg_label,
      pg_service,
      nickname,

      base_url,
      base_url_alt,
      merchant_id,
      secret_key,
      client_id,
      description,
      username,
      password,
    } = body;

    let pgObject = {
      pg_label,
      pg_service,
      nickname,

      base_url,
      base_url_alt,
      merchant_id,
      secret_key,
      client_id,
      description,

      username,
      password,
    };

    const validator = validators.payinGateway.pgValidation("old").validate({ ...pgObject, pg_id });
    if (validator.error) {
      await trx.rollback();
      const message = validator.error.message;
      logger.debug("Validation error while updating Payment Gateway", { body, message, requestId });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    pgObject = {
      ...pgObject,
      base_url: base_url ? encrypt(base_url) : null,
      base_url_alt: base_url_alt ? encrypt(base_url_alt) : null,
      merchant_id: merchant_id ? encrypt(merchant_id) : null,
      secret_key: secret_key ? encrypt(secret_key) : null,
      client_id: client_id ? encrypt(client_id) : null,
      username: username ? encrypt(username) : null,
      password: password ? encrypt(password) : null,
    };

    const pgExists = await pgRepo.getPayinGatewayByFilter({ pg_id });
    if (!pgExists) {
      await trx.rollback();
      return res.status(400).json({
        status: false,
        message: "Payment Gateway not found",
        data: null,
      });
    }

    const sameNameExists = await pgRepo.getPayinGatewayByFilter({ nickname });
    if (sameNameExists && sameNameExists.pg_id !== pg_id) {
      await trx.rollback();
      return res.status(400).json({
        status: false,
        message: "Payment Gateway with a same nickname already exists!",
        data: null,
      });
    }

    const pg = (await pgRepo.updatePayinGateway(
      { pg_id },
      { ...pgObject, updated_by: user_id },
      { trx }
    )) as PayinGateway;

    await trx.commit();
    return res.status(200).json({
      status: true,
      data: pg,
      message: "Payment Gateway Updated",
    });
  } catch (err) {
    await trx.rollback();

    const message = "Error while adding Payment Gateway";
    logger.error(message, { err, user_id, requestId, body });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const deletePayinGateway = async (req: AdminRequest, res: Response) => {
  const { user_id, requestId, body, params } = req;
  const { pg_id } = params;
  const { is_deleted } = body;
  const operation = is_deleted ? "disabled" : "enabled";

  try {
    const validator = validators.common.isDeleted.validate({ id: pg_id, is_deleted });
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Validation error while deleting Payment Gateway", { body, message, requestId });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const pgExists = await pgRepo.getPayinGatewayByFilter({ pg_id });
    if (!pgExists) {
      return res.status(400).json({
        status: false,
        message: "Payment Gateway not found",
        data: null,
      });
    }

    if (pgExists.is_deleted === is_deleted) {
      return res.status(200).json({
        status: true,
        message: `Payment gateway was already ${operation}`,
        data: null,
      });
    }

    const pg = await pgRepo.updatePayinGateway({ pg_id }, { is_deleted, updated_by: user_id });
    return res.status(200).json({
      status: true,
      data: pg,
      message: `Payment Gateway ${operation}`,
    });
  } catch (err) {
    const message = "Error while deleting Payment Gateway";
    logger.error(message, { err, user_id, requestId, body, pg_id, operation });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getPayinGatewayById = async (req: AdminRequest, res: Response) => {
  const { user_id, requestId, params } = req;
  const { pg_id } = params;

  try {
    const validator = validators.common.uuid.validate(pg_id);
    if (validator.error) {
      const message = "Invalid Payment Gateway ID";
      logger.debug("Validation error while getting Payment Gateway By ID", { message, requestId, pg_id });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const pgExists = await pgRepo.getPayinGatewayByFilter({ pg_id });
    if (!pgExists) {
      return res.status(400).json({
        status: false,
        message: "Payment Gateway not found",
        data: null,
      });
    }

    const data = {
      ...pgExists,
      base_url: decrypt(pgExists.base_url || ""),
      base_url_alt: decrypt(pgExists.base_url_alt || ""),
      merchant_id: decrypt(pgExists.merchant_id || ""),
      secret_key: decrypt(pgExists.secret_key || ""),
      client_id: decrypt(pgExists.client_id || ""),
      username: decrypt(pgExists.username || ""),
      password: decrypt(pgExists.password || ""),
    };

    return res.status(200).json({
      status: true,
      data,
      message: `Payment Gateway Fetched`,
    });
  } catch (err) {
    const message = "Error while getting Payment Gateway by ID";
    logger.error(message, { err, user_id, requestId, pg_id });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getPayinGateways = async (req: AdminRequest, res: Response) => {
  const { user_id, requestId, query } = req;

  try {
    const { limit: qLimit, skip: qSkip, status: qStatus } = query;
    const limit = Number(qLimit || 0) || 0;
    const skip = Number(qSkip || 0) || 0;
    const status = qStatus === "enable" ? true : false;
    const pgList = (await pgRepo.getAllGateways({ limit, skip, status })) as Partial<PayinGateway>[];
    let count = 0;

    if (pgList?.length) {
      const pgCount = (await pgRepo.getAllGateways({
        limit: null,
        skip: null,
        status,
        totalRecords: true,
      })) as count;
      count = Number(pgCount?.count);
    }

    return res
      .header("Access-Control-Expose-Headers", "x-total-count")
      .setHeader("x-total-count", count)
      .status(200)
      .json({
        status: true,
        message: "List Fetched Successfully",
        data: pgList,
      });
  } catch (err) {
    const message = "Error while getting Payment Gateway List";
    logger.error(message, { err, user_id, requestId, query });
    return res.status(500).json({ status: false, message, data: null });
  }
};

export default {
  createPayinGateway,
  updatePayinGateway,
  deletePayinGateway,
  getPayinGatewayById,
  getPayinGateways,
};
