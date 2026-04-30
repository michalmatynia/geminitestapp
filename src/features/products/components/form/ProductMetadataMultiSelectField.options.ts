import type { LabeledOptionDto } from '@/shared/contracts/base';

import type { MetadataItem } from './ProductMetadataMultiSelectField.types';

const ROOT_PARENT_KEY = '__root__';

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
  return null;
};

const compareCategorySortIndex = (aSort: number | null, bSort: number | null): number | null => {
  if (aSort !== null && bSort === null) return -1;
  if (aSort === null && bSort !== null) return 1;
  if (aSort !== null && bSort !== null && aSort !== bSort) return aSort - bSort;
  return null;
};

const compareCategoryNames = (a: MetadataItem, b: MetadataItem): number => {
  const nameComparison = toTrimmedString(a.name)
    .toLowerCase()
    .localeCompare(toTrimmedString(b.name).toLowerCase());
  if (nameComparison !== 0) return nameComparison;
  return toTrimmedString(a.id).localeCompare(toTrimmedString(b.id));
};

const compareCategoryItems = (a: MetadataItem, b: MetadataItem): number => {
  const aSort = toNumberOrNull(a.sortIndex);
  const bSort = toNumberOrNull(b.sortIndex);
  return compareCategorySortIndex(aSort, bSort) ?? compareCategoryNames(a, b);
};

const normalizeMetadataItem = (rawItem: MetadataItem): MetadataItem | null => {
  const id = toTrimmedString(rawItem.id);
  if (id.length === 0) return null;
  const name = toTrimmedString(rawItem.name);
  const parentId = toTrimmedString(rawItem.parentId);
  return {
    ...rawItem,
    id,
    name: name.length > 0 ? name : id,
    parentId: parentId.length > 0 ? parentId : null,
    sortIndex: toNumberOrNull(rawItem.sortIndex),
  };
};

const normalizeMetadataItems = (rawItems: MetadataItem[]): MetadataItem[] =>
  rawItems
    .map((rawItem) => normalizeMetadataItem(rawItem))
    .filter((item): item is MetadataItem => item !== null);

const buildMetadataItemLookup = (items: MetadataItem[]): Map<string, MetadataItem> =>
  new Map(items.map((item) => [item.id, item]));

const resolveParentKey = (item: MetadataItem, byId: Map<string, MetadataItem>): string => {
  const parentId = toTrimmedString(item.parentId);
  if (parentId.length === 0) return ROOT_PARENT_KEY;
  if (parentId === item.id || !byId.has(parentId)) return ROOT_PARENT_KEY;
  return parentId;
};

const buildChildrenByParent = (items: MetadataItem[]): Map<string, MetadataItem[]> => {
  const byId = buildMetadataItemLookup(items);
  const childrenByParent = new Map<string, MetadataItem[]>();
  for (const item of items) {
    const parentKey = resolveParentKey(item, byId);
    childrenByParent.set(parentKey, [...(childrenByParent.get(parentKey) ?? []), item]);
  }
  childrenByParent.forEach((children) => children.sort(compareCategoryItems));
  return childrenByParent;
};

const appendCategoryOption = (
  options: Array<LabeledOptionDto<string>>,
  item: MetadataItem,
  level: number
): void => {
  const levelPrefix = level > 0 ? '|-- '.repeat(level) : '';
  options.push({
    value: item.id,
    label: `${levelPrefix}${item.name}`,
  });
};

const visitCategoryItem = (args: {
  item: MetadataItem;
  level: number;
  childrenByParent: Map<string, MetadataItem[]>;
  visited: Set<string>;
  options: Array<LabeledOptionDto<string>>;
}): void => {
  if (args.visited.has(args.item.id)) return;
  args.visited.add(args.item.id);
  appendCategoryOption(args.options, args.item, args.level);
  for (const child of args.childrenByParent.get(args.item.id) ?? []) {
    visitCategoryItem({ ...args, item: child, level: args.level + 1 });
  }
};

export const buildCategoryTreeOptions = (
  rawItems: MetadataItem[]
): Array<LabeledOptionDto<string>> => {
  const normalizedItems = normalizeMetadataItems(rawItems);
  const childrenByParent = buildChildrenByParent(normalizedItems);
  const options: Array<LabeledOptionDto<string>> = [];
  const visited = new Set<string>();

  for (const rootItem of childrenByParent.get(ROOT_PARENT_KEY) ?? []) {
    visitCategoryItem({ item: rootItem, level: 0, childrenByParent, visited, options });
  }
  for (const item of normalizedItems.slice().sort(compareCategoryItems)) {
    visitCategoryItem({ item, level: 0, childrenByParent, visited, options });
  }

  return options;
};

export const buildFlatMetadataOptions = (
  items: MetadataItem[]
): Array<LabeledOptionDto<string>> =>
  items.map((item) => ({
    value: item.id,
    label: item.name,
  }));
