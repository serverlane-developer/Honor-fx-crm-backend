import { v4 } from "uuid";
import { ReturnResponse, Status, requestId } from "../@types/Common";
import { Customer, Mt5User } from "../@types/database";
import { knex } from "../data/knex";
import mt5 from "../services/mt5";
import logger from "../utils/logger";

import * as mt5UserRepo from "../db_services/mt5_user_repo";
import config from "../config";
import { decrypt, encrypt } from "./cipher";

const getUser = (data: Partial<Mt5User>, type: "encrypt" | "decrypt") => {
  const { master_password, investor_password } = data;

  const operation = type === "encrypt" ? encrypt : decrypt;
  if (master_password) data.master_password = operation(master_password);
  if (investor_password) data.investor_password = operation(investor_password);

  return data as Mt5User;
};

const createUserOnMt5 = async (
  client_name: string,
  email: string,
  customer: Customer,
  requestId: requestId
): Promise<ReturnResponse> => {
  const trx = await knex.transaction();
  try {
    const { customer_id } = customer;
    // const exists = await mt5UserRepo.getMt5UserByFilter({ client_name: client_name }, { trx });
    // if (exists) {
    //   await trx.rollback();
    //   const message = "User with a similar username already exists";
    //   logger.debug(message, { requestId, client_name, email });
    //   return {
    //     status: false,
    //     message,
    //     data: null,
    //   };
    // }

    const response = await mt5.api.register(client_name, email, requestId);

    if (!response.status || !response.result) {
      await trx.rollback();
      const message = "Error when registering user on Mt5";
      logger.debug(message, { requestId, response });
      return {
        status: false,
        message: response.message,
        data: null,
      };
    }
    const message = "Successfully created user on Mt5";

    const { country, investor_password, leverage, master_password, mt5_id, mt_group } = response.result;
    const mt5_user_id = v4();
    const newUser: Partial<Mt5User> = {
      mt5_user_id,
      client_name,
      country,
      customer_id,
      email,
      leverage,
      master_password,
      investor_password,
      mt5_id: mt5_id.toString(),
      mt_group,
      status: Status.SUCCESS,
      mt5_ip: config.MT5_IP,
    };
    const encryptedUser = getUser(newUser, "encrypt");
    await mt5UserRepo.createMt5User(encryptedUser, mt5_user_id, { trx });
    await trx.commit();

    return {
      status: true,
      message,
      data: response,
    };
  } catch (err) {
    await trx.rollback();
    const message = "Error while creating user on Mt5";
    logger.error(message, { requestId, err, client_name, email });
    return {
      status: false,
      message,
      data: null,
    };
  }
};

export default { createUserOnMt5, getUser };
