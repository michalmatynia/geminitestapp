import type { TraderaListingFormCategoryPickerItem } from './tradera-listing-form-category-picker';

const TRADERA_PUBLIC_CATEGORY_URL_PREFIX = 'https://www.tradera.com/en/category/';
const TRADERA_PUBLIC_HOME_URL = 'https://www.tradera.com/en';
const ACTIVE_CATEGORY_CHILDREN_PATTERN =
  /"activeCategory":\{"id":\d+[\s\S]*?"children":\[(?<children>[\s\S]*?)\],"isSelected":true/;
const CHILD_CATEGORY_PATTERN =
  /\{"id":(?<id>\d+),"name":"(?<name>(?:\\.|[^"])*)","url":"https:\/\/www\.tradera\.com\/category\/\d+"/g;
const PUBLIC_CATEGORY_LINK_PATTERN =
  /<a\b[^>]*href="(?:https:\/\/www\.tradera\.com)?\/(?:en\/)?category\/(?<id>\d+)"[^>]*>(?<name>[\s\S]*?)<\/a>/g;
const SEO_LINKS_BLOCK_PATTERN =
  /<div\b[^>]*data-sentry-component="SeoLinks"[\s\S]*?<\/div>/;

const publicRootCategoryItemsCache = new Map<
  string,
  Promise<TraderaListingFormCategoryPickerItem[]>
>();
const publicCategoryChildItemsCache = new Map<
  string,
  Promise<TraderaListingFormCategoryPickerItem[]>
>();
const publicCategoryPathItemCache = new Map<
  string,
  Promise<TraderaListingFormCategoryPickerItem | null>
>();

const normalizeCategoryName = (value: string): string =>
  value.replace(/\s+/g, ' ').trim().toLowerCase();

const decodeCategoryName = (value: string): string => {
  try {
    const decoded = JSON.parse(`"${value}"`) as unknown;
    return typeof decoded === 'string' ? decoded.replace(/&amp;/g, '&') : value;
  } catch {
    return value.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
  }
};

const decodeHtmlText = (value: string): string =>
  value
    .replace(/<[^>]*>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10))
    )
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, String.fromCodePoint(39))
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const readActiveCategoryChildrenSource = (html: string): string | null =>
  html.match(ACTIVE_CATEGORY_CHILDREN_PATTERN)?.groups?.['children'] ?? null;

const readChildCategoryPatternMatch = (
  match: RegExpMatchArray
): TraderaListingFormCategoryPickerItem | null => {
  const id = match.groups?.['id'] ?? '';
  const name = decodeCategoryName(match.groups?.['name'] ?? '').trim();
  return id.length > 0 && name.length > 0 ? { id, name } : null;
};

const readPublicCategoryLinkPatternMatch = (
  match: RegExpMatchArray
): TraderaListingFormCategoryPickerItem | null => {
  const id = match.groups?.['id'] ?? '';
  const name = decodeHtmlText(match.groups?.['name'] ?? '');
  return id.length > 0 && name.length > 0 ? { id, name } : null;
};

export const parseTraderaPublicCategoryChildItems = (
  html: string
): TraderaListingFormCategoryPickerItem[] => {
  const childrenSource = readActiveCategoryChildrenSource(html);
  if (childrenSource === null) return [];

  const seen = new Set<string>();
  const results: TraderaListingFormCategoryPickerItem[] = [];
  for (const match of childrenSource.matchAll(CHILD_CATEGORY_PATTERN)) {
    const category = readChildCategoryPatternMatch(match);
    if (category === null || seen.has(category.id)) continue;

    seen.add(category.id);
    results.push(category);
  }

  return results;
};

export const parseTraderaPublicCategoryLinkItems = (
  html: string
): TraderaListingFormCategoryPickerItem[] => {
  const source = html.match(SEO_LINKS_BLOCK_PATTERN)?.[0] ?? html;
  const seen = new Set<string>();
  const results: TraderaListingFormCategoryPickerItem[] = [];

  for (const match of source.matchAll(PUBLIC_CATEGORY_LINK_PATTERN)) {
    const category = readPublicCategoryLinkPatternMatch(match);
    if (category === null || seen.has(category.id)) continue;

    seen.add(category.id);
    results.push(category);
  }

  return results;
};

export const mergeTraderaPublicCategoryChildItems = (
  items: TraderaListingFormCategoryPickerItem[],
  publicItems: TraderaListingFormCategoryPickerItem[]
): TraderaListingFormCategoryPickerItem[] => {
  const publicItemsByName = new Map(
    publicItems.map((item) => [normalizeCategoryName(item.name), item])
  );

  return items.map((item) => {
    if (item.id.length > 0) return item;

    const publicItem = publicItemsByName.get(normalizeCategoryName(item.name));
    return publicItem === undefined ? item : { ...item, id: publicItem.id };
  });
};

const canFetchPublicCategoryChildrenForParent = (
  parent: TraderaListingFormCategoryPickerItem
): boolean => /^\d+$/.test(parent.id);

const fetchTraderaPublicHtml = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Tradera public category request failed with status ${String(response.status)}`);
  }
  return response.text();
};

const fetchTraderaPublicCategoryChildItemsById = async (
  parentId: string
): Promise<TraderaListingFormCategoryPickerItem[]> => {
  let cached = publicCategoryChildItemsCache.get(parentId);
  if (cached !== undefined) return cached;

  cached = fetchTraderaPublicHtml(`${TRADERA_PUBLIC_CATEGORY_URL_PREFIX}${parentId}`)
    .then(parseTraderaPublicCategoryChildItems)
    .catch((error: unknown) => {
      publicCategoryChildItemsCache.delete(parentId);
      throw error;
    });
  publicCategoryChildItemsCache.set(parentId, cached);
  return cached;
};

const fetchTraderaPublicRootCategoryItems = async (): Promise<
  TraderaListingFormCategoryPickerItem[]
> => {
  let cached = publicRootCategoryItemsCache.get(TRADERA_PUBLIC_HOME_URL);
  if (cached !== undefined) return cached;

  cached = fetchTraderaPublicHtml(TRADERA_PUBLIC_HOME_URL)
    .then(parseTraderaPublicCategoryLinkItems)
    .catch((error: unknown) => {
      publicRootCategoryItemsCache.delete(TRADERA_PUBLIC_HOME_URL);
      throw error;
    });
  publicRootCategoryItemsCache.set(TRADERA_PUBLIC_HOME_URL, cached);
  return cached;
};

const findTraderaPublicCategoryByName = (
  items: TraderaListingFormCategoryPickerItem[],
  name: string
): TraderaListingFormCategoryPickerItem | null => {
  const normalizedName = normalizeCategoryName(name);
  if (normalizedName.length === 0) return null;

  return (
    items.find((item) => normalizeCategoryName(item.name) === normalizedName) ?? null
  );
};

const buildTraderaPublicCategoryPathKey = (
  path: TraderaListingFormCategoryPickerItem[]
): string =>
  path
    .map((item) =>
      /^\d+$/.test(item.id)
        ? `id:${item.id}`
        : `name:${normalizeCategoryName(item.name)}`
    )
    .join('>');

/* eslint-disable no-await-in-loop -- Public category path resolution must fetch each parent before matching its child. */
export const resolveTraderaPublicCategoryItemForPath = async (
  path: TraderaListingFormCategoryPickerItem[]
): Promise<TraderaListingFormCategoryPickerItem | null> => {
  const cachedKey = buildTraderaPublicCategoryPathKey(path);
  const cached = publicCategoryPathItemCache.get(cachedKey);
  if (cached !== undefined) return cached;

  const resolution = (async (): Promise<TraderaListingFormCategoryPickerItem | null> => {
    const first = path[0];
    if (first === undefined) return null;

    let current = canFetchPublicCategoryChildrenForParent(first)
      ? first
      : findTraderaPublicCategoryByName(await fetchTraderaPublicRootCategoryItems(), first.name);
    if (current === null) return null;

    for (const next of path.slice(1)) {
      if (canFetchPublicCategoryChildrenForParent(next)) {
        current = next;
        continue;
      }

      const children = await fetchTraderaPublicCategoryChildItems(current);
      current = findTraderaPublicCategoryByName(children, next.name);
      if (current === null) return null;
    }

    return current;
  })().catch((error: unknown) => {
    publicCategoryPathItemCache.delete(cachedKey);
    throw error;
  });
  publicCategoryPathItemCache.set(cachedKey, resolution);
  const resolved = await resolution;
  if (resolved === null) {
    publicCategoryPathItemCache.delete(cachedKey);
  }
  return resolved;
};
/* eslint-enable no-await-in-loop */

export const fetchTraderaPublicCategoryChildItemsForPath = async (
  path: TraderaListingFormCategoryPickerItem[]
): Promise<TraderaListingFormCategoryPickerItem[]> => {
  const parent = await resolveTraderaPublicCategoryItemForPath(path);
  return parent === null ? [] : fetchTraderaPublicCategoryChildItems(parent);
};

export const fetchTraderaPublicCategoryChildItems = async (
  parent: TraderaListingFormCategoryPickerItem
): Promise<TraderaListingFormCategoryPickerItem[]> => {
  if (!canFetchPublicCategoryChildrenForParent(parent)) return [];
  return fetchTraderaPublicCategoryChildItemsById(parent.id);
};

export const enrichTraderaListingFormCategoryItemsFromPublicPage = async ({
  items,
  parent,
  path,
}: {
  items: TraderaListingFormCategoryPickerItem[];
  parent: TraderaListingFormCategoryPickerItem;
  path?: TraderaListingFormCategoryPickerItem[];
}): Promise<TraderaListingFormCategoryPickerItem[]> => {
  if (items.every((item) => item.id.length > 0)) {
    return items;
  }

  const publicItems =
    path === undefined
      ? await fetchTraderaPublicCategoryChildItems(parent)
      : await fetchTraderaPublicCategoryChildItemsForPath(path);
  return mergeTraderaPublicCategoryChildItems(items, publicItems);
};

export const clearTraderaPublicCategoryPageCache = (): void => {
  publicRootCategoryItemsCache.clear();
  publicCategoryChildItemsCache.clear();
  publicCategoryPathItemCache.clear();
};
