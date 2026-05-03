import type React from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

export type InvoicePaymentFilter = 'all' | 'paid' | 'unpaid';
export type InvoiceOrganizationFilter = 'all' | 'with_organizations' | 'without_organizations';

export type MongoFilemakerInvoiceOrganizationLink = {
  id: string;
  legacyOrganizationUuid?: string;
  organizationId?: string;
  organizationName?: string;
};

export type MongoFilemakerInvoice = {
  cIssueYear?: string;
  cPaymentDue?: string;
  dayForPayment?: string;
  eventDate?: string;
  filesPathListName?: string;
  filesPathListUuid?: string;
  id: string;
  invoiceNo?: string;
  issueDate?: string;
  isPaid?: string;
  linkedOrganizations: MongoFilemakerInvoiceOrganizationLink[];
  organizationBName?: string;
  organizationBUuid?: string;
  organizationLinkCount: number;
  organizationSName?: string;
  organizationSUuid?: string;
  paidSoFar?: string;
  paymentType?: string;
  servicesAmount?: string;
  servicesCurrency?: string;
  servicesServiceType?: string;
  servicesSum?: string;
  servicesTaxComment?: string;
  signature?: string;
  unresolvedOrganizationLinkCount: number;
};

export type InvoiceFilters = {
  organization: InvoiceOrganizationFilter;
  payment: InvoicePaymentFilter;
  year: string;
};

export type MongoFilemakerInvoicesResponse = {
  collectionCount: number;
  filters: InvoiceFilters;
  invoices: MongoFilemakerInvoice[];
  limit: number;
  page: number;
  pageSize: number;
  query: string;
  totalCount: number;
  totalPages: number;
};

export type MongoFilemakerInvoicesState = MongoFilemakerInvoicesResponse & {
  error: string | null;
  isLoading: boolean;
};

export type InvoiceListState = {
  actions: PanelAction[];
  error: string | null;
  exportingInvoiceId: string | null;
  filters: InvoiceFilters;
  isLoading: boolean;
  nodes: MasterTreeNode[];
  onExportInvoicePdf: (invoiceId: string) => void;
  onFilterChange: (key: string, value: unknown) => void;
  onPageChange: (value: number) => void;
  onPageSizeChange: (value: number) => void;
  onQueryChange: (value: string) => void;
  onResetFilters: () => void;
  page: number;
  pageSize: number;
  query: string;
  renderNode: (input: FolderTreeViewportRenderNodeInput) => React.ReactNode;
  shownCount: number;
  totalCount: number;
  totalPages: number;
};

export const DEFAULT_INVOICE_PAGE_SIZE = 48;
export const INVOICE_PAGE_SIZE_OPTIONS = [24, 48, 96, 200];

export const createDefaultInvoiceFilters = (): InvoiceFilters => ({
  organization: 'all',
  payment: 'all',
  year: '',
});

export const EMPTY_INVOICES_RESPONSE: MongoFilemakerInvoicesResponse = {
  collectionCount: 0,
  filters: createDefaultInvoiceFilters(),
  invoices: [],
  limit: DEFAULT_INVOICE_PAGE_SIZE,
  page: 1,
  pageSize: DEFAULT_INVOICE_PAGE_SIZE,
  query: '',
  totalCount: 0,
  totalPages: 1,
};
