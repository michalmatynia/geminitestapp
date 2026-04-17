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
  `[${  arr.map(jsStr).join(', ')  }]`;

export const generateAmazonSelectorRegistryRuntimeFromRuntime = (
  runtime: AmazonSelectorRuntime
): string =>
  [
    '// --- Amazon / Google selector registry ---',
    `const GOOGLE_LENS_FILE_INPUT_SELECTORS = ${jsStrArray(runtime.googleLensFileInputSelectors)};`,
    `const GOOGLE_LENS_ENTRY_TRIGGER_SELECTORS = ${jsStrArray(runtime.googleLensEntryTriggerSelectors)};`,
    `const GOOGLE_LENS_UPLOAD_TAB_SELECTORS = ${jsStrArray(runtime.googleLensUploadTabSelectors)};`,
    `const GOOGLE_LENS_RESULT_HINT_SELECTORS = ${jsStrArray(runtime.googleLensResultHintSelectors)};`,
    `const GOOGLE_LENS_RESULT_SHELL_SELECTORS = ${jsStrArray(runtime.googleLensResultShellSelectors)};`,
    `const GOOGLE_LENS_PROCESSING_INDICATOR_SELECTORS = ${jsStrArray(runtime.googleLensProcessingIndicatorSelectors)};`,
    `const GOOGLE_LENS_PROCESSING_TEXT_HINTS = ${jsStrArray(runtime.googleLensProcessingTextHints)};`,
    `const GOOGLE_LENS_RESULT_TEXT_HINTS = ${jsStrArray(runtime.googleLensResultTextHints)};`,
    `const GOOGLE_LENS_CANDIDATE_HINT_SELECTORS = ${jsStrArray(runtime.googleLensCandidateHintSelectors)};`,
    `const GOOGLE_CONSENT_CONTROL_SELECTOR = ${jsStr(runtime.googleConsentControlSelector)};`,
    `const GOOGLE_CONSENT_ACCEPT_SELECTORS = ${jsStrArray(runtime.googleConsentAcceptSelectors)};`,
    `const GOOGLE_CONSENT_SURFACE_TEXT_HINTS = ${jsStrArray(runtime.googleConsentSurfaceTextHints)};`,
    `const GOOGLE_CONSENT_ACCEPT_TEXT_HINTS = ${jsStrArray(runtime.googleConsentAcceptTextHints)};`,
    `const GOOGLE_CONSENT_REJECT_TEXT_HINTS = ${jsStrArray(runtime.googleConsentRejectTextHints)};`,
    `const GOOGLE_REDIRECT_INTERSTITIAL_SELECTORS = ${jsStrArray(runtime.googleRedirectInterstitialSelectors)};`,
    `const AMAZON_COOKIE_ACCEPT_SELECTORS = ${jsStrArray(runtime.amazonCookieAcceptSelectors)};`,
    `const AMAZON_COOKIE_DISMISS_SELECTORS = ${jsStrArray(runtime.amazonCookieDismissSelectors)};`,
    `const AMAZON_ADDRESS_DISMISS_SELECTORS = ${jsStrArray(runtime.amazonAddressDismissSelectors)};`,
    `const AMAZON_PRODUCT_CONTENT_SELECTORS = ${jsStrArray(runtime.amazonProductContentSelectors)};`,
    `const AMAZON_TITLE_SELECTORS = ${jsStrArray(runtime.amazonTitleSelectors)};`,
    `const AMAZON_PRICE_SELECTORS = ${jsStrArray(runtime.amazonPriceSelectors)};`,
    `const AMAZON_DESCRIPTION_SELECTORS = ${jsStrArray(runtime.amazonDescriptionSelectors)};`,
    `const AMAZON_HERO_IMAGE_SELECTORS = ${jsStrArray(runtime.amazonHeroImageSelectors)};`,
  ].join('\n');

export const generateAmazonSelectorRegistryRuntime = (): string =>
  generateAmazonSelectorRegistryRuntimeFromRuntime({
    googleLensFileInputSelectors: GOOGLE_LENS_FILE_INPUT_SELECTORS,
    googleLensEntryTriggerSelectors: GOOGLE_LENS_ENTRY_TRIGGER_SELECTORS,
    googleLensUploadTabSelectors: GOOGLE_LENS_UPLOAD_TAB_SELECTORS,
    googleLensResultHintSelectors: GOOGLE_LENS_RESULT_HINT_SELECTORS,
    googleLensResultShellSelectors: GOOGLE_LENS_RESULT_SHELL_SELECTORS,
    googleLensProcessingIndicatorSelectors: GOOGLE_LENS_PROCESSING_INDICATOR_SELECTORS,
    googleLensProcessingTextHints: GOOGLE_LENS_PROCESSING_TEXT_HINTS,
    googleLensResultTextHints: GOOGLE_LENS_RESULT_TEXT_HINTS,
    googleLensCandidateHintSelectors: GOOGLE_LENS_CANDIDATE_HINT_SELECTORS,
    googleConsentControlSelector: GOOGLE_CONSENT_CONTROL_SELECTOR,
    googleConsentAcceptSelectors: GOOGLE_CONSENT_ACCEPT_SELECTORS,
    googleConsentSurfaceTextHints: GOOGLE_CONSENT_SURFACE_TEXT_HINTS,
    googleConsentAcceptTextHints: GOOGLE_CONSENT_ACCEPT_TEXT_HINTS,
    googleConsentRejectTextHints: GOOGLE_CONSENT_REJECT_TEXT_HINTS,
    googleRedirectInterstitialSelectors: GOOGLE_REDIRECT_INTERSTITIAL_SELECTORS,
    amazonCookieAcceptSelectors: AMAZON_COOKIE_ACCEPT_SELECTORS,
    amazonCookieDismissSelectors: AMAZON_COOKIE_DISMISS_SELECTORS,
    amazonAddressDismissSelectors: AMAZON_ADDRESS_DISMISS_SELECTORS,
    amazonProductContentSelectors: AMAZON_PRODUCT_CONTENT_SELECTORS,
    amazonTitleSelectors: AMAZON_TITLE_SELECTORS,
    amazonPriceSelectors: AMAZON_PRICE_SELECTORS,
    amazonDescriptionSelectors: AMAZON_DESCRIPTION_SELECTORS,
    amazonHeroImageSelectors: AMAZON_HERO_IMAGE_SELECTORS,
  });

export const AMAZON_SELECTOR_REGISTRY_RUNTIME = generateAmazonSelectorRegistryRuntime();

export type AmazonSelectorRegistryValue = string | string[];

export type AmazonSelectorRegistryValueType = 'string' | 'string_array';

export type AmazonSelectorRegistryKind = 'selector' | 'text_hint' | 'pattern';

export type AmazonSelectorRegistryDefinition = {
  key: string;
  label: string;
  description: string;
  kind: AmazonSelectorRegistryKind;
  value: AmazonSelectorRegistryValue;
};

export type AmazonSelectorRegistrySeedEntry = Omit<AmazonSelectorRegistryDefinition, 'value'> & {
  profile: string;
  valueType: AmazonSelectorRegistryValueType;
  valueJson: string;
};

export type AmazonSelectorRegistryRuntimeEntry = Pick<
  AmazonSelectorRegistrySeedEntry,
  'key' | 'valueJson'
>;

export type AmazonSelectorRuntime = {
  googleLensFileInputSelectors: readonly string[];
  googleLensEntryTriggerSelectors: readonly string[];
  googleLensUploadTabSelectors: readonly string[];
  googleLensResultHintSelectors: readonly string[];
  googleLensResultShellSelectors: readonly string[];
  googleLensProcessingIndicatorSelectors: readonly string[];
  googleLensProcessingTextHints: readonly string[];
  googleLensResultTextHints: readonly string[];
  googleLensCandidateHintSelectors: readonly string[];
  googleConsentControlSelector: string;
  googleConsentAcceptSelectors: readonly string[];
  googleConsentSurfaceTextHints: readonly string[];
  googleConsentAcceptTextHints: readonly string[];
  googleConsentRejectTextHints: readonly string[];
  googleRedirectInterstitialSelectors: readonly string[];
  amazonCookieAcceptSelectors: readonly string[];
  amazonCookieDismissSelectors: readonly string[];
  amazonAddressDismissSelectors: readonly string[];
  amazonProductContentSelectors: readonly string[];
  amazonTitleSelectors: readonly string[];
  amazonPriceSelectors: readonly string[];
  amazonDescriptionSelectors: readonly string[];
  amazonHeroImageSelectors: readonly string[];
};

export const AMAZON_SELECTOR_REGISTRY_PROFILE = 'amazon';

export const AMAZON_DEFAULT_SELECTOR_RUNTIME: AmazonSelectorRuntime = {
  googleLensFileInputSelectors: GOOGLE_LENS_FILE_INPUT_SELECTORS,
  googleLensEntryTriggerSelectors: GOOGLE_LENS_ENTRY_TRIGGER_SELECTORS,
  googleLensUploadTabSelectors: GOOGLE_LENS_UPLOAD_TAB_SELECTORS,
  googleLensResultHintSelectors: GOOGLE_LENS_RESULT_HINT_SELECTORS,
  googleLensResultShellSelectors: GOOGLE_LENS_RESULT_SHELL_SELECTORS,
  googleLensProcessingIndicatorSelectors: GOOGLE_LENS_PROCESSING_INDICATOR_SELECTORS,
  googleLensProcessingTextHints: GOOGLE_LENS_PROCESSING_TEXT_HINTS,
  googleLensResultTextHints: GOOGLE_LENS_RESULT_TEXT_HINTS,
  googleLensCandidateHintSelectors: GOOGLE_LENS_CANDIDATE_HINT_SELECTORS,
  googleConsentControlSelector: GOOGLE_CONSENT_CONTROL_SELECTOR,
  googleConsentAcceptSelectors: GOOGLE_CONSENT_ACCEPT_SELECTORS,
  googleConsentSurfaceTextHints: GOOGLE_CONSENT_SURFACE_TEXT_HINTS,
  googleConsentAcceptTextHints: GOOGLE_CONSENT_ACCEPT_TEXT_HINTS,
  googleConsentRejectTextHints: GOOGLE_CONSENT_REJECT_TEXT_HINTS,
  googleRedirectInterstitialSelectors: GOOGLE_REDIRECT_INTERSTITIAL_SELECTORS,
  amazonCookieAcceptSelectors: AMAZON_COOKIE_ACCEPT_SELECTORS,
  amazonCookieDismissSelectors: AMAZON_COOKIE_DISMISS_SELECTORS,
  amazonAddressDismissSelectors: AMAZON_ADDRESS_DISMISS_SELECTORS,
  amazonProductContentSelectors: AMAZON_PRODUCT_CONTENT_SELECTORS,
  amazonTitleSelectors: AMAZON_TITLE_SELECTORS,
  amazonPriceSelectors: AMAZON_PRICE_SELECTORS,
  amazonDescriptionSelectors: AMAZON_DESCRIPTION_SELECTORS,
  amazonHeroImageSelectors: AMAZON_HERO_IMAGE_SELECTORS,
};

const defineAmazonSelectorRegistryEntry = (
  definition: AmazonSelectorRegistryDefinition
): AmazonSelectorRegistryDefinition => definition;

const detectAmazonSelectorRegistryValueType = (
  value: AmazonSelectorRegistryValue
): AmazonSelectorRegistryValueType => (Array.isArray(value) ? 'string_array' : 'string');

export const AMAZON_SELECTOR_REGISTRY_DEFINITIONS: AmazonSelectorRegistryDefinition[] = [
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.googleLens.fileInputs',
    label: 'Google Lens file inputs',
    description: 'File input selectors used for local image upload in Google Lens.',
    kind: 'selector',
    value: GOOGLE_LENS_FILE_INPUT_SELECTORS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.googleLens.entryTriggers',
    label: 'Google Lens entry triggers',
    description: 'Selectors that reveal or open Google Lens image search.',
    kind: 'selector',
    value: GOOGLE_LENS_ENTRY_TRIGGER_SELECTORS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.googleLens.uploadTabs',
    label: 'Google Lens upload tabs',
    description: 'Selectors used to switch into upload mode inside Google Lens.',
    kind: 'selector',
    value: GOOGLE_LENS_UPLOAD_TAB_SELECTORS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.googleLens.resultHints',
    label: 'Google Lens result hints',
    description: 'Selectors indicating that Google Lens has produced result links or images.',
    kind: 'selector',
    value: GOOGLE_LENS_RESULT_HINT_SELECTORS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.googleLens.resultShells',
    label: 'Google Lens result shells',
    description: 'Selectors that represent the Google Lens result container shell.',
    kind: 'selector',
    value: GOOGLE_LENS_RESULT_SHELL_SELECTORS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.googleLens.processingIndicators',
    label: 'Google Lens processing indicators',
    description: 'Selectors indicating that Google Lens is still processing the uploaded image.',
    kind: 'selector',
    value: GOOGLE_LENS_PROCESSING_INDICATOR_SELECTORS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.googleLens.processingTextHints',
    label: 'Google Lens processing text hints',
    description: 'Text hints indicating that Google Lens is still processing.',
    kind: 'text_hint',
    value: GOOGLE_LENS_PROCESSING_TEXT_HINTS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.googleLens.resultTextHints',
    label: 'Google Lens result text hints',
    description: 'Text hints indicating that Google Lens has produced results.',
    kind: 'text_hint',
    value: GOOGLE_LENS_RESULT_TEXT_HINTS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.googleLens.candidateHints',
    label: 'Google Lens candidate hints',
    description: 'Selectors used to collect outbound marketplace candidate items from Google Lens.',
    kind: 'selector',
    value: GOOGLE_LENS_CANDIDATE_HINT_SELECTORS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.googleConsent.controlSelector',
    label: 'Google consent control selector',
    description: 'Base selector used to inspect consent controls on Google interstitials.',
    kind: 'selector',
    value: GOOGLE_CONSENT_CONTROL_SELECTOR,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.googleConsent.acceptControls',
    label: 'Google consent accept controls',
    description: 'Selectors used to accept Google consent and cookie prompts.',
    kind: 'selector',
    value: GOOGLE_CONSENT_ACCEPT_SELECTORS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.googleConsent.surfaceTextHints',
    label: 'Google consent surface hints',
    description: 'Text hints indicating that a Google consent surface is visible.',
    kind: 'text_hint',
    value: GOOGLE_CONSENT_SURFACE_TEXT_HINTS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.googleConsent.acceptTextHints',
    label: 'Google consent accept text hints',
    description: 'Text hints used to identify acceptance controls on Google consent surfaces.',
    kind: 'text_hint',
    value: GOOGLE_CONSENT_ACCEPT_TEXT_HINTS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.googleConsent.rejectTextHints',
    label: 'Google consent reject text hints',
    description: 'Text hints used to avoid reject/manage controls on Google consent surfaces.',
    kind: 'text_hint',
    value: GOOGLE_CONSENT_REJECT_TEXT_HINTS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.googleRedirect.proceedSelectors',
    label: 'Google redirect proceed selectors',
    description: 'Selectors used to continue through Google redirect interstitials.',
    kind: 'selector',
    value: GOOGLE_REDIRECT_INTERSTITIAL_SELECTORS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.cookie.accept',
    label: 'Amazon cookie accept selectors',
    description: 'Selectors used to accept or clear Amazon cookie prompts.',
    kind: 'selector',
    value: AMAZON_COOKIE_ACCEPT_SELECTORS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.cookie.dismiss',
    label: 'Amazon cookie dismiss selectors',
    description: 'Selectors used to dismiss or reject Amazon cookie prompts.',
    kind: 'selector',
    value: AMAZON_COOKIE_DISMISS_SELECTORS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.address.dismiss',
    label: 'Amazon address dismiss selectors',
    description: 'Selectors used to dismiss Amazon delivery location overlays.',
    kind: 'selector',
    value: AMAZON_ADDRESS_DISMISS_SELECTORS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.product.content',
    label: 'Amazon product content selectors',
    description: 'Selectors indicating that Amazon product content is ready.',
    kind: 'selector',
    value: AMAZON_PRODUCT_CONTENT_SELECTORS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.product.title',
    label: 'Amazon title selectors',
    description: 'Selectors used to extract the Amazon product title.',
    kind: 'selector',
    value: AMAZON_TITLE_SELECTORS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.product.price',
    label: 'Amazon price selectors',
    description: 'Selectors used to extract Amazon price text.',
    kind: 'selector',
    value: AMAZON_PRICE_SELECTORS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.product.description',
    label: 'Amazon description selectors',
    description: 'Selectors used to extract Amazon description content.',
    kind: 'selector',
    value: AMAZON_DESCRIPTION_SELECTORS,
  }),
  defineAmazonSelectorRegistryEntry({
    key: 'amazon.product.heroImage',
    label: 'Amazon hero image selectors',
    description: 'Selectors used to extract primary Amazon product images.',
    kind: 'selector',
    value: AMAZON_HERO_IMAGE_SELECTORS,
  }),
];

export const AMAZON_SELECTOR_REGISTRY_SEED_ENTRIES: AmazonSelectorRegistrySeedEntry[] =
  AMAZON_SELECTOR_REGISTRY_DEFINITIONS.map((definition) => ({
    key: definition.key,
    profile: AMAZON_SELECTOR_REGISTRY_PROFILE,
    label: definition.label,
    description: definition.description,
    kind: definition.kind,
    valueType: detectAmazonSelectorRegistryValueType(definition.value),
    valueJson: JSON.stringify(definition.value),
  }));

const parseRuntimeValue = (
  valueJson: string,
  fallback: AmazonSelectorRegistryValue
): AmazonSelectorRegistryValue => {
  try {
    const parsed = JSON.parse(valueJson) as unknown;
    if (typeof fallback === 'string' && typeof parsed === 'string') return parsed;
    if (
      Array.isArray(fallback) &&
      Array.isArray(parsed) &&
      parsed.every((entry) => typeof entry === 'string')
    ) {
      return parsed as string[];
    }
  } catch {
    return fallback;
  }
  return fallback;
};

const runtimeValueMapFromEntries = (
  entries: readonly AmazonSelectorRegistryRuntimeEntry[]
): Map<string, AmazonSelectorRegistryValue> => {
  const fallbackByKey = new Map(
    AMAZON_SELECTOR_REGISTRY_DEFINITIONS.map((definition) => [definition.key, definition.value])
  );

  return new Map(
    entries.map((entry) => {
      const fallback = fallbackByKey.get(entry.key) ?? '';
      return [entry.key, parseRuntimeValue(entry.valueJson, fallback)];
    })
  );
};

const readRuntimeStringArray = (
  values: Map<string, AmazonSelectorRegistryValue>,
  key: string,
  fallback: readonly string[]
): readonly string[] => {
  const value = values.get(key);
  return Array.isArray(value) ? value : fallback;
};

const readRuntimeString = (
  values: Map<string, AmazonSelectorRegistryValue>,
  key: string,
  fallback: string
): string => {
  const value = values.get(key);
  return typeof value === 'string' ? value : fallback;
};

export const resolveAmazonSelectorRuntimeFromEntries = (
  entries: readonly AmazonSelectorRegistryRuntimeEntry[]
): AmazonSelectorRuntime => {
  const values = runtimeValueMapFromEntries(entries);
  return {
    googleLensFileInputSelectors: readRuntimeStringArray(
      values,
      'amazon.googleLens.fileInputs',
      GOOGLE_LENS_FILE_INPUT_SELECTORS
    ),
    googleLensEntryTriggerSelectors: readRuntimeStringArray(
      values,
      'amazon.googleLens.entryTriggers',
      GOOGLE_LENS_ENTRY_TRIGGER_SELECTORS
    ),
    googleLensUploadTabSelectors: readRuntimeStringArray(
      values,
      'amazon.googleLens.uploadTabs',
      GOOGLE_LENS_UPLOAD_TAB_SELECTORS
    ),
    googleLensResultHintSelectors: readRuntimeStringArray(
      values,
      'amazon.googleLens.resultHints',
      GOOGLE_LENS_RESULT_HINT_SELECTORS
    ),
    googleLensResultShellSelectors: readRuntimeStringArray(
      values,
      'amazon.googleLens.resultShells',
      GOOGLE_LENS_RESULT_SHELL_SELECTORS
    ),
    googleLensProcessingIndicatorSelectors: readRuntimeStringArray(
      values,
      'amazon.googleLens.processingIndicators',
      GOOGLE_LENS_PROCESSING_INDICATOR_SELECTORS
    ),
    googleLensProcessingTextHints: readRuntimeStringArray(
      values,
      'amazon.googleLens.processingTextHints',
      GOOGLE_LENS_PROCESSING_TEXT_HINTS
    ),
    googleLensResultTextHints: readRuntimeStringArray(
      values,
      'amazon.googleLens.resultTextHints',
      GOOGLE_LENS_RESULT_TEXT_HINTS
    ),
    googleLensCandidateHintSelectors: readRuntimeStringArray(
      values,
      'amazon.googleLens.candidateHints',
      GOOGLE_LENS_CANDIDATE_HINT_SELECTORS
    ),
    googleConsentControlSelector: readRuntimeString(
      values,
      'amazon.googleConsent.controlSelector',
      GOOGLE_CONSENT_CONTROL_SELECTOR
    ),
    googleConsentAcceptSelectors: readRuntimeStringArray(
      values,
      'amazon.googleConsent.acceptControls',
      GOOGLE_CONSENT_ACCEPT_SELECTORS
    ),
    googleConsentSurfaceTextHints: readRuntimeStringArray(
      values,
      'amazon.googleConsent.surfaceTextHints',
      GOOGLE_CONSENT_SURFACE_TEXT_HINTS
    ),
    googleConsentAcceptTextHints: readRuntimeStringArray(
      values,
      'amazon.googleConsent.acceptTextHints',
      GOOGLE_CONSENT_ACCEPT_TEXT_HINTS
    ),
    googleConsentRejectTextHints: readRuntimeStringArray(
      values,
      'amazon.googleConsent.rejectTextHints',
      GOOGLE_CONSENT_REJECT_TEXT_HINTS
    ),
    googleRedirectInterstitialSelectors: readRuntimeStringArray(
      values,
      'amazon.googleRedirect.proceedSelectors',
      GOOGLE_REDIRECT_INTERSTITIAL_SELECTORS
    ),
    amazonCookieAcceptSelectors: readRuntimeStringArray(
      values,
      'amazon.cookie.accept',
      AMAZON_COOKIE_ACCEPT_SELECTORS
    ),
    amazonCookieDismissSelectors: readRuntimeStringArray(
      values,
      'amazon.cookie.dismiss',
      AMAZON_COOKIE_DISMISS_SELECTORS
    ),
    amazonAddressDismissSelectors: readRuntimeStringArray(
      values,
      'amazon.address.dismiss',
      AMAZON_ADDRESS_DISMISS_SELECTORS
    ),
    amazonProductContentSelectors: readRuntimeStringArray(
      values,
      'amazon.product.content',
      AMAZON_PRODUCT_CONTENT_SELECTORS
    ),
    amazonTitleSelectors: readRuntimeStringArray(
      values,
      'amazon.product.title',
      AMAZON_TITLE_SELECTORS
    ),
    amazonPriceSelectors: readRuntimeStringArray(
      values,
      'amazon.product.price',
      AMAZON_PRICE_SELECTORS
    ),
    amazonDescriptionSelectors: readRuntimeStringArray(
      values,
      'amazon.product.description',
      AMAZON_DESCRIPTION_SELECTORS
    ),
    amazonHeroImageSelectors: readRuntimeStringArray(
      values,
      'amazon.product.heroImage',
      AMAZON_HERO_IMAGE_SELECTORS
    ),
  };
};
