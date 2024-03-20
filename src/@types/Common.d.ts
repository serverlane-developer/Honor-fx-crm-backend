/* eslint-disable @typescript-eslint/no-explicit-any */
export type requestId = string | undefined;

export interface DropdownObject {
  label: string;
  value: string;
  [key: string]: any;
}

export interface PaginationParams {
  limit: number | null;
  skip: number | null;
  totalRecords?: boolean;
  order?: "created_at" | "updated_at";
  dir?: "desc" | "asc";
  id?: string;
  search?: string;
  [key: string]: any;
}

export const enum Status {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
  PROCESSING = "processing",
  REFUND = "refund",
  ACKNOWLEDGED = "acknowledged",
}

export type transaction_status =
  | Status.PENDING
  | Status.SUCCESS
  | Status.FAILED
  | Status.PROCESSING
  | Status.ACKNOWLEDGED;
export type mt5_status = Status.PENDING | Status.FAILED | Status.SUCCESS;

export interface ReturnResponse {
  status: boolean;
  message: string;
  data: {
    [key: string]: any;
  } | null;
}
