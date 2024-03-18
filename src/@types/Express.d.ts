import { Request as ExpressRequest } from "express";
import { AdminUser } from "./database";

export interface Request extends ExpressRequest {
  requestId?: string;
  user_id?: string;
  user_type?: string;
  user?: AdminUser;
  role_created_by?: string;
  role_name?: string;
}
