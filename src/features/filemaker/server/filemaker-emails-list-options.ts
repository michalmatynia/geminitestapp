import 'server-only';

const DEFAULT_EMAIL_PAGE_SIZE = 100;
const MAX_EMAIL_PAGE_SIZE = 500;

export type FilemakerEmailStatusFilter =
  | 'all'
  | 'active'
  | 'inactive'
  | 'bounced'
  | 'unverified';
export type FilemakerEmailSortOption =
  | 'email_asc'
  | 'email_desc'
  | 'createdAt_desc'
  | 'createdAt_asc'
  | 'updatedAt_desc'
  | 'updatedAt_asc'
  | 'status_asc'
  | 'status_desc';

export const DEFAULT_FILEMAKER_EMAIL_SORT: FilemakerEmailSortOption = 'email_asc';

const SUPPORTED_EMAIL_SORT_OPTIONS = new Set<string>([
  'email_asc',
  'email_desc',
  'createdAt_desc',
  'createdAt_asc',
  'updatedAt_desc',
  'updatedAt_asc',
  'status_asc',
  'status_desc',
]);

export type FilemakerEmailsListInput = {
  limit?: string | null;
  page?: string | null;
  pageSize?: string | null;
  query?: string | null;
  sort?: string | null;
  status?: string | null;
  updatedBy?: string | null;
};

export type FilemakerEmailsListOptions = {
  pageSize: number;
  query: string;
  requestedPage: string | null;
  sort: FilemakerEmailSortOption;
  statusFilter: FilemakerEmailStatusFilter;
  updatedBy: string;
};

const readOptionalString = (value: string | null | undefined): string =>
  typeof value === 'string' ? value : '';

const normalizePageSize = (pageSize: string, limit: string): number => {
  const rawValue = pageSize.length > 0 ? pageSize : limit;
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_EMAIL_PAGE_SIZE;
  return Math.min(parsed, MAX_EMAIL_PAGE_SIZE);
};

export const normalizeEmailPage = (value: string | null, totalPages: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return 1;
  return Math.min(parsed, totalPages);
};

const normalizeStatusFilter = (value: string): FilemakerEmailStatusFilter => {
  if (
    value === 'active' ||
    value === 'inactive' ||
    value === 'bounced' ||
    value === 'unverified'
  ) {
    return value;
  }
  return 'all';
};

const normalizeEmailSort = (value: string): FilemakerEmailSortOption => {
  if (SUPPORTED_EMAIL_SORT_OPTIONS.has(value)) return value as FilemakerEmailSortOption;
  return DEFAULT_FILEMAKER_EMAIL_SORT;
};

export const resolveEmailListOptions = (
  input: FilemakerEmailsListInput
): FilemakerEmailsListOptions => {
  const pageSize = readOptionalString(input.pageSize);
  const limit = readOptionalString(input.limit);
  return {
    pageSize: normalizePageSize(pageSize, limit),
    query: readOptionalString(input.query).trim(),
    requestedPage: input.page ?? null,
    sort: normalizeEmailSort(readOptionalString(input.sort)),
    statusFilter: normalizeStatusFilter(readOptionalString(input.status)),
    updatedBy: readOptionalString(input.updatedBy).trim(),
  };
};
