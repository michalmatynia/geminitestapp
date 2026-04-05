export const TRADERA_LOGIN_SUCCESS_SELECTORS = [
  'a[href*="logout"]',
  'a:has-text("Logga ut")',
  'a:has-text("Logout")',
  'a:has-text("Mina sidor")',
  'a:has-text("My pages")',
  'button[aria-label*="Account"]',
  'button[aria-label*="Profile"]',
  'a[href*="/profile"]',
  'a[href*="/my"]',
] as const;

export const LOGIN_SUCCESS_SELECTOR = TRADERA_LOGIN_SUCCESS_SELECTORS.join(', ');

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

export const TRADERA_COOKIE_ACCEPT_SELECTORS = [
  '#onetrust-accept-btn-handler',
  'button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  'button:has-text("Accept all cookies")',
  'button:has-text("Accept all")',
  'button:has-text("Acceptera alla cookies")',
  'button:has-text("Acceptera alla kakor")',
  'button:has-text("Godkänn alla cookies")',
  'button:has-text("Tillåt alla cookies")',
] as const;

export const TRADERA_AUTH_ERROR_SELECTORS = [
  '[data-testid*="error"]',
  '[data-test*="error"]',
  '[role="alert"]',
  '.alert',
  '.form-error',
  '.error',
  '.text-red-500',
] as const;

export const TRADERA_CAPTCHA_HINTS = [
  'captcha',
  'recaptcha',
  'fylla i captcha',
  'captcha:n',
] as const;

export const TRADERA_MANUAL_VERIFICATION_TEXT_HINTS = [
  ...TRADERA_CAPTCHA_HINTS,
  'verification',
  'verify',
  'manual verification',
  'security check',
  'two-factor',
  '2fa',
  'bankid',
  'engangskod',
  'säkerhetskontroll',
] as const;

export const TRADERA_MANUAL_VERIFICATION_URL_HINTS = [
  '/challenge',
  '/captcha',
  '/verify',
  '/verification',
  '/multifactorauthentication',
  '/bankid',
  '/two-factor',
  '/2fa',
] as const;

export const TITLE_SELECTORS = [
  'input[name="shortDescription"]',
  '#shortDescription',
  'input[name="title"]',
  '#title',
  '[data-testid*="title"] input',
  'input[placeholder*="headline" i]',
];
export const DESCRIPTION_SELECTORS = [
  '#tip-tap-editor',
  '[aria-label="Description"][contenteditable="true"]',
  'textarea[name="description"]',
  '#description',
  '[data-testid*="description"] textarea',
  '[contenteditable="true"]',
  '[role="textbox"][contenteditable="true"]',
];
export const PRICE_SELECTORS = [
  'input[name="price_fixedPrice"]',
  '#price_fixedPrice',
  'input[name="price"]',
  '#price',
  'input[data-testid*="price"]',
  'input[inputmode="decimal"]',
  'input[placeholder*="price" i]',
];
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
