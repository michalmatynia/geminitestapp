import type React from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type { FilemakerOrganization } from '../types';

export type OrganizationAddressFilter = 'all' | 'with_address' | 'without_address';
export type OrganizationBankFilter = 'all' | 'with_bank' | 'without_bank';
export type OrganizationParentFilter = 'all' | 'root' | 'child';

export type OrganizationFilters = {
  address: OrganizationAddressFilter;
  bank: OrganizationBankFilter;
  parent: OrganizationParentFilter;
  updatedBy: string;
};

export type MongoFilemakerOrganizationsResponse = {
  collectionCount: number;
  filters: OrganizationFilters;
  limit: number;
  organizations: FilemakerOrganization[];
  page: number;
  pageSize: number;
  query: string;
  totalCount: number;
  totalPages: number;
};

export type MongoFilemakerOrganizationsState = MongoFilemakerOrganizationsResponse & {
  error: string | null;
  isLoading: boolean;
};

export type OrganizationListState = {
  actions: PanelAction[];
  customActions: React.ReactNode;
  error: string | null;
  filters: OrganizationFilters;
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

export const DEFAULT_ORGANIZATION_PAGE_SIZE = 48;
export const ORGANIZATION_PAGE_SIZE_OPTIONS = [24, 48, 96, 200];

export const createDefaultOrganizationFilters = (): OrganizationFilters => ({
  address: 'all',
  bank: 'all',
  parent: 'all',
  updatedBy: '',
});

export const EMPTY_ORGANIZATIONS_RESPONSE: MongoFilemakerOrganizationsResponse = {
  collectionCount: 0,
  filters: createDefaultOrganizationFilters(),
  limit: DEFAULT_ORGANIZATION_PAGE_SIZE,
  organizations: [],
  page: 1,
  pageSize: DEFAULT_ORGANIZATION_PAGE_SIZE,
  query: '',
  totalCount: 0,
  totalPages: 1,
};
