import type React from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type { FilemakerPerson } from '../types';

export type PersonAddressFilter = 'all' | 'with_address' | 'without_address';
export type PersonBankFilter = 'all' | 'with_bank' | 'without_bank';
export type PersonOrganizationFilter = 'all' | 'with_organizations' | 'without_organizations';
export type PersonSortOption =
  | 'createdAt_desc'
  | 'createdAt_asc'
  | 'updatedAt_desc'
  | 'updatedAt_asc'
  | 'organizationLinkCount_desc'
  | 'organizationLinkCount_asc'
  | 'name_asc'
  | 'name_desc';

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
  sort: PersonSortOption;
  totalCount: number;
  totalCountIsExact: boolean;
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
  onSortChange: (value: PersonSortOption) => void;
  page: number;
  pageSize: number;
  query: string;
  renderNode: (input: FolderTreeViewportRenderNodeInput) => React.ReactNode;
  shownCount: number;
  sort: PersonSortOption;
  totalCount: number;
  totalCountIsExact: boolean;
  totalPages: number;
};

export const DEFAULT_PERSON_PAGE_SIZE = 48;
export const DEFAULT_PERSON_SORT: PersonSortOption = 'updatedAt_desc';
export const PERSON_PAGE_SIZE_OPTIONS = [24, 48, 96, 200];
export const PERSON_SORT_OPTIONS: Array<{
  label: string;
  value: PersonSortOption;
}> = [
  { label: 'Updated At: Newest First', value: 'updatedAt_desc' },
  { label: 'Updated At: Oldest First', value: 'updatedAt_asc' },
  { label: 'Created At: Newest First', value: 'createdAt_desc' },
  { label: 'Created At: Oldest First', value: 'createdAt_asc' },
  { label: 'Organisations: Most First', value: 'organizationLinkCount_desc' },
  { label: 'Organisations: Fewest First', value: 'organizationLinkCount_asc' },
  { label: 'Name: A-Z', value: 'name_asc' },
  { label: 'Name: Z-A', value: 'name_desc' },
];

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
  sort: DEFAULT_PERSON_SORT,
  totalCount: 0,
  totalCountIsExact: true,
  totalPages: 1,
};
