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
