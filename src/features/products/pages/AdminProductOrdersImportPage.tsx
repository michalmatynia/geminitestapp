'use client';

import { ChevronDown, ChevronUp, Download, RefreshCcw, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import {
  useImportBaseOrdersMutation,
  usePreviewBaseOrdersMutation,
  useQuickImportBaseOrdersMutation,
  useBaseOrderImportStatuses,
} from '@/features/products/hooks/useProductOrdersImport';
import { buildBaseOrderQuickImportFeedback } from '@/features/products/utils/base-order-quick-import-feedback';
import {
  useDefaultExportConnection,
  useIntegrationsWithConnections,
} from '@/shared/hooks/useIntegrationQueries';
import type {
  BaseOrderImportPreviewItem,
  BaseOrderImportPreviousSnapshot,
  BaseOrderImportPreviewResponse,
  BaseOrderImportState,
} from '@/shared/contracts/products';
import {
  AdminProductsPageLayout,
  Alert,
  Badge,
  Button,
  Checkbox,
  EmptyState,
  Input,
  SearchInput,
  SelectSimple,
  StandardDataTablePanel,
  StatusBadge,
} from '@/shared/ui';

import type { RowSelectionState, ColumnDef, Row, Table } from '@tanstack/react-table';

const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);

const LIMIT_OPTIONS = ['25', '50', '100', '150', '250'].map((value) => ({
  value,
  label: value,
}));

type FeedbackState =
  | {
      variant: 'success' | 'error' | 'info';
      message: string;
    }
  | null;

type ImportStateFilter = 'all' | BaseOrderImportState;
type PreviewSortOption =
  | 'created-desc'
  | 'created-asc'
  | 'customer-asc'
  | 'total-desc'
  | 'import-priority';
type PreviewScopeState = {
  connectionId: string;
  dateFrom: string;
  dateTo: string;
  statusId: string;
  limit: string;
};
type PreviewScopeChangeItem = {
  key: string;
  label: string;
  loaded: string;
  current: string;
};

type OrderChangeSummaryItem = {
  key: string;
  label: string;
  previous: string;
  current: string;
};

const formatOrderDate = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const formatOrderTotal = (amount: number | null, currency: string | null): string => {
  if (amount === null || !Number.isFinite(amount)) return '—';
  if (currency?.trim()) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  }
  return amount.toFixed(2);
};

const formatItemsTotal = (order: Pick<BaseOrderImportPreviewItem, 'lineItems'>): number =>
  order.lineItems.reduce((total, item) => total + item.quantity, 0);

const summarizeOrderAggregate = (
  orders: Array<Pick<BaseOrderImportPreviewItem, 'currency' | 'totalGross' | 'lineItems'>>
): {
  itemsTotal: number;
  grossLabel: string;
} => {
  const itemsTotal = orders.reduce((total, order) => total + formatItemsTotal(order), 0);
  const normalizedCurrencies = new Set(
    orders
      .map((order) => order.currency?.trim())
      .filter((currency): currency is string => Boolean(currency))
  );

  if (orders.length === 0) {
    return {
      itemsTotal,
      grossLabel: formatOrderTotal(0, null),
    };
  }

  if (normalizedCurrencies.size > 1) {
    return {
      itemsTotal,
      grossLabel: 'Mixed currencies',
    };
  }

  const [currency] = [...normalizedCurrencies];
  const grossTotal = orders.reduce((total, order) => {
    if (typeof order.totalGross !== 'number' || !Number.isFinite(order.totalGross)) {
      return total;
    }
    return total + order.totalGross;
  }, 0);

  return {
    itemsTotal,
    grossLabel: formatOrderTotal(grossTotal, currency ?? null),
  };
};

const formatTextValue = (value: string | null): string => {
  const normalized = value?.trim();
  return normalized ? normalized : '—';
};

const getOrderTimestamp = (value: string | null): number => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
};

const normalizeSortText = (value: string | null): string => value?.trim().toLowerCase() ?? '';

const formatPreviewScopeDateRange = (scope: PreviewScopeState): string => {
  const from = scope.dateFrom.trim();
  const to = scope.dateTo.trim();
  if (!from && !to) return 'Any date';
  return `${from || 'Any'} -> ${to || 'Any'}`;
};

const formatPreviewScopeStatus = (
  statusId: string,
  statusOptions: Array<{ value: string; label: string }>
): string => {
  if (!statusId.trim()) return 'All statuses';
  return statusOptions.find((option) => option.value === statusId)?.label ?? statusId;
};

const formatPreviewScopeConnection = (
  connectionId: string,
  connectionOptions: Array<{ value: string; label: string }>
): string => {
  if (!connectionId.trim()) return 'No connection';
  return connectionOptions.find((option) => option.value === connectionId)?.label ?? connectionId;
};

const buildPreviousImportSnapshot = (
  order: BaseOrderImportPreviewItem,
  syncedAt: string
): BaseOrderImportPreviousSnapshot => ({
  orderNumber: order.orderNumber ?? null,
  externalStatusId: order.externalStatusId ?? null,
  externalStatusName: order.externalStatusName ?? null,
  buyerName: order.buyerName,
  buyerEmail: order.buyerEmail ?? null,
  currency: order.currency ?? null,
  totalGross: order.totalGross ?? null,
  deliveryMethod: order.deliveryMethod ?? null,
  paymentMethod: order.paymentMethod ?? null,
  source: order.source ?? null,
  orderCreatedAt: order.orderCreatedAt ?? null,
  orderUpdatedAt: order.orderUpdatedAt ?? null,
  lineItems: order.lineItems,
  lastImportedAt: syncedAt,
});

const buildOrderChangeSummary = (order: BaseOrderImportPreviewItem): OrderChangeSummaryItem[] => {
  if (!order.previousImport) return [];

  const previous = order.previousImport;
  const changes: OrderChangeSummaryItem[] = [];

  const pushChange = (
    key: string,
    label: string,
    previousValue: string,
    currentValue: string
  ): void => {
    if (previousValue === currentValue) return;
    changes.push({ key, label, previous: previousValue, current: currentValue });
  };

  pushChange(
    'status',
    'Status changed',
    formatTextValue(previous.externalStatusName ?? previous.externalStatusId ?? 'Unknown'),
    formatTextValue(order.externalStatusName ?? order.externalStatusId ?? 'Unknown')
  );
  pushChange(
    'total',
    'Total changed',
    formatOrderTotal(previous.totalGross, previous.currency),
    formatOrderTotal(order.totalGross, order.currency)
  );
  pushChange(
    'items',
    'Items changed',
    String(formatItemsTotal(previous)),
    String(formatItemsTotal(order))
  );
  pushChange(
    'delivery',
    'Delivery changed',
    formatTextValue(previous.deliveryMethod),
    formatTextValue(order.deliveryMethod)
  );
  pushChange(
    'payment',
    'Payment changed',
    formatTextValue(previous.paymentMethod),
    formatTextValue(order.paymentMethod)
  );
  pushChange(
    'buyer',
    'Buyer changed',
    formatTextValue(previous.buyerName),
    formatTextValue(order.buyerName)
  );
  pushChange(
    'email',
    'Email changed',
    formatTextValue(previous.buyerEmail),
    formatTextValue(order.buyerEmail)
  );
  pushChange(
    'source',
    'Source changed',
    formatTextValue(previous.source),
    formatTextValue(order.source)
  );

  return changes;
};

const IMPORT_STATE_LABELS: Record<BaseOrderImportState, string> = {
  new: 'New',
  imported: 'Imported',
  changed: 'Changed',
};

const IMPORT_STATE_VARIANTS: Record<BaseOrderImportState, 'active' | 'neutral' | 'warning'> = {
  new: 'active',
  imported: 'neutral',
  changed: 'warning',
};

const IMPORT_STATE_SORT_ORDER: Record<BaseOrderImportState, number> = {
  new: 0,
  changed: 1,
  imported: 2,
};

export function AdminProductOrdersImportPage(): React.JSX.Element {
  const integrationsQuery = useIntegrationsWithConnections();
  const defaultConnectionQuery = useDefaultExportConnection();
  const previewMutation = usePreviewBaseOrdersMutation();
  const importMutation = useImportBaseOrdersMutation();
  const quickImportMutation = useQuickImportBaseOrdersMutation();

  const [selectedConnectionId, setSelectedConnectionId] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [statusId, setStatusId] = React.useState('');
  const [limit, setLimit] = React.useState('50');
  const [search, setSearch] = React.useState('');
  const [importStateFilter, setImportStateFilter] = React.useState<ImportStateFilter>('all');
  const [sortBy, setSortBy] = React.useState<PreviewSortOption>('created-desc');
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [preview, setPreview] = React.useState<BaseOrderImportPreviewResponse | null>(null);
  const [lastPreviewScopeKey, setLastPreviewScopeKey] = React.useState<string | null>(null);
  const [lastPreviewScope, setLastPreviewScope] = React.useState<PreviewScopeState | null>(null);
  const [feedback, setFeedback] = React.useState<FeedbackState>(null);

  const baseConnections = React.useMemo(() => {
    const integrations = integrationsQuery.data ?? [];
    return integrations
      .filter((integration) => BASE_INTEGRATION_SLUGS.has((integration.slug ?? '').trim().toLowerCase()))
      .flatMap((integration) =>
        (integration.connections ?? []).map((connection) => ({
          id: connection.id,
          label: connection.name,
          description: integration.name,
        }))
      );
  }, [integrationsQuery.data]);

  React.useEffect(() => {
    if (!baseConnections.length) {
      if (selectedConnectionId) {
        setSelectedConnectionId('');
      }
      return;
    }

    if (selectedConnectionId) return;

    const preferredId = defaultConnectionQuery.data?.connectionId?.trim();
    const matchingPreferred = preferredId
      ? baseConnections.find((connection) => connection.id === preferredId)
      : null;
    setSelectedConnectionId(matchingPreferred?.id ?? baseConnections[0]?.id ?? '');
  }, [baseConnections, defaultConnectionQuery.data?.connectionId, selectedConnectionId]);

  const statusesQuery = useBaseOrderImportStatuses(selectedConnectionId);

  React.useEffect(() => {
    setStatusId('');
  }, [selectedConnectionId]);

  const connectionOptions = React.useMemo(
    () => [
      { value: '__none__', label: 'Select Base.com connection' },
      ...baseConnections.map((connection) => ({
        value: connection.id,
        label: connection.label,
        description: connection.description,
      })),
    ],
    [baseConnections]
  );

  const statusOptions = React.useMemo(
    () => [
      { value: '__all__', label: 'All statuses' },
      ...(statusesQuery.data ?? []).map((status) => ({
        value: status.id,
        label: status.name,
      })),
    ],
    [statusesQuery.data]
  );

  const importStateOptions = React.useMemo(
    () => [
      { value: 'all', label: 'All import states' },
      { value: 'new', label: 'New only' },
      { value: 'changed', label: 'Changed only' },
      { value: 'imported', label: 'Imported only' },
    ],
    []
  );

  const sortOptions = React.useMemo(
    () => [
      { value: 'created-desc', label: 'Newest created' },
      { value: 'created-asc', label: 'Oldest created' },
      { value: 'customer-asc', label: 'Customer A-Z' },
      { value: 'total-desc', label: 'Highest total' },
      { value: 'import-priority', label: 'Import priority' },
    ],
    []
  );

  const currentPreviewScopeKey = React.useMemo(
    () => [selectedConnectionId, dateFrom, dateTo, statusId, limit].join('::'),
    [selectedConnectionId, dateFrom, dateTo, statusId, limit]
  );

  const currentPreviewScope = React.useMemo<PreviewScopeState>(
    () => ({
      connectionId: selectedConnectionId,
      dateFrom,
      dateTo,
      statusId,
      limit,
    }),
    [selectedConnectionId, dateFrom, dateTo, statusId, limit]
  );

  const filteredOrders = React.useMemo(() => {
    const orders = preview?.orders ?? [];
    const normalizedQuery = search.trim().toLowerCase();
    const nextOrders = orders.filter((order) => {
      if (importStateFilter !== 'all' && order.importState !== importStateFilter) {
        return false;
      }
      if (!normalizedQuery) return true;

      const haystack = [
        order.baseOrderId,
        order.orderNumber ?? '',
        order.buyerName,
        order.buyerEmail ?? '',
        order.externalStatusName ?? '',
        order.externalStatusId ?? '',
        order.deliveryMethod ?? '',
        order.paymentMethod ?? '',
        order.source ?? '',
        ...order.lineItems.flatMap((item) => [
          item.name,
          item.sku ?? '',
          item.baseProductId ?? '',
        ]),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });

    return [...nextOrders].sort((left, right) => {
      switch (sortBy) {
        case 'created-asc':
          return (
            getOrderTimestamp(left.orderCreatedAt) - getOrderTimestamp(right.orderCreatedAt) ||
            left.baseOrderId.localeCompare(right.baseOrderId)
          );
        case 'customer-asc':
          return (
            normalizeSortText(left.buyerName).localeCompare(normalizeSortText(right.buyerName)) ||
            getOrderTimestamp(right.orderCreatedAt) - getOrderTimestamp(left.orderCreatedAt)
          );
        case 'total-desc':
          return (
            (right.totalGross ?? Number.NEGATIVE_INFINITY) -
              (left.totalGross ?? Number.NEGATIVE_INFINITY) ||
            getOrderTimestamp(right.orderCreatedAt) - getOrderTimestamp(left.orderCreatedAt)
          );
        case 'import-priority':
          return (
            IMPORT_STATE_SORT_ORDER[left.importState] - IMPORT_STATE_SORT_ORDER[right.importState] ||
            getOrderTimestamp(right.orderCreatedAt) - getOrderTimestamp(left.orderCreatedAt)
          );
        case 'created-desc':
        default:
          return (
            getOrderTimestamp(right.orderCreatedAt) - getOrderTimestamp(left.orderCreatedAt) ||
            right.baseOrderId.localeCompare(left.baseOrderId)
          );
      }
    });
  }, [importStateFilter, preview?.orders, search, sortBy]);

  const selectedOrders = React.useMemo(
    () =>
      (preview?.orders ?? []).filter((order) => Boolean(rowSelection[order.baseOrderId])),
    [preview?.orders, rowSelection]
  );

  const expandedOrderIds = React.useMemo(
    () =>
      new Set(
        Object.entries(expanded)
          .filter(([, isExpanded]) => Boolean(isExpanded))
          .map(([orderId]) => orderId)
      ),
    [expanded]
  );

  const selectedVisibleOrders = React.useMemo(
    () => filteredOrders.filter((order) => Boolean(rowSelection[order.baseOrderId])),
    [filteredOrders, rowSelection]
  );

  const selectedHiddenCount = Math.max(selectedOrders.length - selectedVisibleOrders.length, 0);
  const visibleExpandedCount = filteredOrders.filter((order) => Boolean(expanded[order.baseOrderId])).length;
  const hiddenExpandedCount = Math.max(expandedOrderIds.size - visibleExpandedCount, 0);
  const selectedVisibleExpandedCount = selectedVisibleOrders.filter(
    (order) => Boolean(expanded[order.baseOrderId])
  ).length;
  const hasActiveViewFilters =
    importStateFilter !== 'all' || search.trim().length > 0 || sortBy !== 'created-desc';
  const hasActivePreviewScopeFilters =
    dateFrom.trim().length > 0 || dateTo.trim().length > 0 || statusId.trim().length > 0 || limit !== '50';
  const isPreviewStale =
    preview !== null &&
    lastPreviewScopeKey !== null &&
    lastPreviewScopeKey !== currentPreviewScopeKey;

  const selectedVisibleImportableOrders = React.useMemo(
    () =>
      selectedVisibleOrders.filter(
        (order) => order.importState === 'new' || order.importState === 'changed'
      ),
    [selectedVisibleOrders]
  );

  const selectedVisibleImportedOrders = React.useMemo(
    () => selectedVisibleOrders.filter((order) => order.importState === 'imported'),
    [selectedVisibleOrders]
  );

  const importableVisibleOrders = React.useMemo(
    () =>
      filteredOrders.filter(
        (order) => order.importState === 'new' || order.importState === 'changed'
      ),
    [filteredOrders]
  );

  const importableVisibleExpandedCount = React.useMemo(
    () => importableVisibleOrders.filter((order) => Boolean(expanded[order.baseOrderId])).length,
    [expanded, importableVisibleOrders]
  );

  const importedVisibleOrders = React.useMemo(
    () => filteredOrders.filter((order) => order.importState === 'imported'),
    [filteredOrders]
  );

  const changedVisibleOrders = React.useMemo(
    () => filteredOrders.filter((order) => order.importState === 'changed'),
    [filteredOrders]
  );

  const newVisibleOrders = React.useMemo(
    () => filteredOrders.filter((order) => order.importState === 'new'),
    [filteredOrders]
  );

  const visibleStateCounts = React.useMemo(
    () => ({
      newCount: filteredOrders.filter((order) => order.importState === 'new').length,
      changedCount: filteredOrders.filter((order) => order.importState === 'changed').length,
      importedCount: filteredOrders.filter((order) => order.importState === 'imported').length,
    }),
    [filteredOrders]
  );

  const visibleAggregate = React.useMemo(
    () => summarizeOrderAggregate(filteredOrders),
    [filteredOrders]
  );

  const selectedVisibleAggregate = React.useMemo(
    () => summarizeOrderAggregate(selectedVisibleOrders),
    [selectedVisibleOrders]
  );

  const selectedVisibleImportableAggregate = React.useMemo(
    () => summarizeOrderAggregate(selectedVisibleImportableOrders),
    [selectedVisibleImportableOrders]
  );

  const selectedVisibleImportedAggregate = React.useMemo(
    () => summarizeOrderAggregate(selectedVisibleImportedOrders),
    [selectedVisibleImportedOrders]
  );

  const previewScopeChanges = React.useMemo<PreviewScopeChangeItem[]>(() => {
    if (!isPreviewStale || !lastPreviewScope) return [];

    const changes: PreviewScopeChangeItem[] = [];
    const pushChange = (key: string, label: string, loaded: string, current: string): void => {
      if (loaded === current) return;
      changes.push({ key, label, loaded, current });
    };

    pushChange(
      'connection',
      'Connection',
      formatPreviewScopeConnection(lastPreviewScope.connectionId, connectionOptions),
      formatPreviewScopeConnection(currentPreviewScope.connectionId, connectionOptions)
    );
    pushChange(
      'date-range',
      'Date range',
      formatPreviewScopeDateRange(lastPreviewScope),
      formatPreviewScopeDateRange(currentPreviewScope)
    );
    pushChange(
      'status',
      'Status',
      formatPreviewScopeStatus(lastPreviewScope.statusId, statusOptions),
      formatPreviewScopeStatus(currentPreviewScope.statusId, statusOptions)
    );
    pushChange('limit', 'Limit', lastPreviewScope.limit, currentPreviewScope.limit);

    return changes;
  }, [
    connectionOptions,
    currentPreviewScope,
    isPreviewStale,
    lastPreviewScope,
    statusOptions,
  ]);

  const handleSelectVisibleImportable = React.useCallback(() => {
    setRowSelection((currentSelection) => {
      const nextSelection = { ...currentSelection };
      for (const order of importableVisibleOrders) {
        nextSelection[order.baseOrderId] = true;
      }
      return nextSelection;
    });
  }, [importableVisibleOrders]);

  const handleSelectVisibleImported = React.useCallback(() => {
    setRowSelection((currentSelection) => {
      const nextSelection = { ...currentSelection };
      for (const order of importedVisibleOrders) {
        nextSelection[order.baseOrderId] = true;
      }
      return nextSelection;
    });
  }, [importedVisibleOrders]);

  const handleSelectVisibleChanged = React.useCallback(() => {
    setRowSelection((currentSelection) => {
      const nextSelection = { ...currentSelection };
      for (const order of changedVisibleOrders) {
        nextSelection[order.baseOrderId] = true;
      }
      return nextSelection;
    });
  }, [changedVisibleOrders]);

  const handleSelectVisibleNew = React.useCallback(() => {
    setRowSelection((currentSelection) => {
      const nextSelection = { ...currentSelection };
      for (const order of newVisibleOrders) {
        nextSelection[order.baseOrderId] = true;
      }
      return nextSelection;
    });
  }, [newVisibleOrders]);

  const handleClearSelection = React.useCallback(() => {
    setRowSelection({});
  }, []);

  const handleClearHiddenSelection = React.useCallback(() => {
    const visibleIds = new Set(filteredOrders.map((order) => order.baseOrderId));
    setRowSelection((currentSelection) => {
      const nextSelection: RowSelectionState = {};
      for (const [orderId, selected] of Object.entries(currentSelection)) {
        if (selected && visibleIds.has(orderId)) {
          nextSelection[orderId] = true;
        }
      }
      return nextSelection;
    });
  }, [filteredOrders]);

  const handleClearVisibleSelection = React.useCallback(() => {
    const visibleIds = new Set(filteredOrders.map((order) => order.baseOrderId));
    setRowSelection((currentSelection) => {
      const nextSelection: RowSelectionState = {};
      for (const [orderId, selected] of Object.entries(currentSelection)) {
        if (selected && !visibleIds.has(orderId)) {
          nextSelection[orderId] = true;
        }
      }
      return nextSelection;
    });
  }, [filteredOrders]);

  const handleExpandVisibleDetails = React.useCallback(() => {
    if (filteredOrders.length === 0) return;
    setExpanded((currentExpanded) => {
      const nextExpanded = { ...currentExpanded };
      for (const order of filteredOrders) {
        nextExpanded[order.baseOrderId] = true;
      }
      return nextExpanded;
    });
  }, [filteredOrders]);

  const handleExpandVisibleImportableDetails = React.useCallback(() => {
    if (importableVisibleOrders.length === 0) return;
    setExpanded((currentExpanded) => {
      const nextExpanded = { ...currentExpanded };
      for (const order of importableVisibleOrders) {
        nextExpanded[order.baseOrderId] = true;
      }
      return nextExpanded;
    });
  }, [importableVisibleOrders]);

  const handleCollapseVisibleImportableDetails = React.useCallback(() => {
    if (importableVisibleExpandedCount === 0) return;
    const importableVisibleIds = new Set(importableVisibleOrders.map((order) => order.baseOrderId));
    setExpanded((currentExpanded) => {
      const nextExpanded = { ...currentExpanded };
      for (const orderId of importableVisibleIds) {
        delete nextExpanded[orderId];
      }
      return nextExpanded;
    });
  }, [importableVisibleExpandedCount, importableVisibleOrders]);

  const handleExpandVisibleImportedDetails = React.useCallback(() => {
    if (importedVisibleOrders.length === 0) return;
    setExpanded((currentExpanded) => {
      const nextExpanded = { ...currentExpanded };
      for (const order of importedVisibleOrders) {
        nextExpanded[order.baseOrderId] = true;
      }
      return nextExpanded;
    });
  }, [importedVisibleOrders]);

  const handleExpandVisibleChangedDetails = React.useCallback(() => {
    if (changedVisibleOrders.length === 0) return;
    setExpanded((currentExpanded) => {
      const nextExpanded = { ...currentExpanded };
      for (const order of changedVisibleOrders) {
        nextExpanded[order.baseOrderId] = true;
      }
      return nextExpanded;
    });
  }, [changedVisibleOrders]);

  const handleExpandVisibleNewDetails = React.useCallback(() => {
    if (newVisibleOrders.length === 0) return;
    setExpanded((currentExpanded) => {
      const nextExpanded = { ...currentExpanded };
      for (const order of newVisibleOrders) {
        nextExpanded[order.baseOrderId] = true;
      }
      return nextExpanded;
    });
  }, [newVisibleOrders]);

  const handleCollapseVisibleDetails = React.useCallback(() => {
    if (filteredOrders.length === 0) return;
    const visibleIds = new Set(filteredOrders.map((order) => order.baseOrderId));
    setExpanded((currentExpanded) => {
      const nextExpanded = { ...currentExpanded };
      for (const orderId of visibleIds) {
        delete nextExpanded[orderId];
      }
      return nextExpanded;
    });
  }, [filteredOrders]);

  const handleCollapseHiddenDetails = React.useCallback(() => {
    const visibleIds = new Set(filteredOrders.map((order) => order.baseOrderId));
    setExpanded((currentExpanded) => {
      const nextExpanded = { ...currentExpanded };
      for (const [orderId, isExpanded] of Object.entries(currentExpanded)) {
        if (isExpanded && !visibleIds.has(orderId)) {
          delete nextExpanded[orderId];
        }
      }
      return nextExpanded;
    });
  }, [filteredOrders]);

  const handleExpandSelectedVisibleDetails = React.useCallback(() => {
    if (selectedVisibleOrders.length === 0) return;
    setExpanded((currentExpanded) => {
      const nextExpanded = { ...currentExpanded };
      for (const order of selectedVisibleOrders) {
        nextExpanded[order.baseOrderId] = true;
      }
      return nextExpanded;
    });
  }, [selectedVisibleOrders]);

  const handleCollapseSelectedVisibleDetails = React.useCallback(() => {
    if (selectedVisibleOrders.length === 0) return;
    const selectedVisibleIds = new Set(selectedVisibleOrders.map((order) => order.baseOrderId));
    setExpanded((currentExpanded) => {
      const nextExpanded = { ...currentExpanded };
      for (const orderId of selectedVisibleIds) {
        delete nextExpanded[orderId];
      }
      return nextExpanded;
    });
  }, [selectedVisibleOrders]);

  const handleCollapseAllDetails = React.useCallback(() => {
    setExpanded({});
  }, []);

  const handleResetViewFilters = React.useCallback(() => {
    setImportStateFilter('all');
    setSearch('');
    setSortBy('created-desc');
  }, []);

  const handleResetPreviewScope = React.useCallback(() => {
    setDateFrom('');
    setDateTo('');
    setStatusId('');
    setLimit('50');
  }, []);

  const handleRestoreLoadedPreviewScope = React.useCallback(() => {
    if (!lastPreviewScope) return;
    setSelectedConnectionId(lastPreviewScope.connectionId);
    setDateFrom(lastPreviewScope.dateFrom);
    setDateTo(lastPreviewScope.dateTo);
    setStatusId(lastPreviewScope.statusId);
    setLimit(lastPreviewScope.limit);
  }, [lastPreviewScope]);

  const handleToggleExpanded = React.useCallback((orderId: string) => {
    setExpanded((currentExpanded) => ({
      ...currentExpanded,
      [orderId]: !currentExpanded[orderId],
    }));
  }, []);

  const handlePreview = async (): Promise<void> => {
    if (!selectedConnectionId.trim()) {
      setFeedback({ variant: 'error', message: 'Select a Base.com connection first.' });
      return;
    }

    setFeedback(null);
    try {
      const response = await previewMutation.mutateAsync({
        connectionId: selectedConnectionId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        statusId: statusId || undefined,
        limit: Number(limit),
      });
      setPreview(response);
      setLastPreviewScopeKey(currentPreviewScopeKey);
      setLastPreviewScope(currentPreviewScope);
      setRowSelection({});
      setExpanded({});
      setFeedback({
        variant: 'info',
        message: `Loaded ${response.stats.total} orders. ${response.stats.newCount} new, ${response.stats.changedCount} changed, ${response.stats.importedCount} already imported.`,
      });
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Failed to preview Base.com orders.',
      });
    }
  };

  const handleQuickImport = async (): Promise<void> => {
    if (!selectedConnectionId.trim()) {
      setFeedback({ variant: 'error', message: 'Select a Base.com connection first.' });
      return;
    }

    setFeedback(null);
    try {
      const response = await quickImportMutation.mutateAsync({
        connectionId: selectedConnectionId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        statusId: statusId || undefined,
        limit: Number(limit),
      });
      setPreview(response.preview);
      setLastPreviewScopeKey(currentPreviewScopeKey);
      setLastPreviewScope(currentPreviewScope);
      setRowSelection({});
      setExpanded({});
      setFeedback(buildBaseOrderQuickImportFeedback(response));
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Failed to import Base.com orders.',
      });
    }
  };

  const patchPreviewAfterImport = React.useCallback(
    (response: { syncedAt: string; results: Array<{ baseOrderId: string }> }) => {
      setPreview((current) => {
        if (!current) return current;
        const importedIds = new Set(response.results.map((result) => result.baseOrderId));
        const nextOrders = current.orders.map((order) =>
          importedIds.has(order.baseOrderId)
            ? {
                ...order,
                importState: 'imported' as const,
                lastImportedAt: response.syncedAt,
                previousImport: buildPreviousImportSnapshot(order, response.syncedAt),
              }
            : order
        );
        return {
          orders: nextOrders,
          stats: {
            total: nextOrders.length,
            newCount: nextOrders.filter((order) => order.importState === 'new').length,
            importedCount: nextOrders.filter((order) => order.importState === 'imported').length,
            changedCount: nextOrders.filter((order) => order.importState === 'changed').length,
          },
        };
      });
    },
    []
  );

  const handleImport = async (orders: BaseOrderImportPreviewItem[]): Promise<void> => {
    if (!selectedConnectionId.trim() || orders.length === 0) return;
    if (isPreviewStale) {
      setFeedback({
        variant: 'error',
        message: 'Refresh preview after changing connection, date, status, or limit before importing orders.',
      });
      return;
    }

    setFeedback(null);
    try {
      const response = await importMutation.mutateAsync({
        connectionId: selectedConnectionId,
        orders,
      });
      patchPreviewAfterImport(response);
      setRowSelection({});
      setFeedback({
        variant: 'success',
        message: `Imported ${response.importedCount} orders. Created ${response.createdCount}, updated ${response.updatedCount}.`,
      });
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Failed to import selected orders.',
      });
    }
  };

  const columns = React.useMemo<ColumnDef<BaseOrderImportPreviewItem>[]>(
    () => [
      {
        id: 'expand',
        header: () => null,
        cell: ({ row }: { row: Row<BaseOrderImportPreviewItem> }) => {
          const isExpanded = Boolean(expanded[row.original.baseOrderId]);
          return (
            <Button
              type='button'
              size='icon'
              variant='ghost'
              className='h-7 w-7'
              onClick={() => handleToggleExpanded(row.original.baseOrderId)}
              aria-label={isExpanded ? 'Collapse order details' : 'Expand order details'}
              aria-expanded={isExpanded}
              title={isExpanded ? 'Collapse order details' : 'Expand order details'}
            >
              {isExpanded ? <ChevronUp className='size-4' /> : <ChevronDown className='size-4' />}
            </Button>
          );
        },
        enableSorting: false,
        meta: { widthPx: 48 },
      },
      {
        id: 'select',
        header: ({ table }: { table: Table<BaseOrderImportPreviewItem> }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))}
            aria-label='Select all orders'
            disabled={isPreviewStale}
          />
        ),
        cell: ({ row }: { row: Row<BaseOrderImportPreviewItem> }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
            aria-label={`Select order ${row.original.baseOrderId}`}
            disabled={isPreviewStale}
          />
        ),
        enableSorting: false,
        meta: { widthPx: 48 },
      },
      {
        accessorKey: 'baseOrderId',
        header: 'Base Order',
        cell: ({ row }) => (
          <div className='min-w-0'>
            <div className='text-sm font-medium text-gray-100'>{row.original.baseOrderId}</div>
            <div className='text-xs text-muted-foreground truncate'>
              {row.original.orderNumber ? `Order no. ${row.original.orderNumber}` : 'No external order number'}
            </div>
          </div>
        ),
      },
      {
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) => (
          <div className='min-w-0'>
            <div className='text-sm font-medium text-gray-100 truncate'>{row.original.buyerName}</div>
            <div className='text-xs text-muted-foreground truncate'>
              {row.original.buyerEmail ?? 'No email'}
            </div>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <div className='flex flex-col items-start gap-1'>
            <StatusBadge
              status={row.original.externalStatusName ?? row.original.externalStatusId ?? 'Unknown'}
              size='sm'
            />
            <Badge variant={IMPORT_STATE_VARIANTS[row.original.importState]}>
              {IMPORT_STATE_LABELS[row.original.importState]}
            </Badge>
          </div>
        ),
      },
      {
        id: 'items',
        header: 'Items',
        cell: ({ row }) => (
          <div className='text-sm text-gray-100'>
            {row.original.lineItems.reduce((total, item) => total + item.quantity, 0)}
          </div>
        ),
        meta: { widthPx: 72 },
      },
      {
        id: 'total',
        header: 'Total',
        cell: ({ row }) => (
          <div className='text-sm text-gray-100'>
            {formatOrderTotal(row.original.totalGross, row.original.currency)}
          </div>
        ),
      },
      {
        id: 'createdAt',
        header: 'Created',
        cell: ({ row }) => (
          <div className='min-w-0'>
            <div className='text-sm text-gray-100'>{formatOrderDate(row.original.orderCreatedAt)}</div>
            <div className='text-xs text-muted-foreground'>
              {row.original.lastImportedAt
                ? `Last import ${formatOrderDate(row.original.lastImportedAt)}`
                : 'Not imported yet'}
            </div>
          </div>
        ),
      },
    ],
    [expanded, handleToggleExpanded, isPreviewStale]
  );

  const panelAlerts = (
    <div className='space-y-3'>
      {!baseConnections.length ? (
        <Alert variant='warning' title='No Base.com connections available'>
          Configure a Base.com connection in <Link href='/admin/integrations' className='underline underline-offset-4'>Integrations</Link> before previewing orders.
        </Alert>
      ) : null}
      {isPreviewStale ? (
        <Alert variant='warning' title='Preview out of date'>
          <div className='space-y-3'>
            <div className='flex flex-wrap items-center gap-3'>
              <span>
                Preview scope changed. Run Preview orders again before importing or selecting orders.
              </span>
              <Button
                type='button'
                size='xs'
                variant='outline'
                onClick={() => {
                  void handlePreview();
                }}
                disabled={previewMutation.isPending || !selectedConnectionId}
              >
                Refresh preview now
              </Button>
              <Button
                type='button'
                size='xs'
                variant='ghost'
                onClick={handleRestoreLoadedPreviewScope}
                disabled={!lastPreviewScope}
              >
                Restore loaded scope
              </Button>
            </div>
            {previewScopeChanges.length > 0 ? (
              <div className='space-y-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-3 text-xs text-amber-100/90'>
                <div className='text-xs uppercase tracking-[0.18em] text-amber-200/80'>
                  Loaded scope vs current scope
                </div>
                {previewScopeChanges.map((change) => (
                  <div
                    key={change.key}
                    className='flex items-start justify-between gap-3 rounded-md border border-amber-400/20 bg-amber-500/5 px-2 py-2'
                  >
                    <span className='text-amber-200/80'>{change.label}</span>
                    <span className='text-right text-amber-50'>
                      {change.loaded} {'->'} {change.current}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </Alert>
      ) : null}
      {feedback && !(isPreviewStale && feedback.variant === 'info') ? (
        <Alert
          variant={feedback.variant}
          title={
            feedback.variant === 'success'
              ? 'Import completed'
              : feedback.variant === 'error'
                ? 'Orders import failed'
                : 'Preview ready'
          }
          onDismiss={() => setFeedback(null)}
        >
          {feedback.message}
        </Alert>
      ) : null}
    </div>
  );

  const panelFilters = (
    <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-8'>
      <SelectSimple
        value={selectedConnectionId || '__none__'}
        onValueChange={(value) => {
          const nextValue = value === '__none__' ? '' : value;
          setSelectedConnectionId(nextValue);
          setPreview(null);
          setLastPreviewScopeKey(null);
          setLastPreviewScope(null);
          setRowSelection({});
          setFeedback(null);
        }}
        options={connectionOptions}
        placeholder='Select Base.com connection'
        ariaLabel='Base connection'
        size='sm'
        disabled={integrationsQuery.isLoading || !baseConnections.length}
      />
      <Input
        type='date'
        value={dateFrom}
        onChange={(event) => setDateFrom(event.target.value)}
        aria-label='Date from'
        title='Date from'
        className='h-8'
      />
      <Input
        type='date'
        value={dateTo}
        onChange={(event) => setDateTo(event.target.value)}
        aria-label='Date to'
        title='Date to'
        className='h-8'
      />
      <SelectSimple
        value={statusId || '__all__'}
        onValueChange={(value) => setStatusId(value === '__all__' ? '' : value)}
        options={statusOptions}
        placeholder='All statuses'
        ariaLabel='Order status'
        size='sm'
        disabled={!selectedConnectionId || statusesQuery.isLoading}
      />
      <SelectSimple
        value={limit}
        onValueChange={setLimit}
        options={LIMIT_OPTIONS}
        placeholder='Limit'
        ariaLabel='Preview limit'
        size='sm'
      />
      <SelectSimple
        value={importStateFilter}
        onValueChange={(value) => setImportStateFilter(value as ImportStateFilter)}
        options={importStateOptions}
        placeholder='All import states'
        ariaLabel='Import state'
        size='sm'
      />
      <SelectSimple
        value={sortBy}
        onValueChange={(value) => setSortBy(value as PreviewSortOption)}
        options={sortOptions}
        placeholder='Sort by'
        ariaLabel='Sort preview'
        size='sm'
      />
      <SearchInput
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onClear={() => setSearch('')}
        placeholder='Search previewed orders...'
        size='sm'
      />
    </div>
  );

  const panelActions = (
    <div className='flex flex-wrap items-center gap-2'>
      <Button
        type='button'
        size='sm'
        variant='default'
        onClick={() => {
          void handleQuickImport();
        }}
        disabled={
          !selectedConnectionId ||
          quickImportMutation.isPending ||
          previewMutation.isPending ||
          importMutation.isPending
        }
      >
        <Download className='size-4 mr-1' />
        {quickImportMutation.isPending ? 'Importing latest...' : 'Import latest from Base.com'}
      </Button>
      <Button
        type='button'
        size='sm'
        variant='outline'
        onClick={() => {
          void handlePreview();
        }}
        disabled={
          !selectedConnectionId ||
          previewMutation.isPending ||
          quickImportMutation.isPending
        }
      >
        <RefreshCcw className='size-4 mr-1' />
        {previewMutation.isPending ? 'Previewing...' : 'Preview orders'}
      </Button>
      <Button
        type='button'
        size='sm'
        variant='ghost'
        onClick={handleResetPreviewScope}
        disabled={
          !hasActivePreviewScopeFilters ||
          previewMutation.isPending ||
          quickImportMutation.isPending
        }
      >
        Reset preview scope
      </Button>
      <Button
        type='button'
        size='sm'
        variant='outline'
        onClick={() => {
          void handleImport(selectedVisibleImportableOrders);
        }}
        disabled={
          selectedVisibleImportableOrders.length === 0 ||
          importMutation.isPending ||
          quickImportMutation.isPending ||
          isPreviewStale
        }
      >
        <Download className='size-4 mr-1' />
        {importMutation.isPending
          ? 'Importing...'
          : `Import selected visible new + changed (${selectedVisibleImportableOrders.length})`}
      </Button>
      <Button
        type='button'
        size='sm'
        variant='outline'
        onClick={() => {
          void handleImport(selectedVisibleImportedOrders);
        }}
        disabled={
          selectedVisibleImportedOrders.length === 0 ||
          importMutation.isPending ||
          quickImportMutation.isPending ||
          isPreviewStale
        }
      >
        Reimport selected visible imported ({selectedVisibleImportedOrders.length})
      </Button>
      <Button
        type='button'
        size='sm'
        variant='outline'
        onClick={() => {
          void handleImport(importableVisibleOrders);
        }}
        disabled={
          !importableVisibleOrders.length ||
          importMutation.isPending ||
          quickImportMutation.isPending ||
          isPreviewStale
        }
      >
        Import visible new + changed ({importableVisibleOrders.length})
      </Button>
    </div>
  );

  const panelFooter = preview ? (
    <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
      <Badge variant='outline'>{preview.stats.total} loaded</Badge>
      <Badge variant='active'>{preview.stats.newCount} new</Badge>
      <Badge variant='warning'>{preview.stats.changedCount} changed</Badge>
      <Badge variant='neutral'>{preview.stats.importedCount} imported</Badge>
      <Badge variant='outline'>{filteredOrders.length} visible</Badge>
      <Badge variant='outline'>{visibleAggregate.itemsTotal} visible items</Badge>
      <Badge variant='outline'>{visibleAggregate.grossLabel} visible gross</Badge>
      <Badge variant='active'>{visibleStateCounts.newCount} visible new</Badge>
      <Badge variant='warning'>{visibleStateCounts.changedCount} visible changed</Badge>
      <Badge variant='neutral'>{visibleStateCounts.importedCount} visible imported</Badge>
      <Badge variant='outline'>{selectedVisibleOrders.length} selected visible</Badge>
      <Badge variant='outline'>{selectedVisibleAggregate.itemsTotal} selected visible items</Badge>
      <Badge variant='outline'>{selectedVisibleAggregate.grossLabel} selected visible gross</Badge>
      {selectedHiddenCount > 0 ? (
        <Badge variant='warning'>{selectedHiddenCount} hidden by filters</Badge>
      ) : null}
      <Badge variant='active'>{selectedVisibleImportableOrders.length} selected to import</Badge>
      <Badge variant='active'>
        {selectedVisibleImportableAggregate.itemsTotal} selected import items
      </Badge>
      <Badge variant='active'>
        {selectedVisibleImportableAggregate.grossLabel} selected import gross
      </Badge>
      <Badge variant='neutral'>{selectedVisibleImportedOrders.length} selected to reimport</Badge>
      <Badge variant='neutral'>
        {selectedVisibleImportedAggregate.itemsTotal} selected reimport items
      </Badge>
      <Badge variant='neutral'>
        {selectedVisibleImportedAggregate.grossLabel} selected reimport gross
      </Badge>
    </div>
  ) : null;

  const renderOrderDetails = React.useCallback(
    ({ row }: { row: Row<BaseOrderImportPreviewItem> }) => {
      const order = row.original;
      const changeSummary = buildOrderChangeSummary(order);
      return (
        <div className='grid gap-4 bg-black/15 p-4 md:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]'>
          <div className='space-y-3'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <div className='text-xs uppercase tracking-[0.18em] text-muted-foreground'>
                  Line Items
                </div>
                <div className='text-sm text-gray-200'>
                  {order.lineItems.length > 0
                    ? `${order.lineItems.length} items returned by Base.com`
                    : 'Base.com did not return any line items for this order.'}
                </div>
              </div>
              <Badge variant={IMPORT_STATE_VARIANTS[order.importState]}>
                {IMPORT_STATE_LABELS[order.importState]}
              </Badge>
            </div>
            <div className='space-y-2'>
              {order.lineItems.length > 0 ? (
                order.lineItems.map((item, index) => (
                  <div
                    key={`${order.baseOrderId}:${item.baseProductId ?? item.sku ?? item.name}:${index}`}
                    className='rounded-lg border border-border/60 bg-black/20 px-3 py-2'
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <div className='truncate text-sm font-medium text-gray-100'>{item.name}</div>
                        <div className='text-xs text-muted-foreground'>
                          {item.sku ? `SKU ${item.sku}` : 'No SKU'}{' '}
                          {item.baseProductId ? `• Base product ${item.baseProductId}` : ''}
                        </div>
                      </div>
                      <div className='text-right text-xs text-gray-300'>
                        <div>Qty {item.quantity}</div>
                        <div>{formatOrderTotal(item.unitPriceGross, order.currency)}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className='rounded-lg border border-dashed border-border/60 bg-black/10 px-3 py-4 text-sm text-muted-foreground'>
                  No item-level payload came back from Base.com for this order preview.
                </div>
              )}
            </div>
          </div>
          <div className='space-y-3'>
            <div className='flex items-center justify-between gap-3'>
              <div className='text-xs uppercase tracking-[0.18em] text-muted-foreground'>
                Import Snapshot
              </div>
              <Button
                type='button'
                size='xs'
                variant='outline'
                onClick={() => {
                  void handleImport([order]);
                }}
                disabled={importMutation.isPending || quickImportMutation.isPending || isPreviewStale}
              >
                {order.importState === 'imported' ? 'Reimport this order' : 'Import this order'}
              </Button>
            </div>
            <div className='space-y-2 rounded-lg border border-border/60 bg-black/20 px-3 py-3 text-xs text-gray-300'>
              <div className='flex items-center justify-between gap-3'>
                <span>Buyer</span>
                <span className='text-right text-gray-100'>{order.buyerName}</span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span>Email</span>
                <span className='text-right text-gray-100'>{order.buyerEmail ?? '—'}</span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span>Total</span>
                <span className='text-right text-gray-100'>
                  {formatOrderTotal(order.totalGross, order.currency)}
                </span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span>Items total</span>
                <span className='text-right text-gray-100'>
                  {formatItemsTotal(order)}
                </span>
              </div>
            </div>
            <div className='space-y-2 rounded-lg border border-border/60 bg-black/20 px-3 py-3 text-xs text-gray-300'>
              <div className='flex items-center justify-between gap-3'>
                <span>Status</span>
                <span className='text-right text-gray-100'>
                  {order.externalStatusName ?? order.externalStatusId ?? 'Unknown'}
                </span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span>Created</span>
                <span className='text-right text-gray-100'>{formatOrderDate(order.orderCreatedAt)}</span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span>Updated</span>
                <span className='text-right text-gray-100'>{formatOrderDate(order.orderUpdatedAt)}</span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span>Last import</span>
                <span className='text-right text-gray-100'>{formatOrderDate(order.lastImportedAt)}</span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span>Delivery</span>
                <span className='text-right text-gray-100'>{order.deliveryMethod ?? '—'}</span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span>Payment</span>
                <span className='text-right text-gray-100'>{order.paymentMethod ?? '—'}</span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span>Source</span>
                <span className='text-right text-gray-100'>{order.source ?? '—'}</span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span>Fingerprint</span>
                <span className='max-w-[14rem] truncate text-right font-mono text-[10px] text-gray-400'>
                  {order.fingerprint}
                </span>
              </div>
            </div>
            {changeSummary.length > 0 ? (
              <div className='space-y-2 rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-3 text-xs text-blue-100/90'>
                <div className='text-xs uppercase tracking-[0.18em] text-blue-200/80'>
                  Change Summary
                </div>
                <div className='flex flex-wrap gap-2'>
                  {changeSummary.map((change) => (
                    <Badge key={change.key} variant='info'>
                      {change.label}
                    </Badge>
                  ))}
                </div>
                <div className='space-y-2'>
                  {changeSummary.map((change) => (
                    <div
                      key={`${change.key}:detail`}
                      className='flex items-start justify-between gap-3 rounded-md border border-blue-400/20 bg-blue-500/5 px-2 py-2'
                    >
                      <span className='text-blue-200/80'>{change.label.replace(' changed', '')}</span>
                      <span className='text-right text-blue-50'>
                        {change.previous} {'->'} {change.current}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {order.previousImport ? (
              <div className='space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-3 text-xs text-amber-100/90'>
                <div className='text-xs uppercase tracking-[0.18em] text-amber-200/80'>
                  Previous Import
                </div>
                <div className='flex items-center justify-between gap-3'>
                  <span>Status</span>
                  <span className='text-right text-amber-50'>
                    {order.previousImport.externalStatusName ??
                      order.previousImport.externalStatusId ??
                      'Unknown'}
                  </span>
                </div>
                <div className='flex items-center justify-between gap-3'>
                  <span>Total</span>
                  <span className='text-right text-amber-50'>
                    {formatOrderTotal(order.previousImport.totalGross, order.previousImport.currency)}
                  </span>
                </div>
                <div className='flex items-center justify-between gap-3'>
                  <span>Items total</span>
                  <span className='text-right text-amber-50'>
                    {formatItemsTotal(order.previousImport)}
                  </span>
                </div>
                <div className='flex items-center justify-between gap-3'>
                  <span>Updated</span>
                  <span className='text-right text-amber-50'>
                    {formatOrderDate(order.previousImport.orderUpdatedAt)}
                  </span>
                </div>
                <div className='flex items-center justify-between gap-3'>
                  <span>Imported at</span>
                  <span className='text-right text-amber-50'>
                    {formatOrderDate(order.previousImport.lastImportedAt)}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      );
    },
    [handleImport, importMutation.isPending, isPreviewStale, quickImportMutation.isPending]
  );

  const panelRowActions = preview ? (
    <div className='flex flex-wrap items-center gap-2'>
      <Button
        type='button'
        size='xs'
        variant='outline'
        onClick={handleSelectVisibleImportable}
        disabled={importableVisibleOrders.length === 0 || isPreviewStale}
      >
        Select visible new + changed ({importableVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='outline'
        onClick={handleSelectVisibleImported}
        disabled={importedVisibleOrders.length === 0 || isPreviewStale}
      >
        Select visible imported ({importedVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='outline'
        onClick={handleSelectVisibleChanged}
        disabled={changedVisibleOrders.length === 0 || isPreviewStale}
      >
        Select visible changed ({changedVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='outline'
        onClick={handleSelectVisibleNew}
        disabled={newVisibleOrders.length === 0 || isPreviewStale}
      >
        Select visible new ({newVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleExpandVisibleImportableDetails}
        disabled={importableVisibleOrders.length === 0}
      >
        Expand visible import details ({importableVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleCollapseVisibleImportableDetails}
        disabled={importableVisibleExpandedCount === 0}
      >
        Collapse visible import details ({importableVisibleExpandedCount})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleExpandVisibleNewDetails}
        disabled={newVisibleOrders.length === 0}
      >
        Expand visible new details ({newVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleExpandVisibleChangedDetails}
        disabled={changedVisibleOrders.length === 0}
      >
        Expand visible changed details ({changedVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleExpandVisibleImportedDetails}
        disabled={importedVisibleOrders.length === 0}
      >
        Expand visible reimport details ({importedVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleExpandSelectedVisibleDetails}
        disabled={selectedVisibleOrders.length === 0}
      >
        Expand selected visible details ({selectedVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleCollapseSelectedVisibleDetails}
        disabled={selectedVisibleExpandedCount === 0}
      >
        Collapse selected visible details ({selectedVisibleExpandedCount})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleCollapseHiddenDetails}
        disabled={hiddenExpandedCount === 0}
      >
        Collapse hidden details ({hiddenExpandedCount})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleCollapseAllDetails}
        disabled={expandedOrderIds.size === 0}
      >
        Collapse all details ({expandedOrderIds.size})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleExpandVisibleDetails}
        disabled={filteredOrders.length === 0}
      >
        Expand visible details ({filteredOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleCollapseVisibleDetails}
        disabled={visibleExpandedCount === 0}
      >
        Collapse visible details ({visibleExpandedCount})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleClearHiddenSelection}
        disabled={selectedHiddenCount === 0}
      >
        Clear hidden selection ({selectedHiddenCount})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleClearVisibleSelection}
        disabled={selectedVisibleOrders.length === 0}
      >
        Clear visible selection ({selectedVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleClearSelection}
        disabled={selectedOrders.length === 0}
      >
        Clear selection
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleResetViewFilters}
        disabled={!hasActiveViewFilters}
      >
        Reset view filters
      </Button>
    </div>
  ) : null;

  const emptyState = !baseConnections.length ? (
    <EmptyState
      title='No Base.com connection'
      description='Connect Base.com in Integrations before importing orders.'
      action={
        <Button type='button' variant='outline' size='sm' asChild>
          <Link href='/admin/integrations'>Open Integrations</Link>
        </Button>
      }
    />
  ) : preview ? (
    preview.stats.total > 0 ? (
      <EmptyState
        title='No orders in the current view'
        description={`Loaded ${preview.stats.total} orders, but the current search or import-state filters hide them.`}
        action={
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleResetViewFilters}
            disabled={!hasActiveViewFilters}
          >
            Show loaded orders
          </Button>
        }
      />
    ) : (
      <EmptyState
        title='No orders matched'
        description='Try widening the date range, changing the status filter, or increasing the preview limit.'
      />
    )
  ) : (
    <EmptyState
      title='Preview Base.com orders'
      description='Select a connection, adjust filters, and run a preview before importing orders.'
    />
  );

  return (
    <AdminProductsPageLayout
      title='Orders Import'
      current='Orders Import'
      description='Preview and import Base.com orders into local admin storage.'
      icon={<ShoppingBag className='size-4' />}
      headerActions={panelActions}
    >
      <StandardDataTablePanel
        variant='flat'
        alerts={panelAlerts}
        filters={panelFilters}
        actions={panelRowActions}
        footer={panelFooter}
        columns={columns}
        data={filteredOrders}
        isLoading={integrationsQuery.isLoading}
        loadingVariant='table'
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        expanded={expanded}
        renderRowDetails={renderOrderDetails}
        getRowId={(row) => row.baseOrderId}
        emptyState={emptyState}
      />
    </AdminProductsPageLayout>
  );
}
