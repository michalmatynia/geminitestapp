import 'server-only';

const DEFAULT_ORGANIZATION_PAGE_SIZE = 48;
const MAX_ORGANIZATION_PAGE_SIZE = 200;

export type FilemakerOrganizationAddressFilter = 'all' | 'with_address' | 'without_address';
export type FilemakerOrganizationBankFilter = 'all' | 'with_bank' | 'without_bank';
export type FilemakerOrganizationParentFilter = 'all' | 'root' | 'child';

export type FilemakerOrganizationsListInput = {
  address?: string | null;
  advancedFilter?: string | null;
  bank?: string | null;
  limit?: string | null;
  page?: string | null;
  pageSize?: string | null;
  parent?: string | null;
  query?: string | null;
  updatedBy?: string | null;
};

export type FilemakerOrganizationsListOptions = {
  addressFilter: FilemakerOrganizationAddressFilter;
  advancedFilter: string;
  bankFilter: FilemakerOrganizationBankFilter;
  pageSize: number;
  parentFilter: FilemakerOrganizationParentFilter;
  query: string;
  requestedPage: string | null;
  updatedBy: string;
};

const readOptionalString = (value: string | null | undefined): string =>
  typeof value === 'string' ? value : '';

const normalizePageSize = (pageSize: string, limit: string): number => {
  const rawValue = pageSize.length > 0 ? pageSize : limit;
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_ORGANIZATION_PAGE_SIZE;
  return Math.min(parsed, MAX_ORGANIZATION_PAGE_SIZE);
};

export const normalizeOrganizationPage = (value: string | null, totalPages: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return 1;
  return Math.min(parsed, totalPages);
};

const normalizeAddressFilter = (value: string): FilemakerOrganizationAddressFilter =>
  value === 'with_address' || value === 'without_address' ? value : 'all';

const normalizeBankFilter = (value: string): FilemakerOrganizationBankFilter =>
  value === 'with_bank' || value === 'without_bank' ? value : 'all';

const normalizeParentFilter = (value: string): FilemakerOrganizationParentFilter =>
  value === 'root' || value === 'child' ? value : 'all';

export const resolveOrganizationListOptions = (
  input: FilemakerOrganizationsListInput
): FilemakerOrganizationsListOptions => {
  const pageSize = readOptionalString(input.pageSize);
  const limit = readOptionalString(input.limit);
  return {
    addressFilter: normalizeAddressFilter(readOptionalString(input.address)),
    advancedFilter: readOptionalString(input.advancedFilter).trim(),
    bankFilter: normalizeBankFilter(readOptionalString(input.bank)),
    pageSize: normalizePageSize(pageSize, limit),
    parentFilter: normalizeParentFilter(readOptionalString(input.parent)),
    query: readOptionalString(input.query).trim(),
    requestedPage: input.page ?? null,
    updatedBy: readOptionalString(input.updatedBy).trim(),
  };
};
