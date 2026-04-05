import type { BaseApiResponse, BaseProductRecord } from '@/shared/contracts/integrations/base-api';
import type { BaseInventory, BaseWarehouse } from '@/shared/contracts/integrations/base-com';
import type { BaseCategory } from '@/shared/contracts/integrations/listings';
import type { BaseProducer, BaseTag } from '@/shared/contracts/integrations';

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
        (typeof record['manufacturer_name'] === 'string' && record['manufacturer_name'].trim()) ||
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
        toStringId(record['tag_id']) ?? toStringId(record['id']) ?? toStringId(record['label_id']);
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
      const is_default = Boolean(record['is_default'] ?? record['default']);
      return { id, name, is_default };
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
    const typedId = type && !id.startsWith(`${type}_`) ? `${type}_${id}` : type ? id : undefined;
    const name =
      (typeof record['name'] === 'string' && record['name'].trim()) ||
      (typeof record['label'] === 'string' && record['label'].trim()) ||
      id;
    const is_default = Boolean(record['is_default'] ?? record['default']);
    acc.push(typedId ? { id, name, typedId, is_default } : { id, name, is_default });
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
      const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
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
      }
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

const CATEGORY_SYSTEM_KEYS = new Set<string>(['status', 'error_code', 'error_message']);

const CATEGORY_CHILD_COLLECTION_KEYS = [
  'children',
  'categories',
  'subcategories',
  'sub_categories',
  'child_categories',
  'items',
] as const;

const hasOwn = (record: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

const resolveFallbackId = (fallbackKey: string | undefined): string | null => {
  if (!fallbackKey) return null;
  const trimmed = fallbackKey.trim();
  if (!trimmed || CATEGORY_SYSTEM_KEYS.has(trimmed)) return null;
  return toStringId(trimmed) ?? trimmed;
};

type ParsedCategoryNode = {
  category: BaseCategory;
  hasExplicitParent: boolean;
  childCollections: unknown[];
};

const parseCategoryNode = (
  value: unknown,
  inheritedParentId: string | null,
  fallbackKey?: string
): ParsedCategoryNode | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const explicitId = toStringId(record['category_id']) ?? toStringId(record['id']);
  const fallbackId = resolveFallbackId(fallbackKey);

  const rawName =
    (typeof record['name'] === 'string' && record['name'].trim()) ||
    (typeof record['label'] === 'string' && record['label'].trim()) ||
    '';
  const hasName = rawName.length > 0;

  const hasExplicitParent =
    hasOwn(record, 'parent_id') ||
    hasOwn(record, 'parent_category_id') ||
    hasOwn(record, 'parentId');

  const childCollections = CATEGORY_CHILD_COLLECTION_KEYS.map((key) => record[key]).filter(
    (entry: unknown): entry is unknown => entry !== undefined && entry !== null
  );

  if (
    !explicitId &&
    !(fallbackId && (hasName || hasExplicitParent || childCollections.length > 0))
  ) {
    return null;
  }

  if (!hasName && !hasExplicitParent && childCollections.length === 0) {
    return null;
  }

  const id = explicitId ?? fallbackId;
  if (!id) return null;

  const explicitParentId = normalizeBaseParentId(
    record['parent_id'] ?? record['parent_category_id'] ?? record['parentId']
  );
  const parentId = hasExplicitParent ? explicitParentId : inheritedParentId;

  return {
    category: {
      id,
      name: hasName ? rawName : id,
      parentId,
    },
    hasExplicitParent,
    childCollections,
  };
};

type StoredCategory = {
  category: BaseCategory;
  hasExplicitParent: boolean;
};

const mergeCategory = (
  categoriesById: Map<string, StoredCategory>,
  parsed: ParsedCategoryNode
): void => {
  const existing = categoriesById.get(parsed.category.id);
  if (!existing) {
    categoriesById.set(parsed.category.id, {
      category: parsed.category,
      hasExplicitParent: parsed.hasExplicitParent,
    });
    return;
  }

  const nextCategory: BaseCategory = { ...existing.category };
  const existingHasConcreteName = Boolean(
    nextCategory.name && nextCategory.name !== nextCategory.id
  );
  const parsedHasConcreteName = Boolean(
    parsed.category.name && parsed.category.name !== parsed.category.id
  );
  if (!existingHasConcreteName && parsedHasConcreteName) {
    nextCategory.name = parsed.category.name;
  }

  if (parsed.hasExplicitParent) {
    nextCategory.parentId = parsed.category.parentId;
  } else if (!existing.hasExplicitParent && !nextCategory.parentId && parsed.category.parentId) {
    nextCategory.parentId = parsed.category.parentId;
  }

  categoriesById.set(parsed.category.id, {
    category: nextCategory,
    hasExplicitParent: existing.hasExplicitParent || parsed.hasExplicitParent,
  });
};

const collectCategoriesFromNode = (
  value: unknown,
  categoriesById: Map<string, StoredCategory>,
  inheritedParentId: string | null,
  fallbackKey?: string,
  depth: number = 0
): void => {
  if (depth > 32) return;

  if (Array.isArray(value)) {
    value.forEach((entry: unknown) =>
      collectCategoriesFromNode(entry, categoriesById, inheritedParentId, undefined, depth + 1)
    );
    return;
  }

  if (typeof value === 'string') {
    const id = resolveFallbackId(fallbackKey);
    const name = value.trim();
    if (!id || !name) return;
    mergeCategory(categoriesById, {
      category: { id, name, parentId: inheritedParentId },
      hasExplicitParent: false,
      childCollections: [],
    });
    return;
  }

  if (!value || typeof value !== 'object') return;

  const parsed = parseCategoryNode(value, inheritedParentId, fallbackKey);
  if (parsed) {
    mergeCategory(categoriesById, parsed);
    parsed.childCollections.forEach((childCollection: unknown) => {
      collectCategoriesFromNode(
        childCollection,
        categoriesById,
        parsed.category.id,
        undefined,
        depth + 1
      );
    });
    return;
  }

  Object.entries(value as Record<string, unknown>).forEach(
    ([key, childValue]: [string, unknown]) => {
      if (CATEGORY_SYSTEM_KEYS.has(key)) return;
      collectCategoriesFromNode(childValue, categoriesById, inheritedParentId, key, depth + 1);
    }
  );
};

export const fetchBaseCategoriesFromPayload = (payload: BaseApiResponse): BaseCategory[] => {
  const rawCategories =
    payload['categories'] ??
    (payload['data'] as Record<string, unknown> | undefined)?.['categories'] ??
    payload;
  const categoriesById = new Map<string, StoredCategory>();
  collectCategoriesFromNode(rawCategories, categoriesById, null);
  return Array.from(categoriesById.values()).map((entry: StoredCategory) => entry.category);
};
