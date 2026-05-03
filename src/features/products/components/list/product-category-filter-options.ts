import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import {
  PRODUCT_CATEGORY_FILTER_ALL_VALUE,
  PRODUCT_CATEGORY_FILTER_UNASSIGNED_VALUE,
} from '@/shared/lib/products/constants';

export type ProductCategoryNameLocale = 'name_en' | 'name_pl' | 'name_de';

type CategoryFilterOptionEntry = {
  value: string;
  pathLabel: string;
  catalogLabel: string;
};

type CategoryFilterRecord = {
  id: string;
  parentId: string | null;
  catalogId: string;
  label: string;
  sortIndex: number;
};

const normalizeString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
};

const resolveCategoryFilterLabel = (
  category: ProductCategory,
  nameLocale: ProductCategoryNameLocale
): string => {
  const localizedName = normalizeString(category[nameLocale]);
  if (localizedName.length > 0) return localizedName;

  const fallbackNames = [
    normalizeString(category.name_en),
    normalizeString(category.name),
    normalizeString(category.name_pl),
    normalizeString(category.name_de),
  ];
  return fallbackNames.find((label) => label.length > 0) ?? 'Unlabeled category';
};

const normalizeCategoryParentId = (value: unknown): string | null => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
};

const compareCategoryFilterRecords = (
  left: CategoryFilterRecord,
  right: CategoryFilterRecord
): number => {
  if (left.sortIndex !== right.sortIndex) return left.sortIndex - right.sortIndex;
  return left.label.localeCompare(right.label);
};

const createCategoryFilterRecords = (
  categories: ProductCategory[],
  nameLocale: ProductCategoryNameLocale
): CategoryFilterRecord[] => {
  const recordsById = new Map<string, CategoryFilterRecord>();

  categories.forEach((category: ProductCategory): void => {
    const id = normalizeString(category.id);
    const catalogId = normalizeString(category.catalogId);
    if (id.length === 0 || catalogId.length === 0 || recordsById.has(id)) return;

    recordsById.set(id, {
      id,
      parentId: normalizeCategoryParentId(category.parentId),
      catalogId,
      label: resolveCategoryFilterLabel(category, nameLocale),
      sortIndex: typeof category.sortIndex === 'number' ? category.sortIndex : 0,
    });
  });

  return Array.from(recordsById.values());
};

const appendToMapList = <TValue>(
  map: Map<string, TValue[]>,
  key: string,
  value: TValue
): void => {
  map.set(key, [...(map.get(key) ?? []), value]);
};

const compareCatalogIds = (
  catalogNameById: ReadonlyMap<string, string>,
  catalogOrder: ReadonlyMap<string, number>,
  left: string,
  right: string
): number => {
  const leftOrder = catalogOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = catalogOrder.get(right) ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;

  const leftLabel = normalizeString(catalogNameById.get(left));
  const rightLabel = normalizeString(catalogNameById.get(right));
  return (leftLabel.length > 0 ? leftLabel : left).localeCompare(
    rightLabel.length > 0 ? rightLabel : right
  );
};

const createCatalogOrder = (
  catalogNameById: ReadonlyMap<string, string>
): ReadonlyMap<string, number> => {
  const catalogOrder = new Map<string, number>();
  Array.from(catalogNameById.keys()).forEach((catalogId, index): void => {
    catalogOrder.set(catalogId, index);
  });
  return catalogOrder;
};

const collectCategoryFilterEntries = (
  rootsByCatalogId: ReadonlyMap<string, CategoryFilterRecord[]>,
  childrenByParentId: ReadonlyMap<string, CategoryFilterRecord[]>,
  catalogNameById: ReadonlyMap<string, string>
): CategoryFilterOptionEntry[] => {
  const catalogOrder = createCatalogOrder(catalogNameById);
  const catalogIds = Array.from(rootsByCatalogId.keys()).sort((left, right) =>
    compareCatalogIds(catalogNameById, catalogOrder, left, right)
  );
  const entries: CategoryFilterOptionEntry[] = [];

  const visit = (
    record: CategoryFilterRecord,
    parentPath: string[],
    visited: Set<string>
  ): void => {
    if (visited.has(record.id)) return;
    const nextVisited = new Set(visited);
    nextVisited.add(record.id);
    const path = [...parentPath, record.label];
    const catalogLabel = normalizeString(catalogNameById.get(record.catalogId));

    entries.push({
      value: record.id,
      pathLabel: path.join(' / '),
      catalogLabel: catalogLabel.length > 0 ? catalogLabel : record.catalogId,
    });

    const children = [...(childrenByParentId.get(record.id) ?? [])].sort(
      compareCategoryFilterRecords
    );
    children.forEach((child) => visit(child, path, nextVisited));
  };

  catalogIds.forEach((catalogId): void => {
    const roots = [...(rootsByCatalogId.get(catalogId) ?? [])].sort(compareCategoryFilterRecords);
    roots.forEach((root) => visit(root, [], new Set<string>()));
  });

  return entries;
};

const buildCategoryFilterEntries = ({
  categories,
  catalogNameById,
  nameLocale,
}: {
  categories: ProductCategory[];
  catalogNameById: ReadonlyMap<string, string>;
  nameLocale: ProductCategoryNameLocale;
}): CategoryFilterOptionEntry[] => {
  const records = createCategoryFilterRecords(categories, nameLocale);
  const recordById = new Map(records.map((record) => [record.id, record]));
  const childrenByParentId = new Map<string, CategoryFilterRecord[]>();
  const rootsByCatalogId = new Map<string, CategoryFilterRecord[]>();

  records.forEach((record): void => {
    if (record.parentId === record.id) return;

    if (record.parentId === null) {
      appendToMapList(rootsByCatalogId, record.catalogId, record);
      return;
    }

    const parent = recordById.get(record.parentId);
    if (parent?.catalogId !== record.catalogId) return;
    appendToMapList(childrenByParentId, record.parentId, record);
  });

  return collectCategoryFilterEntries(rootsByCatalogId, childrenByParentId, catalogNameById);
};

export const buildCategoryFilterOptions = ({
  categories,
  catalogNameById,
  nameLocale,
  selectedCatalogId,
}: {
  categories: ProductCategory[];
  catalogNameById: ReadonlyMap<string, string>;
  nameLocale: ProductCategoryNameLocale;
  selectedCatalogId: string | undefined;
}): Array<LabeledOptionDto<string>> => {
  const entries = buildCategoryFilterEntries({
    categories,
    catalogNameById,
    nameLocale,
  });
  const duplicateCountByPath = new Map<string, number>();
  entries.forEach((entry): void => {
    duplicateCountByPath.set(entry.pathLabel, (duplicateCountByPath.get(entry.pathLabel) ?? 0) + 1);
  });

  return [
    { value: PRODUCT_CATEGORY_FILTER_ALL_VALUE, label: 'All categories' },
    { value: PRODUCT_CATEGORY_FILTER_UNASSIGNED_VALUE, label: 'Unassigned' },
    ...entries.map((entry) => {
      const isDuplicatePath = (duplicateCountByPath.get(entry.pathLabel) ?? 0) > 1;
      return {
        value: entry.value,
        label:
          selectedCatalogId === undefined && isDuplicatePath
            ? `${entry.pathLabel} (${entry.catalogLabel})`
            : entry.pathLabel,
      };
    }),
  ];
};
