export const VINTED_LOGIN_SUCCESS_SELECTORS = [
  'button[aria-label*="Profil"], button[aria-label*="Profile"], .c-header__item--user',
  'a[href*="/member/"]',
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
  '#category_id',
  '.c-category-select',
  'div:has-text("Kategoria")',
  'div:has-text("Category")',
];

export const VINTED_BRAND_SELECTORS = [
  '#brand_id',
  'input[name="brand_id"]',
  'div:has-text("Marka")',
  'div:has-text("Brand")',
];

export const VINTED_SIZE_SELECTORS = [
  '#size_id',
  'div:has-text("Rozmiar")',
  'div:has-text("Size")',
];

export const VINTED_CONDITION_SELECTORS = [
  '#status_id',
  'div:has-text("Stan")',
  'div:has-text("Condition")',
];

export const VINTED_SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'button:has-text("Dodaj")',
  'button:has-text("Add")',
];

export const VINTED_LISTING_FORM_URL = 'https://www.vinted.pl/items/new';
