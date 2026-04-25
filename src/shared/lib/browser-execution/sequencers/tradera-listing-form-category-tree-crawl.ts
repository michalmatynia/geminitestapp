import type { TraderaListingFormCategoryPickerItem } from './tradera-listing-form-category-picker';

const MAX_CATEGORY_TREE_DEPTH = 10;

export type TraderaListingFormCategoryTreeCrawlInput = {
  rootItems: TraderaListingFormCategoryPickerItem[];
  isBudgetExhausted: () => boolean;
  resolveId: (item: TraderaListingFormCategoryPickerItem, parentId: string) => string;
  addCategory: (id: string, name: string, parentId: string) => void;
  drillAndRead: (
    path: TraderaListingFormCategoryPickerItem[]
  ) => Promise<TraderaListingFormCategoryPickerItem[] | null>;
};

export type TraderaListingFormCategoryTreeCrawlResult = {
  pagesVisited: number;
  budgetExhausted: boolean;
};

const addPickerItemsAsChildren = (
  items: TraderaListingFormCategoryPickerItem[],
  parentId: string,
  input: TraderaListingFormCategoryTreeCrawlInput
): void => {
  for (const item of items) {
    const id = input.resolveId(item, parentId);
    input.addCategory(id, item.name, parentId);
  }
};

const buildCategoryPathKey = (
  path: TraderaListingFormCategoryPickerItem[]
): string =>
  path
    .map((item) =>
      item.id.length > 0
        ? `id:${item.id}`
        : `name:${item.name.trim().toLowerCase()}`
    )
    .join('>');

const hasAncestorCategoryId = (
  path: TraderaListingFormCategoryPickerItem[],
  item: TraderaListingFormCategoryPickerItem
): boolean =>
  item.id.length > 0 && path.some((ancestor) => ancestor.id === item.id);

const normalizeCategoryName = (value: string): string =>
  value.replace(/\s+/g, ' ').trim().toLowerCase();

const hasAncestorCategoryName = (
  path: TraderaListingFormCategoryPickerItem[],
  item: TraderaListingFormCategoryPickerItem
): boolean => {
  const itemName = normalizeCategoryName(item.name);
  return (
    itemName.length > 0 &&
    path.some((ancestor) => normalizeCategoryName(ancestor.name) === itemName)
  );
};

const filterDescendantItems = (
  items: TraderaListingFormCategoryPickerItem[],
  path: TraderaListingFormCategoryPickerItem[]
): TraderaListingFormCategoryPickerItem[] =>
  items.filter(
    (item) => !hasAncestorCategoryId(path, item) && !hasAncestorCategoryName(path, item)
  );

/* eslint-disable no-await-in-loop -- Category traversal is intentionally serial because each picker click mutates the current path. */
const crawlCategoryPathDescendants = async ({
  input,
  parentId,
  path,
  visitedPathKeys,
}: {
  input: TraderaListingFormCategoryTreeCrawlInput;
  parentId: string;
  path: TraderaListingFormCategoryPickerItem[];
  visitedPathKeys: Set<string>;
}): Promise<TraderaListingFormCategoryTreeCrawlResult> => {
  if (input.isBudgetExhausted()) return { pagesVisited: 0, budgetExhausted: true };
  if (path.length > MAX_CATEGORY_TREE_DEPTH) {
    return { pagesVisited: 0, budgetExhausted: false };
  }

  const pathKey = buildCategoryPathKey(path);
  if (visitedPathKeys.has(pathKey)) {
    return { pagesVisited: 0, budgetExhausted: false };
  }
  visitedPathKeys.add(pathKey);

  const childItems = await input.drillAndRead(path);
  let pagesVisited = 1;
  if (childItems === null || childItems.length === 0) {
    return { pagesVisited, budgetExhausted: false };
  }

  const descendants = filterDescendantItems(childItems, path);
  addPickerItemsAsChildren(descendants, parentId, input);

  for (const childItem of descendants) {
    const childId = input.resolveId(childItem, parentId);
    const nested = await crawlCategoryPathDescendants({
      input,
      parentId: childId,
      path: [...path, childItem],
      visitedPathKeys,
    });
    pagesVisited += nested.pagesVisited;
    if (nested.budgetExhausted) return { pagesVisited, budgetExhausted: true };
  }

  return { pagesVisited, budgetExhausted: false };
};

export const crawlTraderaListingFormCategoryTree = async (
  input: TraderaListingFormCategoryTreeCrawlInput
): Promise<TraderaListingFormCategoryTreeCrawlResult> => {
  let pagesVisited = 0;
  const visitedPathKeys = new Set<string>();

  for (const rootItem of input.rootItems) {
    if (input.isBudgetExhausted()) {
      return { pagesVisited, budgetExhausted: true };
    }

    const rootId = input.resolveId(rootItem, '0');
    const result = await crawlCategoryPathDescendants({
      input,
      parentId: rootId,
      path: [rootItem],
      visitedPathKeys,
    });
    pagesVisited += result.pagesVisited;
    if (result.budgetExhausted) {
      return { pagesVisited, budgetExhausted: true };
    }
  }

  return { pagesVisited, budgetExhausted: false };
};
/* eslint-enable no-await-in-loop */
