// SAMPLE ADMIN SEED FILE
import { Knex } from "knex";

import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";

import config from "../../config";
import validators from "../../validators/common";

import * as rolesRepo from "../../db_services/roles_repo";
import logger from "../../utils/logger";

const table_name = "admin_user";

export async function seed(knex: Knex) {
  const salt = await bcrypt.genSalt(10);

  const username = config.SEED_ADMIN_USERNAME;
  const password = config.SEED_ADMIN_PASSWORD;

  const passwordValidation = validators.password.required().validate(password);
  const passwordValidationError = passwordValidation?.error?.message;
  const isPasswordValid = !passwordValidationError;
  if (!isPasswordValid) {
    throw new Error(`Seed Password is invalid. \n\n${passwordValidationError}\n\n`);
  }

  const email = config.SEED_ADMIN_EMAIL;

  const encPassword = await bcrypt.hash(password, salt);

  const superAdminRole = await rolesRepo.getRoleByName("super admin");
  if (!superAdminRole) throw new Error("Cannot find Role to assign to Admin");

  const role_id = superAdminRole.role_id;

  const adminObj = {
    user_id: uuidv4(),
    username,
    password: encPassword,
    is_deleted: false,
    email: email,
    role_id,
  };

  const rpaAdminObj = {
    user_id: uuidv4(),
    username: "rpa",
    password: encPassword,
    is_deleted: false,
    email: "rpa@rpa.com",
    role_id,
  };

  await knex(table_name).del();
  await knex(table_name).insert([adminObj, rpaAdminObj]);

  logger.info("SEED ADMIN ID", { requestId: "seed-admin", rpa_user_id: rpaAdminObj.user_id });
}
