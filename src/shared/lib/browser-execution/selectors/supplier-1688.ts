// ─── 1688 Image Search ────────────────────────────────────────────────────────

export const SUPPLIER_1688_FILE_INPUT_SELECTORS = [
  'input[type="file"]',
  'input[accept*="image"]',
];

export const SUPPLIER_1688_IMAGE_SEARCH_ENTRY_SELECTORS = [
  'a:has-text("以图搜")',
  'button:has-text("以图搜")',
  'span:has-text("以图搜")',
  'div:has-text("以图搜")',
  'a:has-text("搜同款")',
  'button:has-text("搜同款")',
  '[aria-label*="image"]',
  '[title*="以图搜"]',
  '[title*="搜同款"]',
];

export const SUPPLIER_1688_SEARCH_RESULT_READY_SELECTORS = [
  'a[href*="/offer/"]',
  'a[href*="detail.1688.com/offer/"]',
  '[class*="offer"] a[href]',
  '[class*="image-search"] a[href]',
];

export const SUPPLIER_1688_SUPPLIER_READY_SELECTORS = [
  'h1',
  '[class*="title"]',
  '[data-testid*="title"]',
  '[class*="price"]',
  '[data-testid*="price"]',
  'a[href*="shop.1688.com"]',
  'a[href*="winport"]',
];

export const SUPPLIER_1688_SUBMIT_SEARCH_SELECTORS = [
  '.search-btn',
  'div:has-text("Search for Image")',
  'button:has-text("Search for Image")',
  'div:has-text("搜图")',
  'button:has-text("搜图")',
  'div:has-text("搜索图片")',
  'button:has-text("搜索图片")',
];

// ─── 1688 Access Barriers ─────────────────────────────────────────────────────

export const SUPPLIER_1688_LOGIN_TEXT_HINTS = ['请登录', '登录后', '扫码登录', '登录'];

export const SUPPLIER_1688_CAPTCHA_TEXT_HINTS = [
  '验证码',
  '滑动验证',
  '滑块',
  '完成验证',
  '安全验证',
  'unusual traffic',
  'verify',
  'captcha',
];

export const SUPPLIER_1688_ACCESS_BLOCK_TEXT_HINTS = ['访问受限'];

export const SUPPLIER_1688_BARRIER_TITLE_HINTS = [
  'captcha interception',
  'captcha',
  '安全验证',
  '访问受限',
  '登录',
];

export const SUPPLIER_1688_HARD_BLOCKING_SELECTORS = [
  'input[type="password"]',
  '[class*="login"] input',
];

export const SUPPLIER_1688_SOFT_BLOCKING_SELECTORS = [
  'iframe[src*="captcha"]',
  '[id*="nc_"]',
  '[class*="captcha"]',
];

// ─── 1688 Content Body Signals ────────────────────────────────────────────────

/** Chinese body text patterns that indicate image search results are present. */
export const SUPPLIER_1688_SEARCH_BODY_SIGNAL_PATTERN =
  '搜索结果|找相似|搜同款|同款|相似|为您找到';

/** Chinese body text patterns that indicate a supplier product page is visible. */
export const SUPPLIER_1688_SUPPLIER_BODY_SIGNAL_PATTERN = '起订|供应商|厂家|所在地|发货地|成交';

/** Matches CNY price ranges such as "¥12.5 - ¥23" or "￥8". */
export const SUPPLIER_1688_PRICE_TEXT_PATTERN_SOURCE =
  '(?:¥|￥)\\s*\\d+(?:\\.\\d+)?(?:\\s*[-~至]\\s*(?:¥|￥)?\\s*\\d+(?:\\.\\d+)?)?';

// ─── Selector Registry Seed Metadata ─────────────────────────────────────────

export type Supplier1688SelectorRegistryValue = string | string[];

export type Supplier1688SelectorRegistryValueType = 'string' | 'string_array';

export type Supplier1688SelectorRegistryKind = 'selector' | 'text_hint' | 'pattern';

export type Supplier1688SelectorRegistryDefinition = {
  key: string;
  label: string;
  description: string;
  kind: Supplier1688SelectorRegistryKind;
  value: Supplier1688SelectorRegistryValue;
};

export type Supplier1688SelectorRegistrySeedEntry = Omit<
  Supplier1688SelectorRegistryDefinition,
  'value'
> & {
  profile: string;
  valueType: Supplier1688SelectorRegistryValueType;
  valueJson: string;
};

export type Supplier1688SelectorRegistryRuntimeEntry = Pick<
  Supplier1688SelectorRegistrySeedEntry,
  'key' | 'valueJson'
>;

export type Supplier1688SelectorRuntime = {
  fileInputSelectors: readonly string[];
  imageSearchEntrySelectors: readonly string[];
  searchResultReadySelectors: readonly string[];
  supplierReadySelectors: readonly string[];
  submitSearchSelectors: readonly string[];
  loginTextHints: readonly string[];
  captchaTextHints: readonly string[];
  accessBlockTextHints: readonly string[];
  barrierTitleHints: readonly string[];
  hardBlockingSelectors: readonly string[];
  softBlockingSelectors: readonly string[];
  searchBodySignalPattern: string;
  supplierBodySignalPattern: string;
  priceTextPatternSource: string;
};

export const SUPPLIER_1688_SELECTOR_REGISTRY_PROFILE = '1688';

export const SUPPLIER_1688_DEFAULT_SELECTOR_RUNTIME: Supplier1688SelectorRuntime = {
  fileInputSelectors: SUPPLIER_1688_FILE_INPUT_SELECTORS,
  imageSearchEntrySelectors: SUPPLIER_1688_IMAGE_SEARCH_ENTRY_SELECTORS,
  searchResultReadySelectors: SUPPLIER_1688_SEARCH_RESULT_READY_SELECTORS,
  supplierReadySelectors: SUPPLIER_1688_SUPPLIER_READY_SELECTORS,
  submitSearchSelectors: SUPPLIER_1688_SUBMIT_SEARCH_SELECTORS,
  loginTextHints: SUPPLIER_1688_LOGIN_TEXT_HINTS,
  captchaTextHints: SUPPLIER_1688_CAPTCHA_TEXT_HINTS,
  accessBlockTextHints: SUPPLIER_1688_ACCESS_BLOCK_TEXT_HINTS,
  barrierTitleHints: SUPPLIER_1688_BARRIER_TITLE_HINTS,
  hardBlockingSelectors: SUPPLIER_1688_HARD_BLOCKING_SELECTORS,
  softBlockingSelectors: SUPPLIER_1688_SOFT_BLOCKING_SELECTORS,
  searchBodySignalPattern: SUPPLIER_1688_SEARCH_BODY_SIGNAL_PATTERN,
  supplierBodySignalPattern: SUPPLIER_1688_SUPPLIER_BODY_SIGNAL_PATTERN,
  priceTextPatternSource: SUPPLIER_1688_PRICE_TEXT_PATTERN_SOURCE,
};

const defineSupplier1688SelectorRegistryEntry = (
  definition: Supplier1688SelectorRegistryDefinition
): Supplier1688SelectorRegistryDefinition => definition;

const detectSupplier1688SelectorRegistryValueType = (
  value: Supplier1688SelectorRegistryValue
): Supplier1688SelectorRegistryValueType =>
  Array.isArray(value) ? 'string_array' : 'string';

export const SUPPLIER_1688_SELECTOR_REGISTRY_DEFINITIONS: Supplier1688SelectorRegistryDefinition[] = [
  defineSupplier1688SelectorRegistryEntry({
    key: 'supplier1688.imageSearch.fileInputs',
    label: '1688 image search file inputs',
    description: 'File input selectors used for local image upload in 1688 image search.',
    kind: 'selector',
    value: SUPPLIER_1688_FILE_INPUT_SELECTORS,
  }),
  defineSupplier1688SelectorRegistryEntry({
    key: 'supplier1688.imageSearch.entryTriggers',
    label: '1688 image search entry triggers',
    description: 'Selectors that reveal or open the 1688 image-search upload control.',
    kind: 'selector',
    value: SUPPLIER_1688_IMAGE_SEARCH_ENTRY_SELECTORS,
  }),
  defineSupplier1688SelectorRegistryEntry({
    key: 'supplier1688.imageSearch.resultLinks',
    label: '1688 image search result links',
    description: 'Offer-link selectors used to collect supplier candidate URLs.',
    kind: 'selector',
    value: SUPPLIER_1688_SEARCH_RESULT_READY_SELECTORS,
  }),
  defineSupplier1688SelectorRegistryEntry({
    key: 'supplier1688.imageSearch.submitButtons',
    label: '1688 image search submit buttons',
    description: 'Selectors used to submit a 1688 uploaded image search.',
    kind: 'selector',
    value: SUPPLIER_1688_SUBMIT_SEARCH_SELECTORS,
  }),
  defineSupplier1688SelectorRegistryEntry({
    key: 'supplier1688.supplierPage.readySignals',
    label: '1688 supplier page ready signals',
    description: 'Selectors indicating that a supplier product page has usable content.',
    kind: 'selector',
    value: SUPPLIER_1688_SUPPLIER_READY_SELECTORS,
  }),
  defineSupplier1688SelectorRegistryEntry({
    key: 'supplier1688.access.loginHints',
    label: '1688 login text hints',
    description: 'Text hints that indicate 1688 requires login before scanning can continue.',
    kind: 'text_hint',
    value: SUPPLIER_1688_LOGIN_TEXT_HINTS,
  }),
  defineSupplier1688SelectorRegistryEntry({
    key: 'supplier1688.access.captchaHints',
    label: '1688 captcha text hints',
    description: 'Text hints that indicate 1688 has shown captcha or verification.',
    kind: 'text_hint',
    value: SUPPLIER_1688_CAPTCHA_TEXT_HINTS,
  }),
  defineSupplier1688SelectorRegistryEntry({
    key: 'supplier1688.access.blockHints',
    label: '1688 access block text hints',
    description: 'Text hints that indicate 1688 has blocked access.',
    kind: 'text_hint',
    value: SUPPLIER_1688_ACCESS_BLOCK_TEXT_HINTS,
  }),
  defineSupplier1688SelectorRegistryEntry({
    key: 'supplier1688.access.barrierTitleHints',
    label: '1688 barrier title hints',
    description: 'Title hints that indicate a login, captcha, or access barrier.',
    kind: 'text_hint',
    value: SUPPLIER_1688_BARRIER_TITLE_HINTS,
  }),
  defineSupplier1688SelectorRegistryEntry({
    key: 'supplier1688.access.hardBlockingSelectors',
    label: '1688 hard blocking selectors',
    description: 'Selectors that indicate a hard login/access barrier.',
    kind: 'selector',
    value: SUPPLIER_1688_HARD_BLOCKING_SELECTORS,
  }),
  defineSupplier1688SelectorRegistryEntry({
    key: 'supplier1688.access.softBlockingSelectors',
    label: '1688 soft blocking selectors',
    description: 'Selectors that indicate captcha or verification friction.',
    kind: 'selector',
    value: SUPPLIER_1688_SOFT_BLOCKING_SELECTORS,
  }),
  defineSupplier1688SelectorRegistryEntry({
    key: 'supplier1688.content.searchBodySignalPattern',
    label: '1688 search body signal pattern',
    description: 'Body text pattern indicating image-search result content.',
    kind: 'pattern',
    value: SUPPLIER_1688_SEARCH_BODY_SIGNAL_PATTERN,
  }),
  defineSupplier1688SelectorRegistryEntry({
    key: 'supplier1688.content.supplierBodySignalPattern',
    label: '1688 supplier body signal pattern',
    description: 'Body text pattern indicating supplier product-page content.',
    kind: 'pattern',
    value: SUPPLIER_1688_SUPPLIER_BODY_SIGNAL_PATTERN,
  }),
  defineSupplier1688SelectorRegistryEntry({
    key: 'supplier1688.content.priceTextPattern',
    label: '1688 price text pattern',
    description: 'Pattern used to extract CNY supplier price text.',
    kind: 'pattern',
    value: SUPPLIER_1688_PRICE_TEXT_PATTERN_SOURCE,
  }),
];

export const SUPPLIER_1688_SELECTOR_REGISTRY_SEED_ENTRIES: Supplier1688SelectorRegistrySeedEntry[] =
  SUPPLIER_1688_SELECTOR_REGISTRY_DEFINITIONS.map((definition) => ({
    key: definition.key,
    profile: SUPPLIER_1688_SELECTOR_REGISTRY_PROFILE,
    label: definition.label,
    description: definition.description,
    kind: definition.kind,
    valueType: detectSupplier1688SelectorRegistryValueType(definition.value),
    valueJson: JSON.stringify(definition.value),
  }));

// ─── Native Runtime Resolver ──────────────────────────────────────────────────

const parseRuntimeValue = (
  valueJson: string,
  fallback: Supplier1688SelectorRegistryValue
): Supplier1688SelectorRegistryValue => {
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
  entries: readonly Supplier1688SelectorRegistryRuntimeEntry[]
): Map<string, Supplier1688SelectorRegistryValue> => {
  const fallbackByKey = new Map(
    SUPPLIER_1688_SELECTOR_REGISTRY_DEFINITIONS.map((definition) => [
      definition.key,
      definition.value,
    ])
  );

  return new Map(
    entries.map((entry) => {
      const fallback = fallbackByKey.get(entry.key) ?? '';
      return [entry.key, parseRuntimeValue(entry.valueJson, fallback)];
    })
  );
};

const readRuntimeStringArray = (
  values: Map<string, Supplier1688SelectorRegistryValue>,
  key: string,
  fallback: readonly string[]
): readonly string[] => {
  const value = values.get(key);
  return Array.isArray(value) ? value : fallback;
};

const readRuntimeString = (
  values: Map<string, Supplier1688SelectorRegistryValue>,
  key: string,
  fallback: string
): string => {
  const value = values.get(key);
  return typeof value === 'string' ? value : fallback;
};

export const resolveSupplier1688SelectorRuntimeFromEntries = (
  entries: readonly Supplier1688SelectorRegistryRuntimeEntry[]
): Supplier1688SelectorRuntime => {
  const values = runtimeValueMapFromEntries(entries);
  return {
    fileInputSelectors: readRuntimeStringArray(
      values,
      'supplier1688.imageSearch.fileInputs',
      SUPPLIER_1688_FILE_INPUT_SELECTORS
    ),
    imageSearchEntrySelectors: readRuntimeStringArray(
      values,
      'supplier1688.imageSearch.entryTriggers',
      SUPPLIER_1688_IMAGE_SEARCH_ENTRY_SELECTORS
    ),
    searchResultReadySelectors: readRuntimeStringArray(
      values,
      'supplier1688.imageSearch.resultLinks',
      SUPPLIER_1688_SEARCH_RESULT_READY_SELECTORS
    ),
    supplierReadySelectors: readRuntimeStringArray(
      values,
      'supplier1688.supplierPage.readySignals',
      SUPPLIER_1688_SUPPLIER_READY_SELECTORS
    ),
    submitSearchSelectors: readRuntimeStringArray(
      values,
      'supplier1688.imageSearch.submitButtons',
      SUPPLIER_1688_SUBMIT_SEARCH_SELECTORS
    ),
    loginTextHints: readRuntimeStringArray(
      values,
      'supplier1688.access.loginHints',
      SUPPLIER_1688_LOGIN_TEXT_HINTS
    ),
    captchaTextHints: readRuntimeStringArray(
      values,
      'supplier1688.access.captchaHints',
      SUPPLIER_1688_CAPTCHA_TEXT_HINTS
    ),
    accessBlockTextHints: readRuntimeStringArray(
      values,
      'supplier1688.access.blockHints',
      SUPPLIER_1688_ACCESS_BLOCK_TEXT_HINTS
    ),
    barrierTitleHints: readRuntimeStringArray(
      values,
      'supplier1688.access.barrierTitleHints',
      SUPPLIER_1688_BARRIER_TITLE_HINTS
    ),
    hardBlockingSelectors: readRuntimeStringArray(
      values,
      'supplier1688.access.hardBlockingSelectors',
      SUPPLIER_1688_HARD_BLOCKING_SELECTORS
    ),
    softBlockingSelectors: readRuntimeStringArray(
      values,
      'supplier1688.access.softBlockingSelectors',
      SUPPLIER_1688_SOFT_BLOCKING_SELECTORS
    ),
    searchBodySignalPattern: readRuntimeString(
      values,
      'supplier1688.content.searchBodySignalPattern',
      SUPPLIER_1688_SEARCH_BODY_SIGNAL_PATTERN
    ),
    supplierBodySignalPattern: readRuntimeString(
      values,
      'supplier1688.content.supplierBodySignalPattern',
      SUPPLIER_1688_SUPPLIER_BODY_SIGNAL_PATTERN
    ),
    priceTextPatternSource: readRuntimeString(
      values,
      'supplier1688.content.priceTextPattern',
      SUPPLIER_1688_PRICE_TEXT_PATTERN_SOURCE
    ),
  };
};
