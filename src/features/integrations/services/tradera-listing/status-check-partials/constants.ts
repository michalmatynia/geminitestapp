import { TRADERA_SELECTOR_REGISTRY_RUNTIME } from '@/shared/lib/browser-execution/selectors/tradera';

export const buildStatusCheckConstants = (
  selectorRegistryRuntime: string = TRADERA_SELECTOR_REGISTRY_RUNTIME
): string => String.raw`
  const INITIAL_SECTION_URL = 'https://www.tradera.com/en/my/listings';

${selectorRegistryRuntime}

  const COOKIE_SELECTORS = COOKIE_ACCEPT_SELECTORS;

  const SECTIONS = [
    {
      id: 'active',
      label: 'Active listings',
      url: 'https://www.tradera.com/en/my/listings',
      tabLabels: ['Active listings', 'Active', 'Aktiva annonser', 'Aktiva'],
      stateSelectors: ACTIVE_TAB_STATE_SELECTORS,
      searchStepId: 'search_active',
      inspectStepId: 'inspect_active',
    },
    {
      id: 'unsold',
      label: 'Unsold items',
      url: 'https://www.tradera.com/en/my/listings?tab=unsold',
      tabLabels: ['Unsold items', 'Unsold', 'Osålda objekt', 'Osålda'],
      stateSelectors: UNSOLD_TAB_STATE_SELECTORS,
      searchStepId: 'search_unsold',
      inspectStepId: 'inspect_unsold',
    },
    {
      id: 'sold',
      label: 'Your sold items',
      url: 'https://www.tradera.com/en/my/sold',
      tabLabels: ['Your sold items', 'Sold items', 'Sold', 'Dina sålda', 'Sålda'],
      stateSelectors: SOLD_TAB_STATE_SELECTORS,
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

export const STATUS_CHECK_CONSTANTS = buildStatusCheckConstants();
