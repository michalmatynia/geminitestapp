import type React from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type { FilemakerPerson } from '../types';

export type PersonAddressFilter = 'all' | 'with_address' | 'without_address';
export type PersonBankFilter = 'all' | 'with_bank' | 'without_bank';
export type PersonOrganizationFilter = 'all' | 'with_organizations' | 'without_organizations';

export type MongoFilemakerPersonOrganizationLink = {
  id: string;
  legacyOrganizationUuid: string;
  organizationId?: string;
  organizationName?: string;
};

export type MongoFilemakerPerson = FilemakerPerson & {
  checked1?: boolean;
  checked2?: boolean;
  dateOfBirth?: string;
  fullName: string;
  legacyDefaultAddressUuid?: string;
  legacyDefaultBankAccountUuid?: string;
  legacyDisplayAddressUuid?: string;
  legacyDisplayBankAccountUuid?: string;
  legacyOrganizationUuids: string[];
  legacyParentUuid?: string;
  legacyUuid?: string;
  linkedOrganizations: MongoFilemakerPersonOrganizationLink[];
  organizationLinkCount: number;
  unresolvedOrganizationLinkCount: number;
  updatedBy?: string;
};

export type PersonFilters = {
  address: PersonAddressFilter;
  bank: PersonBankFilter;
  organization: PersonOrganizationFilter;
  updatedBy: string;
};

export type MongoFilemakerPersonsResponse = {
  collectionCount: number;
  filters: PersonFilters;
  limit: number;
  page: number;
  pageSize: number;
  persons: MongoFilemakerPerson[];
  query: string;
  totalCount: number;
  totalPages: number;
};

export type MongoFilemakerPersonsState = MongoFilemakerPersonsResponse & {
  error: string | null;
  isLoading: boolean;
};

export type PersonListState = {
  actions: PanelAction[];
  error: string | null;
  filters: PersonFilters;
  isLoading: boolean;
  nodes: MasterTreeNode[];
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

export const DEFAULT_PERSON_PAGE_SIZE = 48;
export const PERSON_PAGE_SIZE_OPTIONS = [24, 48, 96, 200];

export const createDefaultPersonFilters = (): PersonFilters => ({
  address: 'all',
  bank: 'all',
  organization: 'all',
  updatedBy: '',
});

export const EMPTY_PERSONS_RESPONSE: MongoFilemakerPersonsResponse = {
  collectionCount: 0,
  filters: createDefaultPersonFilters(),
  limit: DEFAULT_PERSON_PAGE_SIZE,
  page: 1,
  pageSize: DEFAULT_PERSON_PAGE_SIZE,
  persons: [],
  query: '',
  totalCount: 0,
  totalPages: 1,
};
