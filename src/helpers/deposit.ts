import { knex } from "../data/knex";

import { Status, requestId } from "../@types/Common";

import logger from "../utils/logger";

import * as depositRepo from "../db_services/deposit_repo";
import * as mt5UserRepo from "../db_services/mt5_user_repo";

import mt5 from "../services/mt5";

const addTransactionOnMt5 = async (transaction_id: string, mt5_user_id: string, requestId: requestId) => {
  const trx = await knex.transaction();
  logger.debug("Adding Transaction on Mt5 Server", { requestId, transaction_id });
  try {
    const transaction = await depositRepo.getTransactionById(transaction_id, { trx });
    if (!transaction) {
      await trx.rollback();
      return { status: false, message: "Transaction not Found", data: null };
    }

    const mt5_user = await mt5UserRepo.getMt5UserById(mt5_user_id);
    if (!mt5_user) {
      await trx.rollback();
      return { status: false, message: "MT5 User not Found", data: null };
    }

    const response = await mt5.api.deposit(mt5_user.mt5_id, transaction.amount, requestId);
    if (!response.status || !response.result) {
      await depositRepo.updateTransaction(
        { transaction_id },
        {
          status: Status.FAILED,
          mt5_status: Status.FAILED,
          mt5_message: response.message,
        },
        { trx }
      );
      return { status: false, data: response, message: "Failed to deposit from Mt5" };
    }

    const { dealid, equity, freemargin, margin } = response.result;
    await depositRepo.updateTransaction(
      { transaction_id },
      {
        dealid: String(dealid),
        equity: String(equity),
        freemargin: String(freemargin),
        margin: String(margin),
        status: Status.SUCCESS,
        mt5_status: Status.SUCCESS,
        mt5_message: response.message,
      },
      { trx }
    );

    await trx.commit();
    return { status: true, data: response, message: "Added Transaction on MT5 Server" };
  } catch (err) {
    await trx.rollback();
    const message = "Error while adding Transaction on Mt5 Server";
    logger.error(message, { err, requestId, transaction_id });
    return { status: false, message, data: null };
  }
};

export default { addTransactionOnMt5 };
