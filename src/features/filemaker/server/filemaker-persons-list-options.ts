/**
 * Filemaker Persons List Options
 * 
 * Configuration and filtering options for Filemaker person list queries.
 * Provides:
 * - Pagination configuration with size limits
 * - Address, bank, and organization filter types
 * - Sort option definitions for person lists
 * - Query parameter validation and normalization
 * - List display and filtering utilities
 */

import 'server-only';

const DEFAULT_PERSON_PAGE_SIZE = 48;
const MAX_PERSON_PAGE_SIZE = 200;

export type FilemakerPersonAddressFilter = 'all' | 'with_address' | 'without_address';
export type FilemakerPersonBankFilter = 'all' | 'with_bank' | 'without_bank';
export type FilemakerPersonOrganizationFilter =
  | 'all'
  | 'with_organizations'
  | 'without_organizations';
export type FilemakerPersonSortOption =
  | 'createdAt_desc'
  | 'createdAt_asc'
  | 'updatedAt_desc'
  | 'updatedAt_asc'
  | 'organizationLinkCount_desc'
  | 'organizationLinkCount_asc'
  | 'name_asc'
  | 'name_desc';

export const DEFAULT_FILEMAKER_PERSON_SORT: FilemakerPersonSortOption = 'name_asc';

const SUPPORTED_PERSON_SORT_OPTIONS = new Set<string>([
  'createdAt_desc',
  'createdAt_asc',
  'updatedAt_desc',
  'updatedAt_asc',
  'organizationLinkCount_desc',
  'organizationLinkCount_asc',
  'name_asc',
  'name_desc',
]);

export type FilemakerPersonsListInput = {
  address?: string | null;
  bank?: string | null;
  limit?: string | null;
  organization?: string | null;
  page?: string | null;
  pageSize?: string | null;
  query?: string | null;
  sort?: string | null;
  updatedBy?: string | null;
};

export type FilemakerPersonsListOptions = {
  addressFilter: FilemakerPersonAddressFilter;
  bankFilter: FilemakerPersonBankFilter;
  organizationFilter: FilemakerPersonOrganizationFilter;
  pageSize: number;
  query: string;
  requestedPage: string | null;
  sort: FilemakerPersonSortOption;
  updatedBy: string;
};

const readOptionalString = (value: string | null | undefined): string =>
  typeof value === 'string' ? value : '';

const normalizePageSize = (pageSize: string, limit: string): number => {
  const rawValue = pageSize.length > 0 ? pageSize : limit;
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_PERSON_PAGE_SIZE;
  return Math.min(parsed, MAX_PERSON_PAGE_SIZE);
};

export const normalizePersonPage = (value: string | null, totalPages: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return 1;
  return Math.min(parsed, totalPages);
};

const normalizeAddressFilter = (value: string): FilemakerPersonAddressFilter =>
  value === 'with_address' || value === 'without_address' ? value : 'all';

const normalizeBankFilter = (value: string): FilemakerPersonBankFilter =>
  value === 'with_bank' || value === 'without_bank' ? value : 'all';

const normalizeOrganizationFilter = (value: string): FilemakerPersonOrganizationFilter =>
  value === 'with_organizations' || value === 'without_organizations' ? value : 'all';

const normalizePersonSort = (value: string): FilemakerPersonSortOption => {
  if (SUPPORTED_PERSON_SORT_OPTIONS.has(value)) return value as FilemakerPersonSortOption;
  return DEFAULT_FILEMAKER_PERSON_SORT;
};

export const resolvePersonListOptions = (
  input: FilemakerPersonsListInput
): FilemakerPersonsListOptions => {
  const pageSize = readOptionalString(input.pageSize);
  const limit = readOptionalString(input.limit);
  return {
    addressFilter: normalizeAddressFilter(readOptionalString(input.address)),
    bankFilter: normalizeBankFilter(readOptionalString(input.bank)),
    organizationFilter: normalizeOrganizationFilter(readOptionalString(input.organization)),
    pageSize: normalizePageSize(pageSize, limit),
    query: readOptionalString(input.query).trim(),
    requestedPage: input.page ?? null,
    sort: normalizePersonSort(readOptionalString(input.sort)),
    updatedBy: readOptionalString(input.updatedBy).trim(),
  };
};
