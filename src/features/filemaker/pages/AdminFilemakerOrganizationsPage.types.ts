import type React from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type { OrganizationAdvancedFilterPreset } from '../filemaker-organization-advanced-filters';
import type { FilemakerEvent, FilemakerOrganization } from '../types';

export type OrganizationSelectionState = Record<string, boolean>;

export type OrganizationAddressFilter = 'all' | 'with_address' | 'without_address';
export type OrganizationBankFilter = 'all' | 'with_bank' | 'without_bank';
export type OrganizationParentFilter = 'all' | 'root' | 'child';

export type OrganizationFilters = {
  address: OrganizationAddressFilter;
  advancedFilter: string;
  bank: OrganizationBankFilter;
  parent: OrganizationParentFilter;
  updatedBy: string;
};

export type MongoFilemakerOrganizationsResponse = {
  collectionCount: number;
  filters: OrganizationFilters;
  limit: number;
  linkedEventsByOrganizationId: Record<string, FilemakerEvent[]>;
  organizations: FilemakerOrganization[];
  page: number;
  pageSize: number;
  query: string;
  totalCount: number;
  totalCountIsExact: boolean;
  totalPages: number;
};

export type MongoFilemakerOrganizationsState = MongoFilemakerOrganizationsResponse & {
  error: string | null;
  isLoading: boolean;
};

export type OrganizationListState = {
  actions: PanelAction[];
  activeAdvancedFilterPresetId: string | null;
  advancedFilterPresets: OrganizationAdvancedFilterPreset[];
  error: string | null;
  filters: OrganizationFilters;
  isLoading: boolean;
  isSelectingAllOrganizations: boolean;
  nodes: MasterTreeNode[];
  onDeselectAllOrganizations: () => void;
  onDeselectOrganizationsPage: () => void;
  onFilterChange: (key: string, value: unknown) => void;
  onLaunchOrganizationEmailScrape: (organizationId: string) => void;
  onLaunchOrganizationWebsiteSocialScrape: (organizationId: string) => void;
  onPageChange: (value: number) => void;
  onPageSizeChange: (value: number) => void;
  onJobBoardScrapeCompleted: () => void;
  onQueryChange: (value: string) => void;
  onResetFilters: () => void;
  onSelectAllOrganizations: () => Promise<void>;
  onSelectOrganizationsPage: () => void;
  onSetAdvancedFilterPresets: (presets: OrganizationAdvancedFilterPreset[]) => Promise<void>;
  onSetAdvancedFilterState: (value: string, presetId: string | null) => void;
  onToggleOrganizationSelection: (organizationId: string, checked: boolean) => void;
  organizationEmailScrapeState: Record<string, boolean>;
  organizationWebsiteSocialScrapeState: Record<string, boolean>;
  organizationSelection: OrganizationSelectionState;
  organizations: FilemakerOrganization[];
  page: number;
  pageSize: number;
  query: string;
  renderNode: (input: FolderTreeViewportRenderNodeInput) => React.ReactNode;
  selectedOrganizationCount: number;
  shownCount: number;
  totalCount: number;
  totalCountIsExact: boolean;
  totalPages: number;
};

export const DEFAULT_ORGANIZATION_PAGE_SIZE = 48;
export const ORGANIZATION_PAGE_SIZE_OPTIONS = [24, 48, 96, 200];

export const createDefaultOrganizationFilters = (): OrganizationFilters => ({
  address: 'all',
  advancedFilter: '',
  bank: 'all',
  parent: 'all',
  updatedBy: '',
});

export const EMPTY_ORGANIZATIONS_RESPONSE: MongoFilemakerOrganizationsResponse = {
  collectionCount: 0,
  filters: createDefaultOrganizationFilters(),
  limit: DEFAULT_ORGANIZATION_PAGE_SIZE,
  linkedEventsByOrganizationId: {},
  organizations: [],
  page: 1,
  pageSize: DEFAULT_ORGANIZATION_PAGE_SIZE,
  query: '',
  totalCount: 0,
  totalCountIsExact: true,
  totalPages: 1,
};
