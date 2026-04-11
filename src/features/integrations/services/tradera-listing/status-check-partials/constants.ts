export const STATUS_CHECK_CONSTANTS = String.raw`
  const INITIAL_SECTION_URL = 'https://www.tradera.com/en/my/listings';
  const ACTIVE_SEARCH_SELECTORS = [
    'main input[type="search"]',
    'main [role="searchbox"]',
    'main input[type="text"]',
    'main input',
    'input[type="search"]',
    'input[placeholder*="Search"]',
    'input[placeholder*="Sök"]',
    '[data-testid*="search"] input',
  ];
  const ACTIVE_SEARCH_SUBMIT_SELECTORS = [
    'main button:has-text("Search")',
    'main button:has-text("Sök")',
    'main [data-testid*="search"] button',
    'main button[type="submit"]',
  ];
  const ACTIVE_SEARCH_TRIGGER_LABELS = ['Search', 'Sök'];
  const GLOBAL_HEADER_SEARCH_HINTS = [
    'items, sellers or a category',
    'artiklar, säljare eller en kategori',
    'artiklar, säljare eller kategori',
    'what are you looking for',
    'vad letar du efter',
  ];
  const DUPLICATE_DESCRIPTION_TEXT_SELECTORS = [
    '[data-testid*="description"]',
    '[id*="description" i]',
    '[class*="description" i]',
    '[class*="Description"]',
    'article',
    'main',
  ];
  const COOKIE_SELECTORS = [
    '#onetrust-accept-btn-handler',
    'button:has-text("Acceptera alla cookies")',
    'button:has-text("Acceptera alla kakor")',
    'button:has-text("Acceptera alla")',
    'button:has-text("Accept all cookies")',
    'button:has-text("Accept all")',
    'button:has-text("Godkänn alla")',
  ];
  const SECTIONS = [
    {
      id: 'active',
      label: 'Active listings',
      url: 'https://www.tradera.com/en/my/listings',
      tabLabels: ['Active listings', 'Active', 'Aktiva annonser', 'Aktiva'],
      stateSelectors: [
        '[aria-current="page"]:has-text("Active")',
        '[aria-current="true"]:has-text("Active")',
        '[role="tab"][aria-selected="true"]:has-text("Active")',
        '[aria-current="page"]:has-text("Aktiva")',
        '[aria-current="true"]:has-text("Aktiva")',
        '[role="tab"][aria-selected="true"]:has-text("Aktiva")',
      ],
      searchStepId: 'search_active',
      inspectStepId: 'inspect_active',
    },
    {
      id: 'unsold',
      label: 'Unsold items',
      url: 'https://www.tradera.com/en/my/listings?tab=unsold',
      tabLabels: ['Unsold items', 'Unsold', 'Osålda objekt', 'Osålda'],
      stateSelectors: [
        '[aria-current="page"]:has-text("Unsold")',
        '[aria-current="true"]:has-text("Unsold")',
        '[role="tab"][aria-selected="true"]:has-text("Unsold")',
        '[aria-current="page"]:has-text("Osålda")',
        '[aria-current="true"]:has-text("Osålda")',
        '[role="tab"][aria-selected="true"]:has-text("Osålda")',
      ],
      searchStepId: 'search_unsold',
      inspectStepId: 'inspect_unsold',
    },
    {
      id: 'sold',
      label: 'Your sold items',
      url: 'https://www.tradera.com/en/my/sold',
      tabLabels: ['Your sold items', 'Sold items', 'Sold', 'Dina sålda', 'Sålda'],
      stateSelectors: [
        '[aria-current="page"]:has-text("Sold")',
        '[aria-current="true"]:has-text("Sold")',
        '[role="tab"][aria-selected="true"]:has-text("Sold")',
        '[aria-current="page"]:has-text("Sålda")',
        '[aria-current="true"]:has-text("Sålda")',
        '[role="tab"][aria-selected="true"]:has-text("Sålda")',
      ],
      searchStepId: 'search_sold',
      inspectStepId: 'inspect_sold',
    },
  ];

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const normalizeWhitespace = (value) =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();

  const humanClick = async (locator, options = {}) => {
    if (!locator) return;
    const { pauseBefore = 400, pauseAfter = 400 } = options;
    if (pauseBefore > 0) await wait(pauseBefore);
    await locator.scrollIntoViewIfNeeded().catch(() => undefined);
    await locator.click({ force: true }).catch(() => undefined);
    if (pauseAfter > 0) await wait(pauseAfter);
  };

  const humanType = async (locator, text, options = {}) => {
    if (!locator) return;
    const { pauseBefore = 400, pauseAfter = 400, delay = 45 } = options;
    if (pauseBefore > 0) await wait(pauseBefore);
    await locator.scrollIntoViewIfNeeded().catch(() => undefined);
    await locator.focus().catch(() => undefined);
    await locator.fill('').catch(() => undefined);
    await locator.type(text, { delay }).catch(() => undefined);
    if (pauseAfter > 0) await wait(pauseAfter);
  };

  const humanPress = async (key, options = {}) => {
    const { pauseBefore = 200, pauseAfter = 400 } = options;
    if (pauseBefore > 0) await wait(pauseBefore);
    await page.keyboard.press(key).catch(() => undefined);
    if (pauseAfter > 0) await wait(pauseAfter);
  };

  const firstVisible = async (selectors, root = page) => {
    for (const selector of selectors) {
      const locator = root.locator(selector).first();
      const count = await locator.count().catch(() => 0);
      if (!count) continue;
      const visible = await locator.isVisible().catch(() => false);
      if (visible) return locator;
    }
    return null;
  };

  const firstVisibleWithin = async (root, selectors) => firstVisible(selectors, root);

  const dismissCookiesIfPresent = async () => {
    const cookieButton = await firstVisible(COOKIE_SELECTORS);
    if (cookieButton) {
      log?.('tradera.status.cookie_dismiss');
      await humanClick(cookieButton, { pauseAfter: 800 });
      return true;
    }
    return false;
  };
`;
