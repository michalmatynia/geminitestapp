const CATEGORY_LABEL_FALLBACK_FIELDS = ['name_en', 'name', 'name_pl', 'name_de'] as const;
const CATEGORY_ID_FIELDS = ['id', '_id', 'categoryId'] as const;
const CATALOG_ID_FIELDS = ['catalogId', 'id'] as const;

const resolveFirstTrimmedRecordValue = (
  record: Record<string, unknown> | null | undefined,
  keys: readonly string[]
): string => {
  if (!record) {
    return '';
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value !== 'string') {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return '';
};

export const resolveCategoryRecordLabel = (
  record: Record<string, unknown> | null | undefined,
  locale: 'name_en' | 'name_pl' | 'name_de'
): string => resolveFirstTrimmedRecordValue(record, [locale, ...CATEGORY_LABEL_FALLBACK_FIELDS]);

export const resolveCategoryRecordIdValue = (
  record: Record<string, unknown> | null | undefined
): string => resolveFirstTrimmedRecordValue(record, CATEGORY_ID_FIELDS);

export const resolveCatalogRelationIdValue = (
  record: Record<string, unknown> | null | undefined
): string => {
  const directCatalogId = resolveFirstTrimmedRecordValue(record, CATALOG_ID_FIELDS);
  if (directCatalogId) {
    return directCatalogId;
  }

  const catalogRecord =
    record?.['catalog'] && typeof record['catalog'] === 'object' && !Array.isArray(record['catalog'])
      ? (record['catalog'] as Record<string, unknown>)
      : null;

  return resolveFirstTrimmedRecordValue(catalogRecord, ['id']);
};

export const resolveCategoryDisplayLabel = (
  categoryId: string,
  categoryNameById: ReadonlyMap<string, string>,
  opaqueCategoryIdPattern: RegExp
): string => {
  const label = categoryNameById.get(categoryId)?.trim() ?? '';
  if (label) {
    return label;
  }

  return opaqueCategoryIdPattern.test(categoryId) ? '—' : categoryId;
};
