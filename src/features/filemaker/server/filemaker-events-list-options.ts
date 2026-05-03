import 'server-only';

const DEFAULT_EVENT_PAGE_SIZE = 48;
const MAX_EVENT_PAGE_SIZE = 200;

export type FilemakerEventAddressFilter = 'all' | 'with_address' | 'without_address';
export type FilemakerEventOrganizationFilter =
  | 'all'
  | 'with_organizations'
  | 'without_organizations';
export type FilemakerEventStatusFilter = 'all' | 'active' | 'discontinued';

export type FilemakerEventsListInput = {
  address?: string | null;
  limit?: string | null;
  organization?: string | null;
  page?: string | null;
  pageSize?: string | null;
  query?: string | null;
  status?: string | null;
  updatedBy?: string | null;
};

export type FilemakerEventsListOptions = {
  addressFilter: FilemakerEventAddressFilter;
  organizationFilter: FilemakerEventOrganizationFilter;
  pageSize: number;
  query: string;
  requestedPage: string | null;
  statusFilter: FilemakerEventStatusFilter;
  updatedBy: string;
};

const readOptionalString = (value: string | null | undefined): string =>
  typeof value === 'string' ? value : '';

const normalizePageSize = (pageSize: string, limit: string): number => {
  const rawValue = pageSize.length > 0 ? pageSize : limit;
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_EVENT_PAGE_SIZE;
  return Math.min(parsed, MAX_EVENT_PAGE_SIZE);
};

export const normalizeEventPage = (value: string | null, totalPages: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return 1;
  return Math.min(parsed, totalPages);
};

const normalizeAddressFilter = (value: string): FilemakerEventAddressFilter =>
  value === 'with_address' || value === 'without_address' ? value : 'all';

const normalizeOrganizationFilter = (value: string): FilemakerEventOrganizationFilter =>
  value === 'with_organizations' || value === 'without_organizations' ? value : 'all';

const normalizeStatusFilter = (value: string): FilemakerEventStatusFilter =>
  value === 'active' || value === 'discontinued' ? value : 'all';

export const resolveEventListOptions = (
  input: FilemakerEventsListInput
): FilemakerEventsListOptions => {
  const pageSize = readOptionalString(input.pageSize);
  const limit = readOptionalString(input.limit);
  return {
    addressFilter: normalizeAddressFilter(readOptionalString(input.address)),
    organizationFilter: normalizeOrganizationFilter(readOptionalString(input.organization)),
    pageSize: normalizePageSize(pageSize, limit),
    query: readOptionalString(input.query).trim(),
    requestedPage: input.page ?? null,
    statusFilter: normalizeStatusFilter(readOptionalString(input.status)),
    updatedBy: readOptionalString(input.updatedBy).trim(),
  };
};
