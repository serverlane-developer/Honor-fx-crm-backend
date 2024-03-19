import { Request as ExpressRequest } from "express";
import { AdminUser, Customer } from "./database";

export interface Request extends ExpressRequest {
  requestId?: string;
}

export interface AdminRequest extends Request {
  user_id?: string;
  user_type?: "admin";
  user?: AdminUser;
  role_created_by?: string;
  role_name?: string;
}

export interface CustomerRequest extends Request {
  customer_id?: string;
  user_type?: "customer";
  customer?: Customer;
}
