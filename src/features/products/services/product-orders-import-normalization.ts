import type { BaseOrderImportLineItem, BaseOrderImportPreviewItem, BaseOrderImportStatusOption } from '@/shared/contracts/products/orders-import';
import { hashRuntimeValue } from '@/shared/lib/ai-paths/core/utils/runtime';

type UnknownRecord = Record<string, unknown>;
type ComparableOrderData = Omit<
  BaseOrderImportPreviewItem,
  'externalStatusName' | 'fingerprint' | 'importState' | 'lastImportedAt' | 'previousImport'
>;

const asRecord = (value: unknown): UnknownRecord | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;

const toArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  return record !== null ? Object.values(record) : [];
};

const readField = (record: UnknownRecord, keys: string[]): unknown => {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }
  return undefined;
};

const toNullableString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toValidIsoString = (date: Date): string | null =>
  Number.isNaN(date.getTime()) ? null : date.toISOString();

const timestampToDateIso = (value: number): string | null => {
  const ms = value > 10_000_000_000 ? value : value * 1000;
  return toValidIsoString(new Date(ms));
};

const stringToDateIso = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (/^\d+$/.test(trimmed)) return timestampToDateIso(Number(trimmed));
  return toValidIsoString(new Date(trimmed));
};

const toDateIso = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return timestampToDateIso(value);
  }
  if (typeof value === 'string') return stringToDateIso(value);
  return null;
};

const firstPresent = (values: unknown[]): unknown =>
  values.find((value) => value !== null && value !== undefined);

const extractStatusesSource = (payload: unknown): unknown => {
  const record = asRecord(payload);
  if (record === null) return payload;
  const dataRecord = asRecord(record['data']);
  return firstPresent([
    record['statuses'],
    record['order_statuses'],
    record['orderStatuses'],
    dataRecord === null ? undefined : dataRecord['statuses'],
    dataRecord === null ? undefined : dataRecord['order_statuses'],
    dataRecord === null ? undefined : dataRecord['orderStatuses'],
    record['data'],
  ]) ?? payload;
};

const extractOrdersSource = (payload: unknown): unknown => {
  const record = asRecord(payload);
  if (record === null) return payload;
  const dataRecord = asRecord(record['data']);
  return record['orders'] ?? dataRecord?.['orders'] ?? record['data'] ?? payload;
};

const normalizeStatusRecord = (
  record: UnknownRecord,
  fallbackId: string | null = null
): BaseOrderImportStatusOption | null => {
  const id =
    toNullableString(readField(record, ['id', 'status_id', 'order_status_id'])) ?? fallbackId;
  const name = toNullableString(readField(record, ['name', 'status_name', 'label']));
  if (id === null || name === null) return null;
  return { id, name };
};

const normalizeStatusArrayEntry = (entry: unknown): BaseOrderImportStatusOption | null => {
  const record = asRecord(entry);
  return record === null ? null : normalizeStatusRecord(record);
};

const normalizeStatusMapEntry = (
  key: string,
  value: unknown
): BaseOrderImportStatusOption | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? { id: key, name: trimmed } : null;
  }
  const record = asRecord(value);
  return record === null ? null : normalizeStatusRecord(record, key);
};

export const normalizeBaseOrderStatuses = (payload: unknown): BaseOrderImportStatusOption[] => {
  const source = extractStatusesSource(payload);
  if (Array.isArray(source)) {
    return source.map(normalizeStatusArrayEntry).filter(isStatusOption);
  }

  const sourceRecord = asRecord(source);
  if (sourceRecord === null) return [];

  return Object.entries(sourceRecord)
    .map(([key, value]) => normalizeStatusMapEntry(key, value))
    .filter(isStatusOption)
    .sort((left, right) => left.name.localeCompare(right.name));
};

const isStatusOption = (
  entry: BaseOrderImportStatusOption | null
): entry is BaseOrderImportStatusOption => entry !== null;

const normalizeLineItemEntry = (entry: unknown): BaseOrderImportLineItem | null => {
  const record = asRecord(entry);
  if (record === null) return null;
  const name = toNullableString(readField(record, ['name', 'title', 'product_name'])) ?? 'Item';
  return {
    sku: toNullableString(readField(record, ['sku', 'sku_id'])),
    name,
    quantity: toNumber(readField(record, ['quantity', 'qty', 'count'])) ?? 1,
    unitPriceGross: toNumber(readField(record, ['price_brutto', 'price_gross', 'price'])),
    baseProductId: toNullableString(
      readField(record, ['product_id', 'base_product_id', 'storage_id', 'offer_id'])
    ),
  };
};

const isLineItem = (entry: BaseOrderImportLineItem | null): entry is BaseOrderImportLineItem =>
  entry !== null;

const normalizeLineItems = (value: unknown): BaseOrderImportLineItem[] =>
  toArray(value).map(normalizeLineItemEntry).filter(isLineItem);

const getBuyerName = (record: UnknownRecord): string =>
  toNullableString(
    readField(record, [
      'delivery_fullname',
      'delivery_name',
      'buyer_name',
      'user_name',
      'client_name',
      'delivery_company',
    ])
  ) ?? 'Unknown buyer';

const buildComparableOrderData = (
  record: UnknownRecord,
  baseOrderId: string,
  externalStatusId: string | null,
  lineItems: BaseOrderImportLineItem[]
): ComparableOrderData => ({
  baseOrderId,
  orderNumber: toNullableString(
    readField(record, ['shop_order_id', 'order_number', 'external_order_id'])
  ),
  externalStatusId,
  buyerName: getBuyerName(record),
  buyerEmail: toNullableString(readField(record, ['email', 'buyer_email'])),
  currency: toNullableString(readField(record, ['currency'])),
  totalGross: toNumber(
    readField(record, ['price_brutto', 'total_price_brutto', 'total_price', 'payment_done'])
  ),
  deliveryMethod: toNullableString(readField(record, ['delivery_method', 'delivery'])),
  paymentMethod: toNullableString(readField(record, ['payment_method', 'payment'])),
  source: toNullableString(readField(record, ['order_source', 'shop', 'source'])),
  orderCreatedAt: toDateIso(
    readField(record, ['date_add', 'date_created', 'created_at', 'date_confirmed'])
  ),
  orderUpdatedAt: toDateIso(
    readField(record, ['date_confirmed', 'date_in_status', 'updated_at', 'date_modified'])
  ),
  lineItems,
  raw: record,
});

const resolveExternalStatusName = (
  record: UnknownRecord,
  externalStatusId: string | null,
  statusNameById: ReadonlyMap<string, string>
): string | null => {
  if (externalStatusId !== null) {
    const statusName = statusNameById.get(externalStatusId);
    if (statusName !== undefined) return statusName;
  }
  return toNullableString(readField(record, ['status_name', 'order_status_name']));
};

const normalizeBaseOrderEntry = (
  entry: unknown,
  statusNameById: ReadonlyMap<string, string>
): BaseOrderImportPreviewItem | null => {
  const record = asRecord(entry);
  if (record === null) return null;
  const baseOrderId = toNullableString(readField(record, ['order_id', 'id', 'shop_order_id']));
  if (baseOrderId === null) return null;
  const externalStatusId = toNullableString(
    readField(record, ['order_status_id', 'status_id', 'status'])
  );
  const lineItems = normalizeLineItems(readField(record, ['products', 'items', 'order_items']));
  const normalizedComparable = buildComparableOrderData(
    record,
    baseOrderId,
    externalStatusId,
    lineItems
  );

  return {
    ...normalizedComparable,
    externalStatusName: resolveExternalStatusName(record, externalStatusId, statusNameById),
    fingerprint: hashRuntimeValue(normalizedComparable),
    importState: 'new',
    lastImportedAt: null,
  };
};

const isPreviewItem = (
  entry: BaseOrderImportPreviewItem | null
): entry is BaseOrderImportPreviewItem => entry !== null;

const getOrderTimestamp = (order: BaseOrderImportPreviewItem): number =>
  new Date(order.orderCreatedAt ?? order.orderUpdatedAt ?? 0).getTime();

export const normalizeBaseOrders = (
  payload: unknown,
  statusNameById: ReadonlyMap<string, string> = new Map()
): BaseOrderImportPreviewItem[] => {
  return toArray(extractOrdersSource(payload))
    .map((entry) => normalizeBaseOrderEntry(entry, statusNameById))
    .filter(isPreviewItem)
    .sort((left, right) => getOrderTimestamp(right) - getOrderTimestamp(left));
};

const getFilterDateMs = (value: string | undefined, endOfDay: boolean): number | null => {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed.length === 0) return null;
  const suffix = endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
  return new Date(`${trimmed}${suffix}`).getTime();
};

const getNormalizedStatusFilter = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed !== undefined && trimmed.length > 0 ? trimmed : null;
};

const orderMatchesStatusFilter = (
  order: BaseOrderImportPreviewItem,
  normalizedStatusId: string | null
): boolean =>
  normalizedStatusId === null ||
  (order.externalStatusId !== null && order.externalStatusId === normalizedStatusId);

const orderMatchesDateFilter = (
  order: BaseOrderImportPreviewItem,
  fromMs: number | null,
  toMs: number | null
): boolean => {
  if (fromMs === null && toMs === null) return true;
  const orderTimestamp = getOrderTimestamp(order);
  if (!Number.isFinite(orderTimestamp)) return false;
  if (fromMs !== null && orderTimestamp < fromMs) return false;
  return toMs === null || orderTimestamp <= toMs;
};

const orderMatchesFilters = (
  order: BaseOrderImportPreviewItem,
  normalizedStatusId: string | null,
  fromMs: number | null,
  toMs: number | null
): boolean =>
  orderMatchesStatusFilter(order, normalizedStatusId) && orderMatchesDateFilter(order, fromMs, toMs);

const getResultLimit = (value: number | undefined): number => {
  const limit = typeof value === 'number' && Number.isFinite(value) ? value : 50;
  return Math.max(1, limit);
};

export const filterNormalizedBaseOrders = (
  orders: BaseOrderImportPreviewItem[],
  filters: {
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
    statusId?: string | undefined;
    limit?: number | undefined;
  }
): BaseOrderImportPreviewItem[] => {
  const fromMs = getFilterDateMs(filters.dateFrom, false);
  const toMs = getFilterDateMs(filters.dateTo, true);
  const normalizedStatusId = getNormalizedStatusFilter(filters.statusId);
  const limited = orders.filter((order) =>
    orderMatchesFilters(order, normalizedStatusId, fromMs, toMs)
  );

  return limited.slice(0, getResultLimit(filters.limit));
};
