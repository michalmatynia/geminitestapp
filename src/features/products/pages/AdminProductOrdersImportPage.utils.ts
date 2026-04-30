import type { BaseOrderImportPreviewItem, BaseOrderImportPreviousSnapshot, BaseOrderImportState } from '@/shared/contracts/products/orders-import';

export const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);

export const LIMIT_OPTIONS = ['25', '50', '100', '150', '250'].map((value) => ({
  value,
  label: value,
}));

export type FeedbackState =
  | {
      variant: 'success' | 'error' | 'info';
      message: string;
    }
  | null;

export type ImportStateFilter = 'all' | BaseOrderImportState;
export type PreviewSortOption =
  | 'created-desc'
  | 'created-asc'
  | 'customer-asc'
  | 'total-desc'
  | 'import-priority';

export type PreviewScopeState = {
  connectionId: string;
  dateFrom: string;
  dateTo: string;
  statusId: string;
  limit: string;
};

export type PreviewScopeChangeItem = {
  key: string;
  label: string;
  loaded: string;
  current: string;
};

export type OrderChangeSummaryItem = {
  key: string;
  label: string;
  previous: string;
  current: string;
};

export const IMPORT_STATE_VARIANTS: Record<BaseOrderImportState, 'success' | 'info' | 'warning'> = {
  new: 'success',
  changed: 'info',
  imported: 'warning',
};

export const IMPORT_STATE_LABELS: Record<BaseOrderImportState, string> = {
  new: 'New Order',
  changed: 'Content Changed',
  imported: 'Already Imported',
};

const toNullable = <TValue>(value: TValue | null | undefined): TValue | null => value ?? null;

export const formatOrderDate = (value: string | null): string => {
  if (value === null || value.trim().length === 0) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

export const formatOrderTotal = (
  amount: number | null | undefined,
  currency: string | null | undefined
): string => {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—';
  const normalizedCurrency = currency?.trim() ?? '';
  if (normalizedCurrency.length > 0) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: normalizedCurrency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${normalizedCurrency}`;
    }
  }
  return amount.toFixed(2);
};

export const formatItemsTotal = (order: Pick<BaseOrderImportPreviewItem, 'lineItems'>): number =>
  order.lineItems.reduce((total, item) => total + item.quantity, 0);

export const summarizeOrderAggregate = (
  orders: Array<Pick<BaseOrderImportPreviewItem, 'currency' | 'totalGross' | 'lineItems'>>
): {
  itemsTotal: number;
  grossLabel: string;
} => {
  const itemsTotal = orders.reduce((total, order) => total + formatItemsTotal(order), 0);
  const normalizedCurrencies = new Set(
    orders
      .map((order) => order.currency?.trim())
      .filter(
        (currency): currency is string =>
          currency !== undefined && currency.length > 0
      )
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

export const formatTextValue = (value: string | null): string => {
  const normalized = value?.trim();
  return normalized !== undefined && normalized.length > 0 ? normalized : '—';
};

export const getOrderTimestamp = (value: string | null): number => {
  if (value === null || value.trim().length === 0) return Number.NEGATIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
};

export const normalizeSortText = (value: string | null): string => value?.trim().toLowerCase() ?? '';

export const formatPreviewScopeDateRange = (scope: PreviewScopeState): string => {
  const from = scope.dateFrom.trim();
  const to = scope.dateTo.trim();
  if (from.length === 0 && to.length === 0) return 'Any date';
  return `${from.length > 0 ? from : 'Any'} -> ${to.length > 0 ? to : 'Any'}`;
};

export const formatPreviewScopeStatus = (
  statusId: string,
  statusOptions: Array<{ value: string; label: string }>
): string => {
  if (statusId.trim().length === 0) return 'All statuses';
  return statusOptions.find((option) => option.value === statusId)?.label ?? statusId;
};

export const formatPreviewScopeConnection = (
  connectionId: string,
  connectionOptions: Array<{ value: string; label: string }>
): string => {
  if (connectionId.trim().length === 0) return 'No connection';
  return connectionOptions.find((option) => option.value === connectionId)?.label ?? connectionId;
};

const resolveSnapshotSyncedAt = (
  order: BaseOrderImportPreviewItem,
  syncedAt: string | undefined
): string => syncedAt ?? order.lastImportedAt ?? new Date().toISOString();

const buildPreviousImportSnapshotLineItem = (
  item: BaseOrderImportPreviewItem['lineItems'][number]
): BaseOrderImportPreviousSnapshot['lineItems'][number] => ({
  sku: toNullable(item.sku),
  name: item.name,
  quantity: item.quantity,
  unitPriceGross: toNullable(item.unitPriceGross),
  baseProductId: toNullable(item.baseProductId),
});

export const buildPreviousImportSnapshot = (
  order: BaseOrderImportPreviewItem,
  syncedAt?: string
): BaseOrderImportPreviousSnapshot => ({
  orderNumber: toNullable(order.orderNumber),
  externalStatusId: toNullable(order.externalStatusId),
  externalStatusName: toNullable(order.externalStatusName),
  buyerName: order.buyerName,
  buyerEmail: toNullable(order.buyerEmail),
  currency: toNullable(order.currency),
  totalGross: toNullable(order.totalGross),
  deliveryMethod: toNullable(order.deliveryMethod),
  paymentMethod: toNullable(order.paymentMethod),
  source: toNullable(order.source),
  orderCreatedAt: toNullable(order.orderCreatedAt),
  orderUpdatedAt: toNullable(order.orderUpdatedAt),
  lineItems: order.lineItems.map(buildPreviousImportSnapshotLineItem),
  lastImportedAt: resolveSnapshotSyncedAt(order, syncedAt),
});
