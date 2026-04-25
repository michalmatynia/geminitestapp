import type { Locator, Page } from 'playwright';

import {
  extractTraderaListingFormCategoryPickerItems,
  TRADERA_LISTING_FORM_CATEGORY_PICKER_ITEM_SELECTOR,
  TRADERA_LISTING_FORM_CATEGORY_PICKER_ROOT_SELECTORS,
  type TraderaListingFormCategoryPickerItem,
} from './tradera-listing-form-category-picker';
import { extractTraderaListingFormPostSelectionTextCategoryItems } from './tradera-listing-form-category-post-selection-text';

const PICKER_UPDATE_TIMEOUT_MS = 8_000;
const PICKER_UPDATE_POLL_MS = 250;
const PICKER_CLOSED_CONFIRMATION_MS = 700;
const PICKER_BREADCRUMB_SELECTOR = [
  'nav[aria-label="Breadcrumb"] button',
  'nav[aria-label="Breadcrumb"] li',
  'nav[aria-label="Brödsmulor"] button',
  'nav[aria-label="Brödsmulor"] li',
  '[data-testid*="breadcrumb" i] button',
  '[data-testid*="breadcrumb" i] li',
  '[aria-label*="breadcrumb" i] button',
  '[aria-label*="breadcrumb" i] li',
].join(', ');
const POST_SELECTION_CATEGORY_ITEM_SELECTOR = [
  'button',
  'a[href]',
  'li',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="radio"]',
  '[data-category-id]',
  '[data-id]',
  '[data-value]',
].join(', ');

type WaitFn = (ms: number) => Promise<void>;

type PickerUpdateInput = {
  optionsBefore: string[];
  page: Page;
  wait: WaitFn;
  timeoutMs?: number;
};

export type TraderaListingFormCategoryPickerUpdateResult = {
  pickerVisible: boolean;
  updated: boolean;
  options: string[];
  breadcrumbs: string[];
};

const normalizePickerText = (value: string): string =>
  value.replace(/\s+/g, ' ').trim().toLowerCase();

const hasPickerOptionsChanged = (before: Set<string>, after: string[]): boolean => {
  const normalizedAfter = after.map(normalizePickerText).filter(Boolean);
  if (normalizedAfter.length === 0) return false;
  if (before.size !== normalizedAfter.length) return true;

  return normalizedAfter.some((name) => !before.has(name));
};

export const shouldUseReopenedTraderaListingFormCategoryPickerItems = ({
  clickedName,
  nextName,
  optionsBefore,
  reopenedItems,
}: {
  clickedName: string;
  nextName: string | null;
  optionsBefore: string[];
  reopenedItems: TraderaListingFormCategoryPickerItem[];
}): boolean => {
  const reopenedNames = reopenedItems.map((item) => item.name);
  const reopenedNameSet = new Set(reopenedNames.map(normalizePickerText).filter(Boolean));
  if (reopenedNameSet.size === 0) return false;

  const before = new Set(optionsBefore.map(normalizePickerText).filter(Boolean));
  if (!hasPickerOptionsChanged(before, reopenedNames)) return false;

  const clicked = normalizePickerText(clickedName);
  if (clicked.length > 0 && reopenedNameSet.has(clicked)) return false;

  const next = nextName === null ? '' : normalizePickerText(nextName);
  return next.length === 0 || reopenedNameSet.has(next);
};

export const filterTraderaListingFormPostSelectionCategoryItems = ({
  items,
  nextName,
  optionsBefore,
  pathNames,
}: {
  items: TraderaListingFormCategoryPickerItem[];
  nextName: string | null;
  optionsBefore: string[];
  pathNames: string[];
}): TraderaListingFormCategoryPickerItem[] => {
  const ignoredNames = new Set([
    ...optionsBefore.map(normalizePickerText),
    ...pathNames.map(normalizePickerText),
  ].filter(Boolean));
  const results = items.filter((item) => !ignoredNames.has(normalizePickerText(item.name)));
  const next = nextName === null ? '' : normalizePickerText(nextName);
  if (next.length === 0) return results;

  return results.some((item) => normalizePickerText(item.name) === next)
    ? results
    : [];
};

const dedupeTraderaListingFormCategoryItems = (
  items: TraderaListingFormCategoryPickerItem[]
): TraderaListingFormCategoryPickerItem[] => {
  const seen = new Set<string>();
  const results: TraderaListingFormCategoryPickerItem[] = [];

  for (const item of items) {
    const key =
      item.id.length > 0 ? `id:${item.id}` : `name:${normalizePickerText(item.name)}`;
    if (seen.has(key)) continue;

    seen.add(key);
    results.push(item);
  }

  return results;
};

const buildClosedUpdateResult = (): TraderaListingFormCategoryPickerUpdateResult => ({
  pickerVisible: false,
  updated: false,
  options: [],
  breadcrumbs: [],
});

const isVisiblePickerTextElement = (element: Element): element is HTMLElement => {
  if (!(element instanceof HTMLElement)) return false;
  if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false;

  const style = window.getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none';
};

const getVisiblePickerElementText = (element: HTMLElement): string =>
  element.textContent.replace(/\s+/g, ' ').trim();

const readVisiblePickerText = (elements: Element[]): string[] => {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const element of elements) {
    if (!isVisiblePickerTextElement(element)) continue;

    const text = getVisiblePickerElementText(element);
    const normalized = text.toLowerCase();
    if (text.length === 0 || seen.has(normalized)) continue;

    seen.add(normalized);
    results.push(text);
  }

  return results;
};

/* eslint-disable no-await-in-loop -- Picker state is observed serially because each click may re-render or close the active picker. */
export const findVisibleTraderaListingFormCategoryPickerRoot = async (
  page: Page
): Promise<Locator | null> => {
  for (const selector of TRADERA_LISTING_FORM_CATEGORY_PICKER_ROOT_SELECTORS) {
    const root = page.locator(selector).first();
    const visible = await root.isVisible({ timeout: 500 }).catch(() => false);
    if (visible) return root;
  }

  return null;
};

export const isTraderaListingFormCategoryPickerVisible = async (
  page: Page
): Promise<boolean> =>
  (await findVisibleTraderaListingFormCategoryPickerRoot(page)) !== null;

export const readTraderaListingFormCategoryPickerItems = async (
  page: Page
): Promise<TraderaListingFormCategoryPickerItem[]> => {
  const picker = await findVisibleTraderaListingFormCategoryPickerRoot(page);
  if (picker === null) return [];

  return picker
    .locator(TRADERA_LISTING_FORM_CATEGORY_PICKER_ITEM_SELECTOR)
    .evaluateAll(extractTraderaListingFormCategoryPickerItems)
    .catch(() => []);
};

export const readTraderaListingFormCategoryPickerOptionNames = async (
  page: Page
): Promise<string[]> =>
  (await readTraderaListingFormCategoryPickerItems(page)).map((item) => item.name);

export const readTraderaListingFormCategoryPickerBreadcrumbs = async (
  page: Page
): Promise<string[]> => {
  const picker = await findVisibleTraderaListingFormCategoryPickerRoot(page);
  if (picker === null) return [];

  return picker
    .locator(PICKER_BREADCRUMB_SELECTOR)
    .evaluateAll(readVisiblePickerText)
    .catch(() => []);
};

export const readTraderaListingFormPostSelectionCategoryItems = async ({
  nextName,
  optionsBefore,
  page,
  path,
}: {
  nextName: string | null;
  optionsBefore: string[];
  page: Page;
  path: TraderaListingFormCategoryPickerItem[];
}): Promise<TraderaListingFormCategoryPickerItem[]> => {
  const main = page.locator('main').first();
  const scope = (await main.isVisible({ timeout: 500 }).catch(() => false))
    ? main
    : page.locator('body').first();
  const items = await scope
    .locator(POST_SELECTION_CATEGORY_ITEM_SELECTOR)
    .evaluateAll(extractTraderaListingFormCategoryPickerItems)
    .catch(() => []);
  const text = await scope
    .evaluate((element) =>
      element instanceof HTMLElement ? element.innerText : element.textContent
    )
    .catch(() => '');

  const elementItems = filterTraderaListingFormPostSelectionCategoryItems({
    items,
    nextName,
    optionsBefore,
    pathNames: path.map((item) => item.name),
  });
  const textItems = extractTraderaListingFormPostSelectionTextCategoryItems({
    nextName,
    optionsBefore,
    pathNames: path.map((item) => item.name),
    text,
  });

  return filterTraderaListingFormPostSelectionCategoryItems({
    items: dedupeTraderaListingFormCategoryItems([...elementItems, ...textItems]),
    nextName,
    optionsBefore: [],
    pathNames: [],
  });
};

const pollClosedPickerState = async ({
  closedSince,
  wait,
}: {
  closedSince: number | null;
  wait: WaitFn;
}): Promise<number | 'closed'> => {
  const nextClosedSince = closedSince ?? Date.now();
  if (Date.now() - nextClosedSince >= PICKER_CLOSED_CONFIRMATION_MS) {
    return 'closed';
  }

  await wait(PICKER_UPDATE_POLL_MS);
  return nextClosedSince;
};

const readVisiblePickerUpdate = async ({
  before,
  page,
}: {
  before: Set<string>;
  page: Page;
}): Promise<TraderaListingFormCategoryPickerUpdateResult> => {
  const options = await readTraderaListingFormCategoryPickerOptionNames(page);
  const breadcrumbs = await readTraderaListingFormCategoryPickerBreadcrumbs(page);

  return {
    pickerVisible: true,
    updated: hasPickerOptionsChanged(before, options),
    options,
    breadcrumbs,
  };
};

export const waitForTraderaListingFormCategoryPickerUpdate = async ({
  optionsBefore,
  page,
  wait,
  timeoutMs = PICKER_UPDATE_TIMEOUT_MS,
}: PickerUpdateInput): Promise<TraderaListingFormCategoryPickerUpdateResult> => {
  const before = new Set(optionsBefore.map(normalizePickerText).filter(Boolean));
  const deadline = Date.now() + timeoutMs;
  let closedSince: number | null = null;
  let latestOptions: string[] = [];
  let latestBreadcrumbs: string[] = [];

  while (Date.now() < deadline) {
    const picker = await findVisibleTraderaListingFormCategoryPickerRoot(page);
    if (picker === null) {
      const closedState = await pollClosedPickerState({ closedSince, wait });
      if (closedState === 'closed') return buildClosedUpdateResult();
      closedSince = closedState;
      continue;
    }

    closedSince = null;
    const update = await readVisiblePickerUpdate({ before, page });
    latestOptions = update.options;
    latestBreadcrumbs = update.breadcrumbs;
    if (update.updated) return update;

    await wait(PICKER_UPDATE_POLL_MS);
  }

  const pickerVisible = await isTraderaListingFormCategoryPickerVisible(page);
  return {
    pickerVisible,
    updated: false,
    options: pickerVisible ? latestOptions : [],
    breadcrumbs: pickerVisible ? latestBreadcrumbs : [],
  };
};
/* eslint-enable no-await-in-loop */
