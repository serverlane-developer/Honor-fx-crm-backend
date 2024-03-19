import { Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import moment from "moment";

import { CustomerRequest } from "../@types/Express";
import config from "../config";
import logger from "../utils/logger";

import * as customerRepo from "../db_services/customer_repo";

declare module "jsonwebtoken" {
  export interface JwtPayload {
    id?: string;
    type?: "customer" | "admin";
    iat?: number;
    username?: string;
    phone_number?: string;
    is_2fa_enabled?: boolean;
  }
}

export default async (req: CustomerRequest, res: Response, next: NextFunction) => {
  const { requestId } = req;
  try {
    let token = req.headers["authorization"] || req.headers["x-access-token"] || req.query.token || req.body.token;

    if (!token) {
      return res.status(401).json({
        status: false,
        message: "A token is required for authentication",
        data: null,
      });
    }
    if (req.query.token) {
      token = req.query.token;
    } else {
      token = token.split(" ")[1];
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload;

    const customer_id = decoded.id;

    if (!customer_id) {
      return res.status(403).json({ status: false, message: "Invalid Token!", data: null });
    }

    let user;

    if (decoded.type === "customer") {
      user = await customerRepo.getCustomerById(customer_id);
    }

    if (!user) {
      return res.status(403).json({ status: false, message: "Invalid User!", data: null });
    }

    // revoke token after 2fa status changes
    if (user.is_2fa_enabled !== decoded.is_2fa_enabled) {
      return res.status(403).json({ status: false, message: "Invalid Token!", data: null });
    }

    // to check if token was signed before password change
    let token_signed_at = decoded?.iat;
    if (token_signed_at) {
      token_signed_at *= 1000;
      if (user.pin_changed_at) {
        const is_token_signed_before_pin_change = moment(token_signed_at).isBefore(user.pin_changed_at);
        if (is_token_signed_before_pin_change) {
          return res.status(403).json({ status: false, message: "Invalid Token!", data: null });
        }
      }
    }

    // to check if token was signed before login
    // if (user.last_login_at) {
    //   const is_token_signed_before_last_login = moment(token_signed_at).isBefore(user.last_login_at);
    //   if (is_token_signed_before_last_login) {
    //     return res.status(403).json({ status: false, message: "Invalid Token!", data: null });
    //   }
    // }

    req.customer = user;
    req.customer_id = user.customer_id;
    return next();
  } catch (err) {
    logger.error("Error in auth middleware", { err, requestId });
    return res.status(500).json({ status: false, message: "Invalid Token!", data: null });
  }
};
