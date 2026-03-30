import type {
  BaseOrderImportLineItem,
  BaseOrderImportPreviewItem,
  BaseOrderImportStatusOption,
} from '@/shared/contracts/products';
import { hashRuntimeValue } from '@/shared/lib/ai-paths/core/utils/runtime';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;

const toArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  return record ? Object.values(record) : [];
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
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toDateIso = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      return toDateIso(Number(trimmed));
    }
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
};

const extractStatusesSource = (payload: unknown): unknown => {
  const record = asRecord(payload);
  if (!record) return payload;
  const dataRecord = asRecord(record['data']);
  return (
    record['statuses'] ??
    record['order_statuses'] ??
    record['orderStatuses'] ??
    dataRecord?.['statuses'] ??
    dataRecord?.['order_statuses'] ??
    dataRecord?.['orderStatuses'] ??
    record['data'] ??
    payload
  );
};

const extractOrdersSource = (payload: unknown): unknown => {
  const record = asRecord(payload);
  if (!record) return payload;
  const dataRecord = asRecord(record['data']);
  return record['orders'] ?? dataRecord?.['orders'] ?? record['data'] ?? payload;
};

export const normalizeBaseOrderStatuses = (payload: unknown): BaseOrderImportStatusOption[] => {
  const source = extractStatusesSource(payload);
  if (Array.isArray(source)) {
    return source
      .map((entry) => {
        const record = asRecord(entry);
        if (!record) return null;
        const id = toNullableString(readField(record, ['id', 'status_id', 'order_status_id']));
        const name = toNullableString(readField(record, ['name', 'status_name', 'label']));
        if (!id || !name) return null;
        return { id, name };
      })
      .filter((entry): entry is BaseOrderImportStatusOption => entry !== null);
  }

  const sourceRecord = asRecord(source);
  if (!sourceRecord) return [];

  return Object.entries(sourceRecord)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? { id: key, name: trimmed } : null;
      }
      const record = asRecord(value);
      if (!record) return null;
      const id = toNullableString(readField(record, ['id', 'status_id', 'order_status_id'])) ?? key;
      const name = toNullableString(readField(record, ['name', 'status_name', 'label']));
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((entry): entry is BaseOrderImportStatusOption => entry !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
};

const normalizeLineItems = (value: unknown): BaseOrderImportLineItem[] =>
  toArray(value)
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return null;
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
    })
    .filter((entry): entry is BaseOrderImportLineItem => entry !== null);

export const normalizeBaseOrders = (
  payload: unknown,
  statusNameById: ReadonlyMap<string, string> = new Map()
): BaseOrderImportPreviewItem[] => {
  const normalizedOrders: Array<BaseOrderImportPreviewItem | null> = toArray(
    extractOrdersSource(payload)
  ).map((entry): BaseOrderImportPreviewItem | null => {
      const record = asRecord(entry);
      if (!record) return null;

      const baseOrderId =
        toNullableString(readField(record, ['order_id', 'id', 'shop_order_id'])) ?? null;
      if (!baseOrderId) return null;

      const externalStatusId = toNullableString(
        readField(record, ['order_status_id', 'status_id', 'status'])
      );
      const lineItems = normalizeLineItems(
        readField(record, ['products', 'items', 'order_items'])
      );
      const buyerName =
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
      const buyerEmail = toNullableString(readField(record, ['email', 'buyer_email']));
      const orderCreatedAt = toDateIso(
        readField(record, ['date_add', 'date_created', 'created_at', 'date_confirmed'])
      );
      const orderUpdatedAt = toDateIso(
        readField(record, ['date_confirmed', 'date_in_status', 'updated_at', 'date_modified'])
      );
      const normalizedComparable = {
        baseOrderId,
        orderNumber: toNullableString(
          readField(record, ['shop_order_id', 'order_number', 'external_order_id'])
        ),
        externalStatusId,
        buyerName,
        buyerEmail,
        currency: toNullableString(readField(record, ['currency'])),
        totalGross: toNumber(
          readField(record, ['price_brutto', 'total_price_brutto', 'total_price', 'payment_done'])
        ),
        deliveryMethod: toNullableString(readField(record, ['delivery_method', 'delivery'])),
        paymentMethod: toNullableString(readField(record, ['payment_method', 'payment'])),
        source: toNullableString(readField(record, ['order_source', 'shop', 'source'])),
        orderCreatedAt,
        orderUpdatedAt,
        lineItems,
        raw: record,
      };

      const normalizedOrder: BaseOrderImportPreviewItem = {
        ...normalizedComparable,
        externalStatusName:
          (externalStatusId ? statusNameById.get(externalStatusId) : null) ??
          toNullableString(readField(record, ['status_name', 'order_status_name'])),
        fingerprint: hashRuntimeValue(normalizedComparable),
        importState: 'new',
        lastImportedAt: null,
      };
      return normalizedOrder;
    });

  return normalizedOrders
    .filter((entry): entry is BaseOrderImportPreviewItem => entry !== null)
    .sort((left, right) => {
      const leftTime = new Date(left.orderCreatedAt ?? left.orderUpdatedAt ?? 0).getTime();
      const rightTime = new Date(right.orderCreatedAt ?? right.orderUpdatedAt ?? 0).getTime();
      return rightTime - leftTime;
    });
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
  const fromMs = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00.000Z`).getTime() : null;
  const toMs = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999Z`).getTime() : null;
  const normalizedStatusId = filters.statusId?.trim() || null;
  const limited = orders.filter((order) => {
    if (normalizedStatusId && order.externalStatusId !== normalizedStatusId) {
      return false;
    }

    if (fromMs !== null || toMs !== null) {
      const orderTimestamp = new Date(order.orderCreatedAt ?? order.orderUpdatedAt ?? 0).getTime();
      if (!Number.isFinite(orderTimestamp)) {
        return false;
      }
      if (fromMs !== null && orderTimestamp < fromMs) {
        return false;
      }
      if (toMs !== null && orderTimestamp > toMs) {
        return false;
      }
    }

    return true;
  });

  const limit = typeof filters.limit === 'number' && Number.isFinite(filters.limit) ? filters.limit : 50;
  return limited.slice(0, Math.max(1, limit));
};
