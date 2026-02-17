export type BaseApiResponse = {
  status?: string;
  error_code?: string;
  error_message?: string;
  [key: string]: unknown;
};

export type BaseInventory = {
  id: string;
  name: string;
};

export type BaseWarehouse = {
  id: string;
  name: string;
  typedId?: string;
};

export type BaseProducer = {
  id: string;
  name: string;
};

export type BaseTag = {
  id: string;
  name: string;
};

export type BaseProductRecord = Record<string, unknown>;

export type BaseCategory = {
  id: string;
  name: string;
  parentId: string | null;
};

const toArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>);
  }
  return [];
};

export const toStringId = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const normalizeBaseParentId = (value: unknown): string | null => {
  const parentId = toStringId(value);
  if (!parentId) return null;
  if (parentId === '0') return null;
  return parentId;
};

export const extractProducerList = (payload: BaseApiResponse): BaseProducer[] => {
  const candidates = [
    payload['manufacturers'],
    payload['producers'],
    payload['producer_list'],
    payload['producers_list'],
    (payload['data'] as Record<string, unknown> | undefined)?.['manufacturers'],
    (payload['data'] as Record<string, unknown> | undefined)?.['producers'],
    (payload['data'] as Record<string, unknown> | undefined)?.['producer_list'],
    (payload['data'] as Record<string, unknown> | undefined)?.['producers_list'],
  ];
  const raw = candidates.map(toArray).find((list: unknown[]) => list.length > 0) ?? [];
  return raw
    .map((entry: unknown) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const id =
        toStringId(record['manufacturer_id']) ??
        toStringId(record['producer_id']) ??
        toStringId(record['id']);
      if (!id) return null;
      const name =
        (typeof record['name'] === 'string' && record['name'].trim()) ||
        (typeof record['producer_name'] === 'string' && record['producer_name'].trim()) ||
        (typeof record['manufacturer_name'] === 'string' &&
          record['manufacturer_name'].trim()) ||
        id;
      return { id, name };
    })
    .filter((entry: BaseProducer | null): entry is BaseProducer => Boolean(entry));
};

export const extractTagList = (payload: BaseApiResponse): BaseTag[] => {
  const candidates = [
    payload['tags'],
    payload['tag_list'],
    payload['labels'],
    (payload['data'] as Record<string, unknown> | undefined)?.['tags'],
    (payload['data'] as Record<string, unknown> | undefined)?.['tag_list'],
    (payload['data'] as Record<string, unknown> | undefined)?.['labels'],
  ];
  const raw = candidates.map(toArray).find((list: unknown[]) => list.length > 0) ?? [];
  return raw
    .map((entry: unknown) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const id =
        toStringId(record['tag_id']) ??
        toStringId(record['id']) ??
        toStringId(record['label_id']);
      if (!id) return null;
      const name =
        (typeof record['name'] === 'string' && record['name'].trim()) ||
        (typeof record['tag'] === 'string' && record['tag'].trim()) ||
        (typeof record['label'] === 'string' && record['label'].trim()) ||
        id;
      return { id, name };
    })
    .filter((entry: BaseTag | null): entry is BaseTag => Boolean(entry));
};

export const extractInventoryList = (payload: BaseApiResponse): BaseInventory[] => {
  const candidates = [
    payload['inventories'],
    payload['inventory'],
    payload['storages'],
    payload['storage'],
    (payload['data'] as Record<string, unknown> | undefined)?.['inventories'],
    (payload['data'] as Record<string, unknown> | undefined)?.['storages'],
  ];
  const raw = candidates.map(toArray).find((list: unknown[]) => list.length > 0) ?? [];
  return raw
    .map((entry: unknown) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const id =
        toStringId(record['inventory_id']) ??
        toStringId(record['storage_id']) ??
        toStringId(record['id']);
      if (!id) return null;
      const name =
        (typeof record['name'] === 'string' && record['name'].trim()) ||
        (typeof record['label'] === 'string' && record['label'].trim()) ||
        id;
      return { id, name };
    })
    .filter((entry: BaseInventory | null): entry is BaseInventory => Boolean(entry));
};

export const extractWarehouseList = (payload: BaseApiResponse): BaseWarehouse[] => {
  const candidates = [
    payload['warehouses'],
    payload['warehouse'],
    (payload['data'] as Record<string, unknown> | undefined)?.['warehouses'],
  ];
  const raw = candidates.map(toArray).find((list: unknown[]) => list.length > 0) ?? [];
  return raw.reduce<BaseWarehouse[]>((acc: BaseWarehouse[], entry: unknown) => {
    if (!entry || typeof entry !== 'object') return acc;
    const record = entry as Record<string, unknown>;
    const id =
      toStringId(record['warehouse_id']) ??
      toStringId(record['id']) ??
      toStringId(record['storage_id']);
    if (!id) return acc;
    const type =
      typeof record['warehouse_type'] === 'string' && record['warehouse_type'].trim()
        ? record['warehouse_type'].trim().toLowerCase()
        : null;
    const typedId =
      type && !id.startsWith(`${type}_`) ? `${type}_${id}` : type ? id : undefined;
    const name =
      (typeof record['name'] === 'string' && record['name'].trim()) ||
      (typeof record['label'] === 'string' && record['label'].trim()) ||
      id;
    acc.push(typedId ? { id, name, typedId } : { id, name });
    return acc;
  }, []);
};

export const extractProductIds = (payload: BaseApiResponse): string[] => {
  const rawProducts =
    payload['products'] ??
    payload['items'] ??
    (payload['data'] as Record<string, unknown> | undefined)?.['products'] ??
    (payload['data'] as Record<string, unknown> | undefined)?.['items'];
  const ids = new Set<string>();
  if (Array.isArray(rawProducts)) {
    for (const entry of rawProducts as unknown[]) {
      if (entry && typeof entry === 'object') {
        const record = entry as Record<string, unknown>;
        const id =
          toStringId(record['product_id']) ??
          toStringId(record['id']) ??
          toStringId(record['base_product_id']);
        if (id) ids.add(id);
      } else {
        const id = toStringId(entry);
        if (id) ids.add(id);
      }
    }
  } else if (rawProducts && typeof rawProducts === 'object') {
    for (const [key, value] of Object.entries(rawProducts as Record<string, unknown>)) {
      const record =
        value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
      const id = record?.['product_id'] ?? record?.['id'] ?? record?.['base_product_id'] ?? key;
      const resolved = toStringId(id);
      if (resolved) ids.add(resolved);
    }
  }
  return Array.from(ids);
};

export const extractProducts = (payload: BaseApiResponse): BaseProductRecord[] => {
  const rawProducts =
    payload['products'] ??
    payload['items'] ??
    (payload['data'] as Record<string, unknown> | undefined)?.['products'] ??
    (payload['data'] as Record<string, unknown> | undefined)?.['items'];

  if (Array.isArray(rawProducts)) {
    return rawProducts.map((entry: unknown) => {
      if (entry && typeof entry === 'object') {
        return { ...(entry as Record<string, unknown>) };
      }
      const id = toStringId(entry);
      return id ? { id } : {};
    });
  }

  if (rawProducts && typeof rawProducts === 'object') {
    return Object.entries(rawProducts as Record<string, unknown>).map(
      ([key, value]: [string, unknown]) => {
        if (value && typeof value === 'object') {
          const record = value as Record<string, unknown>;
          return {
            product_id: record['product_id'] ?? key,
            id: record['id'] ?? key,
            ...record,
          };
        }
        const id = toStringId(value) ?? key;
        return id ? { id } : {};
      },
    );
  }

  return [];
};

export const dedupeProducers = (producers: BaseProducer[]): BaseProducer[] => {
  const byId = new Map<string, BaseProducer>();
  for (const producer of producers) {
    if (!producer.id) continue;
    if (!byId.has(producer.id)) {
      byId.set(producer.id, producer);
    }
  }
  return Array.from(byId.values());
};

export const dedupeTags = (tags: BaseTag[]): BaseTag[] => {
  const byId = new Map<string, BaseTag>();
  for (const tag of tags) {
    if (!tag.id) continue;
    if (!byId.has(tag.id)) {
      byId.set(tag.id, tag);
    }
  }
  return Array.from(byId.values());
};

export const dedupeCategories = (categories: BaseCategory[]): BaseCategory[] => {
  const byId = new Map<string, BaseCategory>();
  for (const category of categories) {
    if (!category.id) continue;
    if (!byId.has(category.id)) {
      byId.set(category.id, category);
    }
  }
  return Array.from(byId.values());
};

export const fetchBaseCategoriesFromPayload = (
  payload: BaseApiResponse,
): BaseCategory[] => {
  const rawCategories =
    payload['categories'] ??
    (payload['data'] as Record<string, unknown> | undefined)?.['categories'] ??
    payload;

  if (
    rawCategories &&
    typeof rawCategories === 'object' &&
    !Array.isArray(rawCategories)
  ) {
    return Object.entries(rawCategories as Record<string, unknown>)
      .filter(
        ([key]: [string, unknown]) =>
          key !== 'status' && key !== 'error_code' && key !== 'error_message',
      )
      .map(([key, value]: [string, unknown]) => {
        const cat = value as Record<string, unknown>;
        const id = toStringId(cat['category_id']) ?? toStringId(cat['id']) ?? key;
        const name =
          (typeof cat['name'] === 'string' && cat['name'].trim()) ||
          (typeof cat['label'] === 'string' && cat['label'].trim()) ||
          id;
        const parentId = normalizeBaseParentId(
          cat['parent_id'] ?? cat['parent_category_id'],
        );
        return { id, name, parentId };
      });
  }

  if (Array.isArray(rawCategories)) {
    return rawCategories.map((cat: Record<string, unknown>) => {
      const id = toStringId(cat['category_id']) ?? toStringId(cat['id']) ?? '';
      const name =
        (typeof cat['name'] === 'string' && cat['name'].trim()) ||
        (typeof cat['label'] === 'string' && cat['label'].trim()) ||
        id;
      const parentId = normalizeBaseParentId(
        cat['parent_id'] ?? cat['parent_category_id'],
      );
      return { id, name, parentId };
    });
  }

  return [];
};
