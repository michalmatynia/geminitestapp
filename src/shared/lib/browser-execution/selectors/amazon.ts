// ─── Google Lens ─────────────────────────────────────────────────────────────

export const GOOGLE_LENS_FILE_INPUT_SELECTORS = [
  'input[type="file"][accept*="image"]',
  'input[type="file"]',
];

export const GOOGLE_LENS_ENTRY_TRIGGER_SELECTORS = [
  'div[aria-label="Search by image"]',
  'button[aria-label="Search by image"]',
  'div[aria-label="Search with an image"]',
  'button[aria-label="Search with an image"]',
  'div[aria-label="Search with Google Lens"]',
  'button[aria-label="Search with Google Lens"]',
  'div[aria-label="Google Lens"]',
  'button[aria-label="Google Lens"]',
  'div[role="button"][aria-label*="image"]',
  'div[role="button"][aria-label*="Lens"]',
  'button[aria-label*="image"]',
  'button[aria-label*="Lens"]',
  'div[role="button"]:has-text("Search by image")',
  'button:has-text("Search by image")',
  'div[role="button"]:has-text("Search with an image")',
  'button:has-text("Search with an image")',
  '[data-base-uri="/searchbyimage"]',
  '[data-base-uri*="lens"]',
];

export const GOOGLE_LENS_UPLOAD_TAB_SELECTORS = [
  'button:has-text("Upload an image")',
  'button:has-text("Upload image")',
  'button:has-text("Upload a file")',
  'button:has-text("Upload file")',
  'div[role="tab"]:has-text("Upload")',
  'div[role="tab"]:has-text("Upload an image")',
  'div[role="tab"]:has-text("Upload a file")',
  'a:has-text("upload a file")',
  'span:has-text("upload a file")',
  'button:has-text("upload")',
];

export const GOOGLE_LENS_RESULT_HINT_SELECTORS = [
  'a[href*="amazon."]',
  '#search a[href]',
  '#rso a[href]',
  'div.g a[href]',
  'main a[href]',
  '[data-lpage]',
  'a[href*="udm=44"]',
  'a[href*="udm=48"]',
  'a[href*="/imgres"]',
  '#islrg img',
  'img[src^="blob:"]',
  'img[src^="data:image/"]',
];

export const GOOGLE_LENS_RESULT_SHELL_SELECTORS = [
  'button[aria-label*="Edit visual search"]',
  'img[alt*="Visually searched image"]',
  'main h2',
  '#search',
  '#rso',
  '#islrg',
  '[data-lpage]',
  'div.g',
];

export const GOOGLE_LENS_PROCESSING_INDICATOR_SELECTORS = [
  '[role="progressbar"]',
  '[aria-busy="true"]',
];

export const GOOGLE_LENS_PROCESSING_TEXT_HINTS = [
  'uploading',
  'searching',
  'looking for matches',
  'finding results',
];

export const GOOGLE_LENS_RESULT_TEXT_HINTS = [
  'visual matches',
  'exact matches',
  'about this image',
  'search results',
  'edit visual search',
];

export const GOOGLE_LENS_CANDIDATE_HINT_SELECTORS = [
  'a[href*="amazon."]',
  'a[href*="googleadservices.com"]',
  'a[href*="/imgres"]',
  '[role="listitem"]',
];

// ─── Google Consent ───────────────────────────────────────────────────────────

export const GOOGLE_CONSENT_CONTROL_SELECTOR =
  'button, [role="button"], input[type="submit"], input[type="button"]';

export const GOOGLE_CONSENT_ACCEPT_SELECTORS = [
  'button:has-text("Accept all cookies")',
  'button:has-text("Accept all")',
  'button:has-text("I agree")',
  'button:has-text("Continue to Google")',
  'button:has-text("Zaakceptuj")',
  'button:has-text("Akceptuj")',
  'button:has-text("Zgadzam")',
  'button:has-text("Kontynuuj")',
  'button[aria-label*="Accept"]',
  'button[aria-label*="agree"]',
  'form[action*="consent"] button',
  'form[action*="save"] button',
];

export const GOOGLE_CONSENT_SURFACE_TEXT_HINTS = [
  'before you continue',
  'before you continue to google',
  'google uses cookies',
  'cookies',
  'cookie',
  'privacy',
  'terms',
  'consent',
  'zanim przejdziesz',
  'wykorzystuje pliki cookie',
  'zasady prywatnosci',
];

export const GOOGLE_CONSENT_ACCEPT_TEXT_HINTS = [
  'accept all',
  'accept everything',
  'i agree',
  'agree',
  'accept',
  'continue to google',
  'got it',
  'zaakceptuj',
  'akceptuj wszystko',
  'zgadzam sie',
  'przejdz do google',
  'kontynuuj',
];

export const GOOGLE_CONSENT_REJECT_TEXT_HINTS = [
  'reject all',
  'reject',
  'decline',
  'manage options',
  'more options',
  'customize',
  'settings',
  'nie zgadzam',
  'odrzuc',
  'zarzadzaj',
  'ustawienia',
];

// ─── Google Redirect Interstitial ─────────────────────────────────────────────

export const GOOGLE_REDIRECT_INTERSTITIAL_SELECTORS = [
  'a:has-text("Przejdź do witryny")',
  'a:has-text("Przejdź mimo to")',
  'a:has-text("Kontynuuj")',
  'button:has-text("Kontynuuj")',
  'a:has-text("Continue")',
  'a:has-text("Proceed")',
  '#proceed-link',
  'a[id*="proceed"]',
];

// ─── Amazon Overlays ──────────────────────────────────────────────────────────

export const AMAZON_COOKIE_ACCEPT_SELECTORS = [
  '#sp-cc-accept',
  'input#sp-cc-accept',
  'button[data-action="sp-cc-accept"]',
  'button:has-text("Accept")',
  'input[aria-labelledby*="accept"]',
  'input[name="accept"]',
];

export const AMAZON_COOKIE_DISMISS_SELECTORS = [
  '#sp-cc-rejectall-link',
  '#sp-cc-customize-link',
  'button:has-text("Decline")',
  'button:has-text("Dismiss")',
  '[aria-label="Close"]',
  '[data-action="a-popover-close"]',
];

export const AMAZON_ADDRESS_DISMISS_SELECTORS = [
  '#glow-toaster button:has-text("Dismiss")',
  'button:has-text("Dismiss")',
  'button[aria-label="Dismiss"]',
  'input[data-action-type="DISMISS"]',
  '[data-action="GLUXPostalUpdateAction"] [aria-label="Close"]',
];

// ─── Amazon Product Content ───────────────────────────────────────────────────

export const AMAZON_PRODUCT_CONTENT_SELECTORS = [
  '#productTitle',
  '[data-asin]',
  'input[name="ASIN"]',
  '#dp-container',
  '#corePrice_feature_div',
  '#feature-bullets',
];

export const AMAZON_TITLE_SELECTORS = [
  '#productTitle',
  'h1.a-size-large',
  'h1#title',
];

export const AMAZON_PRICE_SELECTORS = [
  '.priceToPay .a-offscreen',
  '#corePrice_feature_div .a-offscreen',
  '#tp_price_block_total_price_ww .a-offscreen',
  '#priceblock_ourprice',
  '#priceblock_dealprice',
];

export const AMAZON_DESCRIPTION_SELECTORS = [
  '#feature-bullets',
  '#productDescription',
  '#bookDescription_feature_div',
];

export const AMAZON_HERO_IMAGE_SELECTORS = [
  '#landingImage',
  '#imgTagWrapperId img',
  '#main-image-container img',
  '#ebooksImgBlkFront',
  '#imgBlkFront',
];

// ─── Runtime Generator ────────────────────────────────────────────────────────

/** Serialise a string as a single-quoted JS literal, escaping backslashes and single quotes. */
const jsStr = (s: string): string => `'${s.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`;

/** Serialise an array of strings as a single-quoted JS array literal. */
const jsStrArray = (arr: readonly string[]): string =>
  '[' + arr.map(jsStr).join(', ') + ']';

export const generateAmazonSelectorRegistryRuntime = (): string =>
  [
    '// --- Amazon / Google selector registry ---',
    `const GOOGLE_LENS_FILE_INPUT_SELECTORS = ${jsStrArray(GOOGLE_LENS_FILE_INPUT_SELECTORS)};`,
    `const GOOGLE_LENS_ENTRY_TRIGGER_SELECTORS = ${jsStrArray(GOOGLE_LENS_ENTRY_TRIGGER_SELECTORS)};`,
    `const GOOGLE_LENS_UPLOAD_TAB_SELECTORS = ${jsStrArray(GOOGLE_LENS_UPLOAD_TAB_SELECTORS)};`,
    `const GOOGLE_LENS_RESULT_HINT_SELECTORS = ${jsStrArray(GOOGLE_LENS_RESULT_HINT_SELECTORS)};`,
    `const GOOGLE_LENS_RESULT_SHELL_SELECTORS = ${jsStrArray(GOOGLE_LENS_RESULT_SHELL_SELECTORS)};`,
    `const GOOGLE_LENS_PROCESSING_INDICATOR_SELECTORS = ${jsStrArray(GOOGLE_LENS_PROCESSING_INDICATOR_SELECTORS)};`,
    `const GOOGLE_LENS_PROCESSING_TEXT_HINTS = ${jsStrArray(GOOGLE_LENS_PROCESSING_TEXT_HINTS)};`,
    `const GOOGLE_LENS_RESULT_TEXT_HINTS = ${jsStrArray(GOOGLE_LENS_RESULT_TEXT_HINTS)};`,
    `const GOOGLE_LENS_CANDIDATE_HINT_SELECTORS = ${jsStrArray(GOOGLE_LENS_CANDIDATE_HINT_SELECTORS)};`,
    `const GOOGLE_CONSENT_CONTROL_SELECTOR = ${jsStr(GOOGLE_CONSENT_CONTROL_SELECTOR)};`,
    `const GOOGLE_CONSENT_ACCEPT_SELECTORS = ${jsStrArray(GOOGLE_CONSENT_ACCEPT_SELECTORS)};`,
    `const GOOGLE_CONSENT_SURFACE_TEXT_HINTS = ${jsStrArray(GOOGLE_CONSENT_SURFACE_TEXT_HINTS)};`,
    `const GOOGLE_CONSENT_ACCEPT_TEXT_HINTS = ${jsStrArray(GOOGLE_CONSENT_ACCEPT_TEXT_HINTS)};`,
    `const GOOGLE_CONSENT_REJECT_TEXT_HINTS = ${jsStrArray(GOOGLE_CONSENT_REJECT_TEXT_HINTS)};`,
    `const GOOGLE_REDIRECT_INTERSTITIAL_SELECTORS = ${jsStrArray(GOOGLE_REDIRECT_INTERSTITIAL_SELECTORS)};`,
    `const AMAZON_COOKIE_ACCEPT_SELECTORS = ${jsStrArray(AMAZON_COOKIE_ACCEPT_SELECTORS)};`,
    `const AMAZON_COOKIE_DISMISS_SELECTORS = ${jsStrArray(AMAZON_COOKIE_DISMISS_SELECTORS)};`,
    `const AMAZON_ADDRESS_DISMISS_SELECTORS = ${jsStrArray(AMAZON_ADDRESS_DISMISS_SELECTORS)};`,
    `const AMAZON_PRODUCT_CONTENT_SELECTORS = ${jsStrArray(AMAZON_PRODUCT_CONTENT_SELECTORS)};`,
    `const AMAZON_TITLE_SELECTORS = ${jsStrArray(AMAZON_TITLE_SELECTORS)};`,
    `const AMAZON_PRICE_SELECTORS = ${jsStrArray(AMAZON_PRICE_SELECTORS)};`,
    `const AMAZON_DESCRIPTION_SELECTORS = ${jsStrArray(AMAZON_DESCRIPTION_SELECTORS)};`,
    `const AMAZON_HERO_IMAGE_SELECTORS = ${jsStrArray(AMAZON_HERO_IMAGE_SELECTORS)};`,
  ].join('\n');

export const AMAZON_SELECTOR_REGISTRY_RUNTIME = generateAmazonSelectorRegistryRuntime();
