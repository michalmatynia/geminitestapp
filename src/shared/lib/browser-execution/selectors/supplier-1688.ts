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

// ─── Runtime Generator ────────────────────────────────────────────────────────

/** Serialise a string as a single-quoted JS literal, escaping backslashes and single quotes. */
const jsStr = (s: string): string => `'${s.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`;

/** Serialise an array of strings as a single-quoted JS array literal. */
const jsStrArray = (arr: readonly string[]): string =>
  `[${  arr.map(jsStr).join(', ')  }]`;

export const generateSupplier1688SelectorRegistryRuntime = (): string =>
  [
    '// --- 1688 supplier selector registry ---',
    `const SUPPLIER_1688_FILE_INPUT_SELECTORS = ${jsStrArray(SUPPLIER_1688_FILE_INPUT_SELECTORS)};`,
    `const SUPPLIER_1688_IMAGE_SEARCH_ENTRY_SELECTORS = ${jsStrArray(SUPPLIER_1688_IMAGE_SEARCH_ENTRY_SELECTORS)};`,
    `const SUPPLIER_1688_SEARCH_RESULT_READY_SELECTORS = ${jsStrArray(SUPPLIER_1688_SEARCH_RESULT_READY_SELECTORS)};`,
    `const SUPPLIER_1688_SUPPLIER_READY_SELECTORS = ${jsStrArray(SUPPLIER_1688_SUPPLIER_READY_SELECTORS)};`,
    `const SUPPLIER_1688_SUBMIT_SEARCH_SELECTORS = ${jsStrArray(SUPPLIER_1688_SUBMIT_SEARCH_SELECTORS)};`,
    `const SUPPLIER_1688_LOGIN_TEXT_HINTS = ${jsStrArray(SUPPLIER_1688_LOGIN_TEXT_HINTS)};`,
    `const SUPPLIER_1688_CAPTCHA_TEXT_HINTS = ${jsStrArray(SUPPLIER_1688_CAPTCHA_TEXT_HINTS)};`,
    `const SUPPLIER_1688_ACCESS_BLOCK_TEXT_HINTS = ${jsStrArray(SUPPLIER_1688_ACCESS_BLOCK_TEXT_HINTS)};`,
    `const SUPPLIER_1688_BARRIER_TITLE_HINTS = ${jsStrArray(SUPPLIER_1688_BARRIER_TITLE_HINTS)};`,
    `const SUPPLIER_1688_HARD_BLOCKING_SELECTORS = ${jsStrArray(SUPPLIER_1688_HARD_BLOCKING_SELECTORS)};`,
    `const SUPPLIER_1688_SOFT_BLOCKING_SELECTORS = ${jsStrArray(SUPPLIER_1688_SOFT_BLOCKING_SELECTORS)};`,
    `const SUPPLIER_1688_SEARCH_BODY_SIGNAL_PATTERN = ${jsStr(SUPPLIER_1688_SEARCH_BODY_SIGNAL_PATTERN)};`,
    `const SUPPLIER_1688_SUPPLIER_BODY_SIGNAL_PATTERN = ${jsStr(SUPPLIER_1688_SUPPLIER_BODY_SIGNAL_PATTERN)};`,
    `const PRICE_TEXT_PATTERN = new RegExp(${jsStr(SUPPLIER_1688_PRICE_TEXT_PATTERN_SOURCE)});`,
  ].join('\n');

export const SUPPLIER_1688_SELECTOR_REGISTRY_RUNTIME =
  generateSupplier1688SelectorRegistryRuntime();
