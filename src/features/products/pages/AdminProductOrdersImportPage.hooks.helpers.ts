'use client';

import { useMemo } from 'react';

import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import type {
  BaseOrderImportPreviewItem,
  BaseOrderImportStatusOption,
} from '@/shared/contracts/products/orders-import';

import {
  BASE_INTEGRATION_SLUGS,
  formatPreviewScopeConnection,
  formatPreviewScopeDateRange,
  formatPreviewScopeStatus,
  getOrderTimestamp,
  normalizeSortText,
  type ImportStateFilter,
  type PreviewScopeChangeItem,
  type PreviewScopeState,
  type PreviewSortOption,
} from './AdminProductOrdersImportPage.utils';

export type BaseConnectionOption = {
  value: string;
  label: string;
};

type SearchParamReader = {
  get(name: string): string | null;
};

export const getInitialSearchParam = (
  searchParams: SearchParamReader,
  key: string,
  fallback = ''
): string => searchParams.get(key) ?? fallback;

export const optionalRequestString = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const useBaseConnectionOptions = (
  integrationsWithConnections: IntegrationWithConnections[] | undefined
): BaseConnectionOption[] =>
  useMemo(
    () =>
      (integrationsWithConnections ?? [])
        .filter((integration) => BASE_INTEGRATION_SLUGS.has(integration.slug))
        .flatMap((integration) =>
          integration.connections.map((connection) => ({
            value: connection.id,
            label: `${connection.name} (${integration.name})`,
          }))
        ),
    [integrationsWithConnections]
  );

export const usePreviewStaleState = (
  currentScope: PreviewScopeState,
  lastPreviewScope: PreviewScopeState | null,
  hasPreview: boolean
): boolean =>
  useMemo(() => {
    if (!hasPreview || lastPreviewScope === null) return false;
    return (
      currentScope.connectionId !== lastPreviewScope.connectionId ||
      currentScope.dateFrom !== lastPreviewScope.dateFrom ||
      currentScope.dateTo !== lastPreviewScope.dateTo ||
      currentScope.statusId !== lastPreviewScope.statusId ||
      currentScope.limit !== lastPreviewScope.limit
    );
  }, [currentScope, hasPreview, lastPreviewScope]);

const buildStatusOptions = (
  availableStatuses: BaseOrderImportStatusOption[]
): BaseConnectionOption[] =>
  availableStatuses.map((status) => ({
    value: status.id,
    label: status.name,
  }));

export const usePreviewScopeChanges = ({
  availableStatuses,
  baseConnections,
  currentScope,
  isPreviewStale,
  lastPreviewScope,
}: {
  availableStatuses: BaseOrderImportStatusOption[];
  baseConnections: BaseConnectionOption[];
  currentScope: PreviewScopeState;
  isPreviewStale: boolean;
  lastPreviewScope: PreviewScopeState | null;
}): PreviewScopeChangeItem[] =>
  useMemo(() => {
    if (lastPreviewScope === null || !isPreviewStale) return [];

    const changes: PreviewScopeChangeItem[] = [];
    if (currentScope.connectionId !== lastPreviewScope.connectionId) {
      changes.push({
        key: 'connection',
        label: 'Connection',
        loaded: formatPreviewScopeConnection(lastPreviewScope.connectionId, baseConnections),
        current: formatPreviewScopeConnection(currentScope.connectionId, baseConnections),
      });
    }
    if (
      currentScope.dateFrom !== lastPreviewScope.dateFrom ||
      currentScope.dateTo !== lastPreviewScope.dateTo
    ) {
      changes.push({
        key: 'dateRange',
        label: 'Date Range',
        loaded: formatPreviewScopeDateRange(lastPreviewScope),
        current: formatPreviewScopeDateRange(currentScope),
      });
    }
    if (currentScope.statusId !== lastPreviewScope.statusId) {
      const statusOptions = buildStatusOptions(availableStatuses);
      changes.push({
        key: 'status',
        label: 'Status',
        loaded: formatPreviewScopeStatus(lastPreviewScope.statusId, statusOptions),
        current: formatPreviewScopeStatus(currentScope.statusId, statusOptions),
      });
    }
    if (currentScope.limit !== lastPreviewScope.limit) {
      changes.push({
        key: 'limit',
        label: 'Preview Limit',
        loaded: lastPreviewScope.limit,
        current: currentScope.limit,
      });
    }
    return changes;
  }, [availableStatuses, baseConnections, currentScope, isPreviewStale, lastPreviewScope]);

const getImportPriority = (order: BaseOrderImportPreviewItem): number => {
  const priority = { changed: 0, new: 1, imported: 2 };
  return priority[order.importState];
};

const comparePreviewOrders = (
  viewSort: PreviewSortOption,
  first: BaseOrderImportPreviewItem,
  second: BaseOrderImportPreviewItem
): number => {
  switch (viewSort) {
    case 'created-desc':
      return getOrderTimestamp(second.orderCreatedAt) - getOrderTimestamp(first.orderCreatedAt);
    case 'created-asc':
      return getOrderTimestamp(first.orderCreatedAt) - getOrderTimestamp(second.orderCreatedAt);
    case 'customer-asc':
      return normalizeSortText(first.buyerName).localeCompare(normalizeSortText(second.buyerName));
    case 'total-desc':
      return (second.totalGross ?? 0) - (first.totalGross ?? 0);
    case 'import-priority':
      return getImportPriority(first) - getImportPriority(second);
    default:
      return 0;
  }
};

const orderMatchesSearch = (order: BaseOrderImportPreviewItem, query: string): boolean =>
  normalizeSortText(order.baseOrderId).includes(query) ||
  normalizeSortText(order.orderNumber).includes(query) ||
  normalizeSortText(order.buyerName).includes(query) ||
  normalizeSortText(order.buyerEmail).includes(query);

export const useFilteredPreviewOrders = ({
  deferredSearchQuery,
  importStateFilter,
  orders,
  viewSort,
}: {
  deferredSearchQuery: string;
  importStateFilter: ImportStateFilter;
  orders: BaseOrderImportPreviewItem[];
  viewSort: PreviewSortOption;
}): BaseOrderImportPreviewItem[] =>
  useMemo(() => {
    const normalizedSearchQuery = normalizeSortText(deferredSearchQuery);
    const result = orders.filter((order) => {
      const matchesImportState =
        importStateFilter === 'all' || order.importState === importStateFilter;
      const matchesSearch =
        normalizedSearchQuery.length === 0 || orderMatchesSearch(order, normalizedSearchQuery);
      return matchesImportState && matchesSearch;
    });

    result.sort((first, second) => comparePreviewOrders(viewSort, first, second));
    return result;
  }, [deferredSearchQuery, importStateFilter, orders, viewSort]);
