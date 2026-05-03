import type React from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type { FilemakerEvent } from '../types';

export type EventAddressFilter = 'all' | 'with_address' | 'without_address';
export type EventOrganizationFilter = 'all' | 'with_organizations' | 'without_organizations';
export type EventStatusFilter = 'all' | 'active' | 'discontinued';

export type MongoFilemakerEventOrganizationLink = {
  id: string;
  legacyOrganizationUuid: string;
  organizationId?: string;
  organizationName?: string;
};

export type MongoFilemakerEvent = FilemakerEvent & {
  checked1?: boolean;
  checked2?: boolean;
  cooperationStatus?: string;
  currentDay?: string;
  currentWeekNumber?: number;
  discontinued?: boolean;
  displayAddressId?: string | null;
  eventStartDate?: string;
  lastEventInstanceDate?: string;
  legacyDefaultAddressUuid?: string;
  legacyDisplayAddressUuid?: string;
  legacyHowOftenUuid?: string;
  legacyLastEventInstanceUuid?: string;
  legacyParentUuid?: string;
  legacyUuid?: string;
  lengthDay?: number;
  linkedOrganizations: MongoFilemakerEventOrganizationLink[];
  moveDay?: number;
  organizationFilter?: string;
  organizationFilterCount?: number;
  organizationLinkCount: number;
  registrationMonth?: string;
  unresolvedOrganizationLinkCount: number;
  updatedBy?: string;
  websiteFilter?: string;
  websiteFilterCount?: number;
};

export type EventFilters = {
  address: EventAddressFilter;
  organization: EventOrganizationFilter;
  status: EventStatusFilter;
  updatedBy: string;
};

export type MongoFilemakerEventsResponse = {
  collectionCount: number;
  events: MongoFilemakerEvent[];
  filters: EventFilters;
  limit: number;
  page: number;
  pageSize: number;
  query: string;
  totalCount: number;
  totalPages: number;
};

export type MongoFilemakerEventsState = MongoFilemakerEventsResponse & {
  error: string | null;
  isLoading: boolean;
};

export type EventListState = {
  actions: PanelAction[];
  error: string | null;
  filters: EventFilters;
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

export const DEFAULT_EVENT_PAGE_SIZE = 48;
export const EVENT_PAGE_SIZE_OPTIONS = [24, 48, 96, 200];

export const createDefaultEventFilters = (): EventFilters => ({
  address: 'all',
  organization: 'all',
  status: 'all',
  updatedBy: '',
});

export const EMPTY_EVENTS_RESPONSE: MongoFilemakerEventsResponse = {
  collectionCount: 0,
  events: [],
  filters: createDefaultEventFilters(),
  limit: DEFAULT_EVENT_PAGE_SIZE,
  page: 1,
  pageSize: DEFAULT_EVENT_PAGE_SIZE,
  query: '',
  totalCount: 0,
  totalPages: 1,
};
