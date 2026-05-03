import type { Locator, Page } from 'playwright';

import { TRADERA_LISTING_FORM_CATEGORY_PICKER_ROOT_SELECTORS } from './tradera-listing-form-category-picker';
export {
  acceptTraderaListingFormCategoryCookies,
  isOnTraderaListingFormAuthPage,
} from './tradera-listing-form-category-session';
import {
  findVisibleTraderaListingFormCategoryPickerRoot,
  isTraderaListingFormCategoryPickerVisible,
  readTraderaListingFormCategoryPickerItems,
} from './tradera-listing-form-category-picker-state';

export { findVisibleTraderaListingFormCategoryPickerRoot, isTraderaListingFormCategoryPickerVisible, readTraderaListingFormCategoryPickerItems };

const CATEGORY_TRIGGER_LABELS = [
  'Category',
  'Kategori',
  'Choose category',
  'Select category',
  'Välj kategori',
] as const;
const CATEGORY_TRIGGER_LABEL_PATTERN =
  /category|kategori|choose category|select category|välj kategori/i;
const CATEGORY_TRIGGER_FORM_SELECTORS = [
  '[data-verify-test-category-picker-trigger-syi="true"]',
  '[data-test-category-chooser="true"] [aria-haspopup="menu"]',
  '[data-validation-error-anchor="category"] [aria-haspopup="menu"]',
] as const;
const CATEGORY_TRIGGER_FALLBACK_SELECTORS = [
  'button:has-text("Category")',
  'button:has-text("Kategori")',
  'button[aria-haspopup="dialog"]',
  'button[aria-haspopup="menu"]',
  '[role="button"][aria-haspopup="dialog"]',
  '[role="button"][aria-haspopup="menu"]',
  '[role="combobox"]',
] as const;

const PICKER_SETTLE_MS = 450;
const PICKER_OPEN_TIMEOUT_MS = 5_000;
const PICKER_OPEN_POLL_MS = 250;
const ITEM_CLICK_SETTLE_MS = 250;
const PICKER_NAVIGATION_CHROME_SELECTOR = [
  'nav[aria-label="Breadcrumb"]',
  'nav[aria-label="Brödsmulor"]',
  '[data-testid*="breadcrumb" i]',
  '[aria-label*="breadcrumb" i]',
].join(', ');
const PICKER_SAFE_LINK_CONTAINER_SELECTOR = [
  '[role="menu"]',
  '[role="listbox"]',
  '[role="dialog"]',
  '[aria-modal="true"]',
  '[data-radix-popper-content-wrapper]',
  '[data-test-category-chooser="true"]',
].join(', ');

type WaitFn = (ms: number) => Promise<void>;

type PageAutomationInput = {
  page: Page;
  wait: WaitFn;
};

const waitForVisibleCategoryPicker = async (
  input: PageAutomationInput,
  timeoutMs = PICKER_OPEN_TIMEOUT_MS
): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isTraderaListingFormCategoryPickerVisible(input.page)) return true;
    await input.wait(PICKER_OPEN_POLL_MS);
  }

  return isTraderaListingFormCategoryPickerVisible(input.page);
};

export const TRADERA_LISTING_FORM_CATEGORY_PICKER_DIAGNOSTIC_SELECTORS = [
  ...TRADERA_LISTING_FORM_CATEGORY_PICKER_ROOT_SELECTORS,
];

/* eslint-disable no-await-in-loop -- Browser picker probing and tree traversal must happen serially because each click mutates the open picker state. */
const clickTriggerCandidate = async (
  locator: Locator,
  input: PageAutomationInput
): Promise<boolean> => {
  const visible = await locator.isVisible({ timeout: 1_000 }).catch(() => false);
  if (!visible) return false;

  await locator.click().catch(() => undefined);
  await input.wait(PICKER_SETTLE_MS);
  if (await waitForVisibleCategoryPicker(input, 1_500)) return true;

  await locator.scrollIntoViewIfNeeded().catch(() => undefined);
  await locator.click({ force: true, timeout: 2_000 }).catch(() => undefined);
  await input.wait(PICKER_SETTLE_MS);
  return waitForVisibleCategoryPicker(input);
};

export const openTraderaListingFormCategoryPicker = async (
  input: PageAutomationInput
): Promise<boolean> => {
  const existingRoot = await findVisibleTraderaListingFormCategoryPickerRoot(input.page);
  if (existingRoot !== null) return true;

  for (const selector of CATEGORY_TRIGGER_FORM_SELECTORS) {
    const trigger = input.page.locator(selector).first();
    if (await clickTriggerCandidate(trigger, input)) return true;
  }

  for (const role of ['button', 'combobox'] as const) {
    const trigger = input.page
      .getByRole(role, { name: CATEGORY_TRIGGER_LABEL_PATTERN })
      .first();
    if (await clickTriggerCandidate(trigger, input)) return true;
  }

  for (const label of CATEGORY_TRIGGER_LABELS) {
    const escaped = label.replace(/"/g, '\\"');
    const trigger = input.page
      .locator(
        `xpath=//*[normalize-space(text())="${escaped}"]/following::*[self::button or @role="button" or @role="combobox"][1]`
      )
      .first();
    if (await clickTriggerCandidate(trigger, input)) return true;
  }

  for (const selector of CATEGORY_TRIGGER_FALLBACK_SELECTORS) {
    const fallbackTrigger = input.page.locator(selector).first();
    if (await clickTriggerCandidate(fallbackTrigger, input)) return true;
  }

  return false;
};

export const closeTraderaListingFormCategoryPicker = async (
  input: PageAutomationInput
): Promise<void> => {
  await input.page.keyboard.press('Escape').catch(() => undefined);
  await input.wait(350);
};

const canClickPickerCandidate = async (locator: Locator): Promise<boolean> => {
  const visible = await locator.isVisible({ timeout: 800 }).catch(() => false);
  if (!visible) return false;

  const isNavigationChrome = await locator
    .evaluate((element, selector) => Boolean(element.closest(selector)), PICKER_NAVIGATION_CHROME_SELECTOR)
    .catch(() => true);
  if (isNavigationChrome) return false;

  const href = await locator.getAttribute('href').catch(() => null);
  if (href === null || !/\/category\/\d+/i.test(href)) return true;

  return locator
    .evaluate((element, pickerContainerSelector) => {
      const role = element.getAttribute('role')?.toLowerCase();
      const insidePicker = Boolean(element.closest(pickerContainerSelector));
      const clickableRoles = ['menuitem', 'menuitemradio', 'option', 'radio', 'link'];
      return (
        insidePicker ||
        element.tagName.toLowerCase() === 'button' ||
        clickableRoles.includes(role ?? '') ||
        element.getAttribute('aria-haspopup') !== null
      );
    }, PICKER_SAFE_LINK_CONTAINER_SELECTOR)
    .catch(() => false);
};

const clickPickerCandidate = async (
  locator: Locator,
  wait: WaitFn
): Promise<boolean> => {
  if (!(await canClickPickerCandidate(locator))) return false;

  await locator.scrollIntoViewIfNeeded().catch(() => undefined);
  await locator.click();
  await wait(ITEM_CLICK_SETTLE_MS);
  return true;
};

export const clickTraderaListingFormCategoryPickerItemByName = async ({
  name,
  page,
  wait,
}: PageAutomationInput & { name: string }): Promise<boolean> => {
  const picker = await findVisibleTraderaListingFormCategoryPickerRoot(page);
  if (picker === null) return false;

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const roleCandidates = [
    { role: 'menuitem', exact: true },
    { role: 'menuitemradio', exact: true },
    { role: 'option', exact: true },
    { role: 'radio', exact: true },
    { role: 'link', exact: true },
    { role: 'button', exact: true },
    { role: 'menuitem', exact: false },
    { role: 'menuitemradio', exact: false },
    { role: 'option', exact: false },
    { role: 'radio', exact: false },
    { role: 'link', exact: false },
    { role: 'button', exact: false },
  ] as const;

  for (const candidate of roleCandidates) {
    const pattern = candidate.exact
      ? new RegExp(`^${escaped}$`, 'i')
      : new RegExp(escaped, 'i');
    const locator = picker.getByRole(candidate.role, { name: pattern }).first();
    if (await clickPickerCandidate(locator, wait)) return true;
  }

  const textFallback = picker
    .locator(
      `xpath=.//*[normalize-space(text())="${name.replace(/"/g, '\\"')}"]/ancestor-or-self::*[self::button or self::a or @role="button" or @role="link" or @role="menuitem" or @role="menuitemradio" or @role="option" or @role="radio"][1]`
    )
    .first();
  return clickPickerCandidate(textFallback, wait);
};

/* eslint-enable no-await-in-loop */
