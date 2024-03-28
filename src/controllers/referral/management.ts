import { Response } from "express";

import { v4 } from "uuid";
import { Referral } from "../../@types/database";
import { count } from "../../@types/Knex";
import { AdminRequest } from "../../@types/Express";

import { knex } from "../../data/knex";
import validators from "../../validators";
import logger from "../../utils/logger";

import * as referralRepo from "../../db_services/referral_repo";
import * as adminUserRepo from "../../db_services/admin_user_repo";

const getReferralCode = async (req: AdminRequest, res: Response) => {
  const { requestId, params } = req;
  const user_id = params.user_id || req.user_id;
  const trx = await knex.transaction();
  try {
    const validator = validators.common.uuid.required().validate(user_id);
    if (validator.error) {
      await trx.rollback();
      const message = validator.error.message;
      logger.debug("Invalid Admin User ID", { requestId, params, user_id });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const referralExists = await referralRepo.getReferralByFilter({ user_id });
    if (referralExists) {
      await trx.commit();
      const message = "Referral Code Found";
      return res.status(200).json({
        status: true,
        message,
        data: referralExists,
      });
    }

    const referral_code = await referralRepo.getUniqueReferralCode({ trx });
    const referral_id = v4();
    const newReferral = await referralRepo.createReferral(
      {
        referral_code,
        referral_id,
        user_id,
        updated_by: user_id,
      },
      referral_id,
      { trx }
    );

    await trx.commit();
    return res.status(200).json({
      status: true,
      message: "Referral Code Found",
      data: newReferral,
    });
  } catch (err) {
    await trx.rollback();
    const message = "Error while getting referral code";
    logger.error(message, { err, user_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const updateReferralCode = async (req: AdminRequest, res: Response) => {
  const { requestId, params, body, role_created_by } = req;
  const user_id = params.user_id || req.user_id;
  const trx = await knex.transaction();
  try {
    const { referral_code } = body;
    const idValidator = validators.common.uuid.required().validate(user_id);
    if (idValidator.error || !user_id) {
      await trx.rollback();
      const message = idValidator?.error?.message;
      logger.debug("Invalid Admin User ID", { requestId, params, user_id });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }
    const codevalidator = validators.common.referralCode.required().validate(referral_code);
    if (codevalidator.error) {
      await trx.rollback();
      const message = codevalidator.error.message;
      logger.debug("Invalid Referral Code.", { requestId, params, user_id });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    if (role_created_by && params.user_id) {
      await trx.rollback();
      const message = "Only Super admins are allowed to edit other referral codes";
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const user = await adminUserRepo.getAdminById(user_id);
    if (!user) {
      await trx.rollback();
      const message = "Only Super admins are allowed to edit other referral codes";
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const referralCode = await referralRepo.getReferralByFilter({ referral_code }, { trx });
    if (referralCode) {
      await trx.rollback();
      if (referralCode.user_id !== user_id) {
        return res.status(400).json({
          status: false,
          message: "Referral Code Already Exists. Try a Different One",
          data: null,
        });
      } else {
        return res.status(200).json({
          status: true,
          message: "Referral Code Not Changed",
          data: referralCode,
        });
      }
    }

    const updatedReferral = await referralRepo.updateReferral({ user_id }, { referral_code }, { trx });

    await trx.commit();
    return res.status(200).json({
      status: true,
      message: "Referral Code Updated",
      data: updatedReferral,
    });
  } catch (err) {
    await trx.rollback();
    const message = "Error while getting Customer by ID";
    logger.error(message, { err, user_id, requestId });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getReferralList = async (req: AdminRequest, res: Response) => {
  const { requestId, query, role_created_by } = req;

  try {
    if (role_created_by) {
      return res.status(400).json({
        status: false,
        message: "Only Super admins are allowed to view all referrals!",
        data: null,
      });
    }

    const { limit: qLimit, skip: qSkip, search: qSearch } = query;

    const limit = Number(qLimit || 0) || 0;
    const skip = Number(qSkip || 0) || 0;
    const search = String(qSearch || "");

    const list = (await referralRepo.getAllReferrals({
      limit,
      skip,
      search,
    })) as Partial<Referral>[];

    let count = 0;

    if (list?.length) {
      const listCount = (await referralRepo.getAllReferrals({
        limit: null,
        skip: null,
        search,
        totalRecords: true,
      })) as count;
      count = Number(listCount?.count);
    }

    return res
      .header("Access-Control-Expose-Headers", "x-total-count")
      .setHeader("x-total-count", count)
      .status(200)
      .json({
        status: true,
        message: "List Fetched Successfully",
        data: list,
      });
  } catch (err) {
    const message = "Error while getting Referral List";
    logger.error(message, { err, requestId, query });
    return res.status(500).json({ status: false, message, data: null });
  }
};

const getCustomersByReferralId = async (req: AdminRequest, res: Response) => {
  const { params, requestId, user_id, query } = req;
  const { referral_id } = params;

  const { limit: qLimit, skip: qSkip, search: qSearch } = query;
  const limit = Number(qLimit || 0) || 0;
  const skip = Number(qSkip || 0) || 0;
  const search = String(qSearch || "");

  try {
    const validator = validators.common.uuid.required().validate(referral_id);
    if (validator.error) {
      const message = validator.error.message;
      logger.debug("Invalid Referral ID", { requestId, params, user_id, query });
      return res.status(400).json({
        status: false,
        message,
        data: null,
      });
    }

    const list = (await referralRepo.getCustomersByReferralId({
      limit,
      skip,
      search,
      referral_id,
    })) as Referral[];
    let count = 0;
    if (list?.length) {
      const listCount = (await referralRepo.getCustomersByReferralId({
        limit: null,
        skip: null,
        totalRecords: true,
        search,
        referral_id,
      })) as count;
      count = Number(listCount?.count || 0);
    }

    return res
      .status(200)
      .header("Access-Control-Expose-Headers", "x-total-count")
      .setHeader("x-total-count", count)
      .json({
        status: true,
        message: "Customer Referral List Fetched Successfully",
        data: list,
      });
  } catch (err) {
    const message = "Error while getting Customer Referral List";
    logger.error(message, { err, requestId, params, query, user_id });
    return res.status(500).json({
      status: false,
      message,
    });
  }
};

export default {
  getReferralCode,
  updateReferralCode,
  getReferralList,
  getCustomersByReferralId,
};
