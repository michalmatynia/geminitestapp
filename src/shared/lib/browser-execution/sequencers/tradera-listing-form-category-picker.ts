export type TraderaListingFormCategoryPickerItem = {
  name: string;
  id: string;
};

export const TRADERA_LISTING_FORM_CATEGORY_PICKER_ITEM_SELECTOR = [
  '[role="menuitem"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="radio"]',
  'a[href]',
  'button',
  '[data-category-id]',
  '[data-test-category-id]',
  '[data-id]',
  '[data-value]',
].join(', ');

export const TRADERA_LISTING_FORM_CATEGORY_PICKER_ROOT_SELECTORS = [
  '[data-test-category-chooser="true"]',
  `[data-testid*="category" i]:has(${TRADERA_LISTING_FORM_CATEGORY_PICKER_ITEM_SELECTOR})`,
  `[data-test*="category" i]:has(${TRADERA_LISTING_FORM_CATEGORY_PICKER_ITEM_SELECTOR})`,
  `[aria-label*="category" i]:has(${TRADERA_LISTING_FORM_CATEGORY_PICKER_ITEM_SELECTOR})`,
  `[aria-label*="kategori" i]:has(${TRADERA_LISTING_FORM_CATEGORY_PICKER_ITEM_SELECTOR})`,
  `[data-radix-popper-content-wrapper]:has(${TRADERA_LISTING_FORM_CATEGORY_PICKER_ITEM_SELECTOR})`,
  `[role="dialog"]:has(${TRADERA_LISTING_FORM_CATEGORY_PICKER_ITEM_SELECTOR})`,
  `[role="menu"]:has(${TRADERA_LISTING_FORM_CATEGORY_PICKER_ITEM_SELECTOR})`,
  `[role="listbox"]:has(${TRADERA_LISTING_FORM_CATEGORY_PICKER_ITEM_SELECTOR})`,
] as const;

/* eslint-disable max-lines-per-function, complexity -- Playwright serializes this DOM helper into the browser context, so its small helpers must stay inline. */
export function extractTraderaListingFormCategoryPickerItems(
  elements: Element[]
): TraderaListingFormCategoryPickerItem[] {
  const seen = new Set<string>();
  const ignoredLabels = new Set([
    '0 %',
    '7 days',
    'back',
    'choose',
    'close',
    'listing details',
    'listing ends',
    'listing format',
    'more options',
    'optional',
    'preview',
    'publish',
    'stäng',
    'tillbaka',
    'vat',
  ]);
  const results: TraderaListingFormCategoryPickerItem[] = [];

  for (const element of elements) {
    if (!(element instanceof HTMLElement)) continue;
    if (element.hidden || element.getAttribute('aria-hidden') === 'true') continue;

    const style = window.getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none') continue;

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    const navigationChrome = element.closest(
      [
        'nav[aria-label="Breadcrumb"]',
        'nav[aria-label="Brödsmulor"]',
        '[data-testid*="breadcrumb" i]',
        '[aria-label*="breadcrumb" i]',
      ].join(', ')
    );
    if (navigationChrome !== null) continue;

    const rawName =
      element.getAttribute('aria-label') ??
        element.getAttribute('title') ??
        element.textContent;
    const name =
      typeof rawName === 'string' ? rawName.replace(/\s+/g, ' ').trim() : '';
    const normalizedName = name.toLowerCase();
    if (
      name.length === 0 ||
      ignoredLabels.has(normalizedName) ||
      normalizedName.startsWith('7 days') ||
      normalizedName.startsWith('publish ') ||
      seen.has(normalizedName)
    ) {
      continue;
    }

    const explicitId =
      element.getAttribute('data-category-id') ??
      element.getAttribute('data-test-category-id') ??
      element.getAttribute('data-id') ??
      element.getAttribute('data-value') ??
      element.getAttribute('value') ??
      element.getAttribute('id') ??
      '';
    let id =
      typeof explicitId === 'string' ? explicitId.replace(/\s+/g, ' ').trim() : '';

    if (id.length === 0) {
      const href = element.getAttribute('href');
      const hrefMatch = typeof href === 'string' ? href.match(/\/category\/(\d+)(?:[/?#]|$)/i) : null;
      id = hrefMatch?.[1] ?? '';
    }

    seen.add(normalizedName);
    results.push({ name, id });
  }

  return results;
}
/* eslint-enable max-lines-per-function, complexity */
