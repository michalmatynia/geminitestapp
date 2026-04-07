export const VINTED_LOGIN_SUCCESS_SELECTORS = [
  'button[aria-label*="Profil"], button[aria-label*="Profile"], .c-header__item--user',
  'a[href*="/settings"]',
  'button:has-text("Wyloguj")',
  'button:has-text("Log out")',
] as const;

export const VINTED_LOGIN_FORM_SELECTOR = [
  'form[action*="login"]',
  '.c-login-form',
].join(', ');

export const VINTED_USERNAME_SELECTORS = ['input[name="username"]', 'input[name="email"]', '#username', '#email'];
export const VINTED_PASSWORD_SELECTORS = ['input[name="password"]', '#password'];

export const VINTED_COOKIE_ACCEPT_SELECTORS = [
  '#onetrust-accept-btn-handler',
  'button:has-text("Akceptuję")',
  'button:has-text("Accept all")',
] as const;

export const VINTED_TITLE_SELECTORS = [
  'input[name="title"]',
  '#title',
  'input[placeholder*="np. Biała koszula"]',
  'input[placeholder*="e.g. White shirt"]',
];

export const VINTED_DESCRIPTION_SELECTORS = [
  'textarea[name="description"]',
  '#description',
  'textarea[placeholder*="np. kilka razy założona"]',
  'textarea[placeholder*="e.g. only worn a few times"]',
];

export const VINTED_PRICE_SELECTORS = [
  'input[name="price"]',
  '#price',
  'input[data-testid*="price"]',
];

export const VINTED_IMAGE_UPLOAD_SELECTORS = [
  'input[type="file"]',
  '#photos-input',
  '.c-file-input__input',
];

export const VINTED_CATEGORY_SELECTORS = [
  '[data-testid="category-select"]',
  '#category_id',
  '.c-category-select',
  'button[data-testid*="category"]',
  '[class*="category-select"]',
  'div[class*="CategorySelect"]',
];

// Vinted uses text input + autocomplete for brand selection
export const VINTED_BRAND_INPUT_SELECTORS = [
  'input[data-testid="brand-input"]',
  'input[name="brand_title"]',
  'input[placeholder*="Wyszukaj markę"]',
  'input[placeholder*="Search brand"]',
  'input[placeholder*="marka"]',
  'input[placeholder*="brand"]',
  '#brand_title',
];

// Trigger buttons that open brand selection dropdown
export const VINTED_BRAND_SELECTORS = [
  '[data-testid="brand-select"]',
  '#brand_id',
  'input[name="brand_id"]',
  '[class*="brand-select"]',
];

export const VINTED_BRAND_AUTOCOMPLETE_OPTION_SELECTORS = [
  '[data-testid="brand-option"]',
  '.c-autocomplete__item',
  '[class*="autocomplete"] li',
  '[role="option"]',
  '[class*="dropdown"] li',
];

export const VINTED_SIZE_SELECTORS = [
  '[data-testid="size-select"]',
  '#size_id',
  '[class*="size-select"]',
  'div:has-text("Rozmiar")',
  'div:has-text("Size")',
];

export const VINTED_CONDITION_SELECTORS = [
  '[data-testid="status-select"]',
  '[data-testid="condition-select"]',
  '#status_id',
  '[class*="condition-select"]',
  'div:has-text("Stan")',
  'div:has-text("Condition")',
];

export const VINTED_DROPDOWN_OPTION_SELECTORS = [
  '[data-testid="dropdown-option"]',
  '[role="option"]',
  '.c-select__option',
  '.c-dropdown__item',
  '[class*="dropdown-item"]',
  '[class*="select-option"]',
  'li[class*="item"]',
];

export const VINTED_SUBMIT_SELECTORS = [
  'button[data-testid="submit-listing"]',
  'button[type="submit"]',
  'button:has-text("Dodaj ogłoszenie")',
  'button:has-text("Dodaj")',
  'button:has-text("Add listing")',
  'button:has-text("Add")',
];

/** Regex to extract a Vinted listing ID from a URL like /items/1234567890-item-name */
export const VINTED_ITEM_URL_PATTERN = /\/items\/(\d+)/;

export const VINTED_LISTING_FORM_URL = 'https://www.vinted.pl/items/new';
