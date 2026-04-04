const LOGIN_FORM_SELECTORS = [
  '#sign-in-form',
  'form[data-sign-in-form="true"]',
  'form[action*="login"]',
];

const COOKIE_ACCEPT_SELECTORS = [
  '#onetrust-accept-btn-handler',
  'button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  'button:has-text("Accept all cookies")',
  'button:has-text("Accept all")',
  'button:has-text("Acceptera alla cookies")',
  'button:has-text("Acceptera alla kakor")',
  'button:has-text("Godkänn alla cookies")',
  'button:has-text("Tillåt alla cookies")',
];

const CATEGORY_FIELD_LABELS = ['Category', 'Kategori'];

const CATEGORY_SECTION_READY_SELECTORS = [
  'section[data-validation-error-anchor="category"]',
  '[data-test-category-chooser="true"]',
];

const CATEGORY_TRIGGER_DIRECT_SELECTORS = [
  '[data-test-category-chooser="true"] [data-verify-test-category-picker-trigger-syi="true"]',
  '[data-test-category-chooser="true"] [role="menu"]',
  '[data-test-category-chooser="true"] [role="button"]',
  '[data-test-category-chooser="true"] [role="combobox"]',
  '[data-test-category-chooser="true"] [aria-haspopup="menu"]',
  '[data-test-category-chooser="true"] [aria-haspopup="listbox"]',
  '[data-test-category-chooser="true"] [aria-controls][aria-expanded]',
  '[data-test-category-chooser="true"] button[aria-expanded]',
  'section[data-validation-error-anchor="category"] [role="button"]',
  'section[data-validation-error-anchor="category"] [role="combobox"]',
  'section[data-validation-error-anchor="category"] [aria-haspopup="menu"]',
  'section[data-validation-error-anchor="category"] [aria-haspopup="listbox"]',
  'section[data-validation-error-anchor="category"] [aria-controls][aria-expanded]',
  'section[data-validation-error-anchor="category"] button[aria-expanded]',
];

const CATEGORY_SELECTORS = [
  'select[name*="category"]',
  '#category',
  '[data-testid*="category"] select',
];

const CATEGORY_MENU_SCOPE_SELECTORS = ['[role="menu"]', '[role="listbox"]', '[role="dialog"]'];

const CATEGORY_MENU_ITEM_SELECTORS = [
  '[role="menuitem"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="radio"]',
  'button',
  '[data-category-id]',
  '[data-id]',
  '[data-value]',
  '[value]',
];

export const DEFAULT_TRADERA_CATEGORY_SCRAPE_SCRIPT = String.raw`export default async function run({
  page,
  input,
  emit,
  artifacts,
  log,
  helpers,
}) {
  const LOGIN_FORM_SELECTORS = ${JSON.stringify(LOGIN_FORM_SELECTORS)};
  const COOKIE_ACCEPT_SELECTORS = ${JSON.stringify(COOKIE_ACCEPT_SELECTORS)};
  const CATEGORY_FIELD_LABELS = ${JSON.stringify(CATEGORY_FIELD_LABELS)};
  const CATEGORY_SECTION_READY_SELECTORS = ${JSON.stringify(CATEGORY_SECTION_READY_SELECTORS)};
  const CATEGORY_TRIGGER_DIRECT_SELECTORS = ${JSON.stringify(CATEGORY_TRIGGER_DIRECT_SELECTORS)};
  const CATEGORY_SELECTORS = ${JSON.stringify(CATEGORY_SELECTORS)};
  const CATEGORY_MENU_SCOPE_SELECTORS = ${JSON.stringify(CATEGORY_MENU_SCOPE_SELECTORS)};
  const CATEGORY_MENU_ITEM_SELECTORS = ${JSON.stringify(CATEGORY_MENU_ITEM_SELECTORS)};
  const configuredListingUrl =
    typeof input?.traderaConfig?.listingFormUrl === 'string' &&
    input.traderaConfig.listingFormUrl.trim()
      ? input.traderaConfig.listingFormUrl.trim()
      : page.url();

  const wait = async (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, Math.max(0, Math.trunc(ms)));
    });

  const toTrimmedText = (value) =>
    typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

  const normalizeParentId = (value) => {
    const normalized = toTrimmedText(value);
    if (!normalized || normalized === '0' || normalized.toLowerCase() === 'null') {
      return '0';
    }
    return normalized;
  };

  const normalizeCategoryId = (candidate) => {
    if (candidate == null) return '';
    const normalized = toTrimmedText(String(candidate));
    if (!normalized) return '';
    const match = normalized.match(/(?:^|[/?=&_-])(\d{2,})(?:$|[/?=&_-])/);
    return match && match[1] ? match[1] : normalized;
  };

  const isPlaceholderOption = (name) => {
    const normalized = toTrimmedText(name).toLowerCase();
    return (
      !normalized ||
      normalized === 'category' ||
      normalized === 'kategori' ||
      normalized.includes('select category') ||
      normalized.includes('välj kategori')
    );
  };

  const dedupeCategories = (categories) => {
    const byId = new Map();
    for (const category of categories) {
      const id = normalizeCategoryId(category?.id);
      const name = toTrimmedText(category?.name);
      if (!id || !name || isPlaceholderOption(name)) continue;
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          name,
          parentId: normalizeParentId(category?.parentId),
        });
      }
    }
    return Array.from(byId.values());
  };

  const firstVisible = async (selectors, root = page) => {
    for (const selector of selectors) {
      const locator = root.locator(selector);
      const count = await locator.count().catch(() => 0);
      if (!count) continue;

      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible) continue;
        return candidate;
      }
    }

    return null;
  };

  const acceptCookiesIfPresent = async () => {
    const trigger = await firstVisible(COOKIE_ACCEPT_SELECTORS);
    if (!trigger) return false;
    await helpers.click(trigger, { pauseBefore: false });
    await wait(600);
    return true;
  };

  const isLoginPage = async () => {
    if (page.url().toLowerCase().includes('/login')) return true;
    for (const selector of LOGIN_FORM_SELECTORS) {
      const visible = await page.locator(selector).first().isVisible().catch(() => false);
      if (visible) return true;
    }
    return false;
  };

  const findCategorySelect = async () => {
    let fallback = null;
    for (const selector of CATEGORY_SELECTORS) {
      const locator = page.locator(selector);
      const count = await locator.count().catch(() => 0);
      if (!count) continue;

      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        const optionCount = await candidate.locator('option').count().catch(() => 0);
        if (!optionCount) continue;
        const visible = await candidate.isVisible().catch(() => false);
        if (visible) return candidate;
        fallback = fallback || candidate;
      }
    }

    return fallback;
  };

  const scrapeSelectCategories = async () => {
    const categorySelect = await findCategorySelect();
    if (!categorySelect) return [];

    const options = await categorySelect.locator('option').evaluateAll((nodes) =>
      nodes.map((node) => {
        const option = node;
        const dataParentId =
          option.getAttribute('data-parent-id') ||
          option.getAttribute('parent-id') ||
          option.getAttribute('data-parent') ||
          option.getAttribute('data-parentid') ||
          '';
        return {
          id:
            option.value ||
            option.getAttribute('value') ||
            option.getAttribute('data-category-id') ||
            option.getAttribute('data-id') ||
            option.getAttribute('data-value') ||
            '',
          name: option.textContent || '',
          parentId: dataParentId,
        };
      })
    );

    return dedupeCategories(options);
  };

  const findFieldTriggerByLabel = async (label) => {
    for (const selector of CATEGORY_TRIGGER_DIRECT_SELECTORS) {
      const locator = page.locator(selector);
      const count = await locator.count().catch(() => 0);
      if (!count) continue;

      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (visible) return candidate;
      }
    }

    const escapedPattern = label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&');
    for (const role of ['button', 'menu', 'combobox']) {
      const matches = page.getByRole(role, {
        name: new RegExp('^' + escapedPattern + '\$', 'i'),
      });
      const count = await matches.count().catch(() => 0);
      for (let index = 0; index < count; index += 1) {
        const candidate = matches.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (visible) return candidate;
      }
    }

    const labeledControlTrigger = page
      .locator(
        'xpath=//*[normalize-space(text())="' +
          label.replace(/"/g, '\\"') +
          '"]/following::*[(self::button or @role="button" or @role="menu" or @role="combobox" or @aria-haspopup="listbox" or @aria-haspopup="menu" or @aria-controls or @aria-expanded)][1]'
      )
      .first();
    const labeledVisible = await labeledControlTrigger.isVisible().catch(() => false);
    return labeledVisible ? labeledControlTrigger : null;
  };

  const getVisibleMenuScopes = async () => {
    const scopes = [];
    for (const selector of CATEGORY_MENU_SCOPE_SELECTORS) {
      const locator = page.locator(selector);
      const count = await locator.count().catch(() => 0);
      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (visible) scopes.push(candidate);
      }
    }
    if (scopes.length > 0) {
      return scopes;
    }

    const main = page.locator('main').first();
    const mainVisible = await main.isVisible().catch(() => false);
    return mainVisible ? [main] : [];
  };

  const scrapeMenuCategories = async () => {
    for (const label of CATEGORY_FIELD_LABELS) {
      const trigger = await findFieldTriggerByLabel(label);
      if (!trigger) continue;
      await helpers.click(trigger, { pauseBefore: false });
      await wait(400);
      break;
    }

    const scopes = await getVisibleMenuScopes();
    if (scopes.length === 0) return [];

    const categories = [];
    for (const scope of scopes) {
      for (const selector of CATEGORY_MENU_ITEM_SELECTORS) {
        const locator = scope.locator(selector);
        const count = await locator.count().catch(() => 0);
        for (let index = 0; index < count; index += 1) {
          const candidate = locator.nth(index);
          const visible = await candidate.isVisible().catch(() => false);
          if (!visible) continue;

          const details = await candidate
            .evaluate((element) => {
              const idCandidate =
                element.getAttribute('data-category-id') ||
                element.getAttribute('data-id') ||
                element.getAttribute('data-value') ||
                element.getAttribute('value') ||
                element.id ||
                element.getAttribute('href') ||
                '';
              return {
                id: idCandidate,
                name: element.textContent || '',
                parentId:
                  element.getAttribute('data-parent-id') ||
                  element.getAttribute('data-parent') ||
                  '',
              };
            })
            .catch(() => null);

          if (details) {
            categories.push(details);
          }
        }
      }
    }

    return dedupeCategories(categories);
  };

  const captureDebugArtifacts = async (label, state) => {
    if (!artifacts) return;
    if (typeof artifacts.json === 'function') {
      await artifacts.json(label + '-state', state).catch(() => undefined);
    }
    if (typeof artifacts.screenshot === 'function') {
      await artifacts.screenshot(label).catch(() => undefined);
    }
    if (typeof artifacts.html === 'function') {
      await artifacts.html(label).catch(() => undefined);
    }
  };

  await acceptCookiesIfPresent().catch(() => undefined);
  await wait(400);

  if (await isLoginPage()) {
    await captureDebugArtifacts('tradera-category-auth-required', {
      currentUrl: page.url(),
      configuredListingUrl,
    });
    throw new Error(
      'AUTH_REQUIRED: Tradera browser session is missing or expired. Reconnect the browser Tradera connection and retry category fetch.'
    );
  }

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const hasSelect = Boolean(await findCategorySelect());
    const hasCategorySection = Boolean(await firstVisible(CATEGORY_SECTION_READY_SELECTORS));
    if (hasSelect || hasCategorySection) {
      break;
    }
    await wait(400);
  }

  const selectCategories = await scrapeSelectCategories();
  const categories =
    selectCategories.length > 0 ? selectCategories : await scrapeMenuCategories();

  if (categories.length === 0) {
    const state = {
      currentUrl: page.url(),
      configuredListingUrl,
      loginPage: await isLoginPage().catch(() => false),
    };
    log('tradera.category.scrape.empty', state);
    await captureDebugArtifacts('tradera-category-empty', state);
  }

  const result = {
    categories,
    categorySource: selectCategories.length > 0 ? 'select' : 'menu',
    scrapedFrom: page.url(),
  };
  emit('result', result);
  return result;
}
`;
