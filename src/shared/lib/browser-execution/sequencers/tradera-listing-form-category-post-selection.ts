import type { Locator, Page } from 'playwright';

import type { TraderaListingFormCategoryPickerItem } from './tradera-listing-form-category-picker';
import { readTraderaListingFormPostSelectionCategoryItems } from './tradera-listing-form-category-picker-state';

const POST_SELECTION_CLICK_SETTLE_MS = 500;
const POST_SELECTION_NAVIGATION_CHROME_SELECTOR = [
  'nav[aria-label="Breadcrumb"]',
  'nav[aria-label="Brödsmulor"]',
  '[data-testid*="breadcrumb" i]',
  '[aria-label*="breadcrumb" i]',
  '[data-test-category-chooser="true"]',
].join(', ');
const POST_SELECTION_ROLE_CANDIDATES = [
  { role: 'button', exact: true },
  { role: 'link', exact: true },
  { role: 'menuitem', exact: true },
  { role: 'menuitemradio', exact: true },
  { role: 'option', exact: true },
  { role: 'radio', exact: true },
  { role: 'button', exact: false },
  { role: 'link', exact: false },
  { role: 'menuitem', exact: false },
  { role: 'menuitemradio', exact: false },
  { role: 'option', exact: false },
  { role: 'radio', exact: false },
] as const;

type WaitFn = (ms: number) => Promise<void>;

type PageAutomationInput = {
  page: Page;
  wait: WaitFn;
};

type PostSelectionClickInput = PageAutomationInput & {
  name: string;
  nextName: string | null;
  optionsBefore: string[];
  path: TraderaListingFormCategoryPickerItem[];
};

export type TraderaListingFormPostSelectionCategoryClickResult = {
  clicked: boolean;
  childItems: TraderaListingFormCategoryPickerItem[];
};

const normalizeName = (value: string): string =>
  value.replace(/\s+/g, ' ').trim().toLowerCase();

const containsCategoryItem = (
  items: TraderaListingFormCategoryPickerItem[],
  name: string
): boolean => {
  const normalizedName = normalizeName(name);
  return items.some((item) => normalizeName(item.name) === normalizedName);
};

const getPostSelectionScope = async (page: Page): Promise<Locator> => {
  const main = page.locator('main').first();
  return (await main.isVisible({ timeout: 500 }).catch(() => false))
    ? main
    : page.locator('body').first();
};

const canClickPostSelectionCandidate = async (locator: Locator): Promise<boolean> => {
  const visible = await locator.isVisible({ timeout: 800 }).catch(() => false);
  if (!visible) return false;

  return locator
    .evaluate(
      (element, selector) => !element.closest(selector),
      POST_SELECTION_NAVIGATION_CHROME_SELECTOR
    )
    .catch(() => false);
};

const clickPostSelectionCandidate = async (
  locator: Locator,
  wait: WaitFn
): Promise<boolean> => {
  if (!(await canClickPostSelectionCandidate(locator))) return false;

  await locator.scrollIntoViewIfNeeded().catch(() => undefined);
  await locator.click();
  await wait(POST_SELECTION_CLICK_SETTLE_MS);
  return true;
};

const readPostSelectionChildItems = async ({
  nextName,
  optionsBefore,
  page,
  path,
}: Omit<PostSelectionClickInput, 'name' | 'wait'>): Promise<
  TraderaListingFormCategoryPickerItem[]
> =>
  readTraderaListingFormPostSelectionCategoryItems({
    nextName,
    optionsBefore,
    page,
    path,
  });

const canAttemptPostSelectionClick = async ({
  name,
  page,
  path,
}: Omit<PostSelectionClickInput, 'nextName' | 'optionsBefore' | 'wait'>): Promise<boolean> => {
  const allowedItems = await readTraderaListingFormPostSelectionCategoryItems({
    nextName: name,
    optionsBefore: [],
    page,
    path: path.slice(0, -1),
  });
  return containsCategoryItem(allowedItems, name);
};

/* eslint-disable no-await-in-loop -- Role candidates must be tried serially so the first matching visible category option wins. */
const clickPostSelectionRoleCandidate = async ({
  escapedName,
  scope,
  wait,
}: {
  escapedName: string;
  scope: Locator;
  wait: WaitFn;
}): Promise<boolean> => {
  for (const candidate of POST_SELECTION_ROLE_CANDIDATES) {
    const pattern = candidate.exact
      ? new RegExp(`^${escapedName}$`, 'i')
      : new RegExp(escapedName, 'i');
    const locator = scope.getByRole(candidate.role, { name: pattern }).first();
    if (await clickPostSelectionCandidate(locator, wait)) return true;
  }

  return false;
};
/* eslint-enable no-await-in-loop */

const clickPostSelectionTextFallback = async ({
  name,
  scope,
  wait,
}: {
  name: string;
  scope: Locator;
  wait: WaitFn;
}): Promise<boolean> => {
  const textFallback = scope
    .locator(
      `xpath=.//*[normalize-space(text())="${name.replace(/"/g, '\\"')}"]/ancestor-or-self::*[self::button or self::a or self::li or @role="button" or @role="link" or @role="menuitem" or @role="menuitemradio" or @role="option" or @role="radio" or @data-category-id or @data-id or @data-value][1]`
    )
    .first();
  if (await clickPostSelectionCandidate(textFallback, wait)) return true;

  const exactTextFallback = scope
    .locator(`xpath=.//*[normalize-space(text())="${name.replace(/"/g, '\\"')}"]`)
    .first();
  return clickPostSelectionCandidate(exactTextFallback, wait);
};

export const clickAndReadTraderaListingFormPostSelectionCategoryItem = async ({
  name,
  nextName,
  optionsBefore,
  page,
  path,
  wait,
}: PostSelectionClickInput): Promise<TraderaListingFormPostSelectionCategoryClickResult> => {
  if (!(await canAttemptPostSelectionClick({ name, page, path }))) {
    return { clicked: false, childItems: [] };
  }

  const scope = await getPostSelectionScope(page);
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const clicked =
    (await clickPostSelectionRoleCandidate({ escapedName: escaped, scope, wait })) ||
    (await clickPostSelectionTextFallback({ name, scope, wait }));

  return {
    clicked,
    childItems: clicked ? await readPostSelectionChildItems({ nextName, optionsBefore, page, path }) : [],
  };
};
