import 'server-only';

const DEFAULT_INVOICE_PAGE_SIZE = 48;
const MAX_INVOICE_PAGE_SIZE = 200;

export type FilemakerInvoiceOrganizationFilter =
  | 'all'
  | 'with_organizations'
  | 'without_organizations';
export type FilemakerInvoicePaymentFilter = 'all' | 'paid' | 'unpaid';

export type FilemakerInvoicesListInput = {
  limit?: string | null;
  organization?: string | null;
  page?: string | null;
  pageSize?: string | null;
  payment?: string | null;
  query?: string | null;
  year?: string | null;
};

export type FilemakerInvoicesListOptions = {
  organizationFilter: FilemakerInvoiceOrganizationFilter;
  pageSize: number;
  paymentFilter: FilemakerInvoicePaymentFilter;
  query: string;
  requestedPage: string | null;
  year: string;
};

const readOptionalString = (value: string | null | undefined): string =>
  typeof value === 'string' ? value : '';

const normalizePageSize = (pageSize: string, limit: string): number => {
  const rawValue = pageSize.length > 0 ? pageSize : limit;
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_INVOICE_PAGE_SIZE;
  return Math.min(parsed, MAX_INVOICE_PAGE_SIZE);
};

export const normalizeInvoicePage = (value: string | null, totalPages: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return 1;
  return Math.min(parsed, totalPages);
};

const normalizeOrganizationFilter = (value: string): FilemakerInvoiceOrganizationFilter =>
  value === 'with_organizations' || value === 'without_organizations' ? value : 'all';

const normalizePaymentFilter = (value: string): FilemakerInvoicePaymentFilter =>
  value === 'paid' || value === 'unpaid' ? value : 'all';

export const resolveInvoiceListOptions = (
  input: FilemakerInvoicesListInput
): FilemakerInvoicesListOptions => {
  const pageSize = readOptionalString(input.pageSize);
  const limit = readOptionalString(input.limit);
  return {
    organizationFilter: normalizeOrganizationFilter(readOptionalString(input.organization)),
    pageSize: normalizePageSize(pageSize, limit),
    paymentFilter: normalizePaymentFilter(readOptionalString(input.payment)),
    query: readOptionalString(input.query).trim(),
    requestedPage: input.page ?? null,
    year: readOptionalString(input.year).trim(),
  };
};
