import type React from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type { OrganizationAdvancedFilterPreset } from '../filemaker-organization-advanced-filters';
import type { FilemakerEvent, FilemakerJobListing, FilemakerOrganization } from '../types';

export type OrganizationSelectionState = Record<string, boolean>;

export type OrganizationAddressFilter = 'all' | 'with_address' | 'without_address';
export type OrganizationBankFilter = 'all' | 'with_bank' | 'without_bank';
export type OrganizationParentFilter = 'all' | 'root' | 'child';
export type OrganizationSortOption =
  | 'createdAt_desc'
  | 'createdAt_asc'
  | 'updatedAt_desc'
  | 'updatedAt_asc'
  | 'eventCount_desc'
  | 'eventCount_asc'
  | 'jobListingCount_desc'
  | 'jobListingCount_asc'
  | 'name_asc'
  | 'name_desc';

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
  linkedJobListingsByOrganizationId: Record<string, FilemakerJobListing[]>;
  organizations: FilemakerOrganization[];
  page: number;
  pageSize: number;
  query: string;
  sort: OrganizationSortOption;
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
  isDeletingOrganizations: boolean;
  isLoading: boolean;
  isSelectingAllOrganizations: boolean;
  nodes: MasterTreeNode[];
  onDeselectAllOrganizations: () => void;
  onDeselectOrganizationsPage: () => void;
  onDeleteOrganization: (organization: FilemakerOrganization) => void;
  onDeleteSelectedOrganizations: () => void;
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
  onSortChange: (value: OrganizationSortOption) => void;
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
  sort: OrganizationSortOption;
  totalCount: number;
  totalCountIsExact: boolean;
  totalPages: number;
  ConfirmationModal: React.ComponentType;
};

export const DEFAULT_ORGANIZATION_PAGE_SIZE = 48;
export const DEFAULT_ORGANIZATION_SORT: OrganizationSortOption = 'updatedAt_desc';
export const ORGANIZATION_PAGE_SIZE_OPTIONS = [24, 48, 96, 200];
export const ORGANIZATION_SORT_OPTIONS: Array<{
  label: string;
  value: OrganizationSortOption;
}> = [
  { label: 'Updated At: Newest First', value: 'updatedAt_desc' },
  { label: 'Updated At: Oldest First', value: 'updatedAt_asc' },
  { label: 'Created At: Newest First', value: 'createdAt_desc' },
  { label: 'Created At: Oldest First', value: 'createdAt_asc' },
  { label: 'Events: Most First', value: 'eventCount_desc' },
  { label: 'Events: Fewest First', value: 'eventCount_asc' },
  { label: 'Jobs: Most First', value: 'jobListingCount_desc' },
  { label: 'Jobs: Fewest First', value: 'jobListingCount_asc' },
  { label: 'Name: A-Z', value: 'name_asc' },
  { label: 'Name: Z-A', value: 'name_desc' },
];

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
  linkedJobListingsByOrganizationId: {},
  organizations: [],
  page: 1,
  pageSize: DEFAULT_ORGANIZATION_PAGE_SIZE,
  query: '',
  sort: DEFAULT_ORGANIZATION_SORT,
  totalCount: 0,
  totalCountIsExact: true,
  totalPages: 1,
};
