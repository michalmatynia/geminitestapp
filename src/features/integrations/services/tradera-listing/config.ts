export const LOGIN_SUCCESS_SELECTOR = [
  'a[href*="logout"]',
  'a:has-text("Logga ut")',
  'a:has-text("Logout")',
  'a:has-text("Mina sidor")',
  'a:has-text("My pages")',
  'a[href*="/profile"]',
].join(', ');

export const LOGIN_FORM_SELECTOR = [
  '#sign-in-form',
  'form[data-sign-in-form="true"]',
  'form[action*="login"]',
].join(', ');

export const USERNAME_SELECTORS = ['#email', 'input[name="email"]', 'input[type="email"]'];
export const PASSWORD_SELECTORS = ['#password', 'input[name="password"]', 'input[type="password"]'];
export const LOGIN_BUTTON_SELECTORS = [
  'button[data-login-submit="true"]',
  '#sign-in-form button[type="submit"]',
  'button:has-text("Sign in")',
  'button:has-text("Logga in")',
];

export const TITLE_SELECTORS = ['input[name="title"]', '#title', '[data-testid*="title"] input'];
export const DESCRIPTION_SELECTORS = [
  'textarea[name="description"]',
  '#description',
  '[data-testid*="description"] textarea',
];
export const PRICE_SELECTORS = ['input[name="price"]', '#price', 'input[data-testid*="price"]'];
export const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'button:has-text("Publicera")',
  'button:has-text("Publish")',
  'button:has-text("Lägg upp")',
];

export const DEFAULT_TRADERA_API_CATEGORY_ID = 344481;
export const DEFAULT_TRADERA_API_PAYMENT_CONDITION =
  process.env['TRADERA_API_DEFAULT_PAYMENT_CONDITION'] ?? 'Payment within 3 days';
export const DEFAULT_TRADERA_API_SHIPPING_CONDITION =
  process.env['TRADERA_API_DEFAULT_SHIPPING_CONDITION'] ?? 'Shipping paid by buyer';

export type TraderaFailureCategory = 'AUTH' | 'FORM' | 'SELECTOR' | 'NAVIGATION' | 'UNKNOWN';
