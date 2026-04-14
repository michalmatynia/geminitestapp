export const VINTED_TITLE_SELECTORS = [
  'input[name="title"]',
  '#title',
  'input[placeholder*="title" i]',
  'input[aria-label*="title" i]',
];

export const VINTED_DESCRIPTION_SELECTORS = [
  'textarea[name="description"]',
  '#description',
  '[aria-label*="description" i]',
];

export const VINTED_PRICE_SELECTORS = [
  'input[name="price"]',
  '#price',
  '[data-testid*="price"] input',
];

export const VINTED_CATEGORY_SELECTORS = [
  '[data-testid="category-input"]',
  '#category_id',
];

export const VINTED_CATEGORY_OPTION_SELECTORS = [
  '[data-testid="category-option"]',
  '[role="menuitem"]',
];

export const VINTED_IMAGE_UPLOAD_SELECTORS = [
  'input[type="file"][accept*="image"]',
  'input[type="file"]',
];

export const VINTED_SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'button:has-text("Dodaj")',
  'button:has-text("Upload")',
];
