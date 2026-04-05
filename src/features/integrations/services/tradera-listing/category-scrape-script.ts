import {
  TRADERA_AUTH_ERROR_SELECTORS,
  TRADERA_CAPTCHA_HINTS,
  TRADERA_MANUAL_VERIFICATION_TEXT_HINTS,
  TRADERA_MANUAL_VERIFICATION_URL_HINTS,
} from './config';

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
  const TRADERA_AUTH_ERROR_SELECTORS = ${JSON.stringify(TRADERA_AUTH_ERROR_SELECTORS)};
  const TRADERA_CAPTCHA_HINTS = ${JSON.stringify(TRADERA_CAPTCHA_HINTS)};
  const TRADERA_MANUAL_VERIFICATION_TEXT_HINTS = ${JSON.stringify(TRADERA_MANUAL_VERIFICATION_TEXT_HINTS)};
  const TRADERA_MANUAL_VERIFICATION_URL_HINTS = ${JSON.stringify(TRADERA_MANUAL_VERIFICATION_URL_HINTS)};
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

  const includesAnyHint = (value, hints) => {
    const normalized = toTrimmedText(value).toLowerCase();
    if (!normalized) return false;
    return hints.some((hint) => normalized.includes(toTrimmedText(hint).toLowerCase()));
  };

  const readVisibleText = async (selectors) => {
    for (const selector of selectors) {
      const locator = page.locator(selector);
      const count = await locator.count().catch(() => 0);
      if (!count) continue;

      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible) continue;
        const text = await candidate.innerText().catch(() => '');
        if (toTrimmedText(text)) {
          return toTrimmedText(text);
        }
      }
    }
    return '';
  };

  const readAuthText = async () => {
    const authErrorText = await readVisibleText(TRADERA_AUTH_ERROR_SELECTORS);
    if (authErrorText) {
      return authErrorText;
    }

    const headingText = await readVisibleText(['h1', 'h2', '[role="heading"]']);
    if (headingText) {
      return headingText;
    }

    const main = page.locator('main').first();
    const mainVisible = await main.isVisible().catch(() => false);
    if (!mainVisible) {
      return '';
    }

    return toTrimmedText(await main.innerText().catch(() => ''));
  };

  const readAuthDiagnostics = async () => {
    const currentUrl = page.url();
    const normalizedUrl = currentUrl.toLowerCase();
    const loginPage = await isLoginPage().catch(() => false);
    const errorText = await readAuthText();
    const normalizedErrorText = errorText.toLowerCase();
    const captchaDetected =
      includesAnyHint(normalizedErrorText, TRADERA_CAPTCHA_HINTS) ||
      includesAnyHint(
        normalizedUrl,
        TRADERA_MANUAL_VERIFICATION_URL_HINTS.filter((hint) =>
          String(hint).toLowerCase().includes('captcha')
        )
      );
    const manualVerificationDetected =
      captchaDetected ||
      includesAnyHint(normalizedErrorText, TRADERA_MANUAL_VERIFICATION_TEXT_HINTS) ||
      includesAnyHint(normalizedUrl, TRADERA_MANUAL_VERIFICATION_URL_HINTS);

    let recoveryMessage = '';
    if (loginPage) {
      recoveryMessage =
        'Tradera browser session is missing or expired. Reconnect the browser Tradera connection and retry category fetch.';
    } else if (captchaDetected) {
      recoveryMessage =
        'Stored Tradera session expired and Tradera requires manual verification (captcha). Refresh the saved browser session.';
    } else if (manualVerificationDetected) {
      recoveryMessage =
        'Stored Tradera session expired and Tradera requires manual verification. Refresh the saved browser session.';
    }

    return {
      currentUrl,
      errorText,
      loginPage,
      captchaDetected,
      manualVerificationDetected,
      authRequired: loginPage || manualVerificationDetected,
      recoveryMessage,
    };
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

    const escaped = label.replace(/"/g, '\\"');
    const escapedPattern = label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&');
    const mainRoot = page.locator('main').first();
    const mainRootVisible = await mainRoot.isVisible().catch(() => false);
    const root = mainRootVisible ? mainRoot : page;

    // Exact-match role searches
    for (const role of ['button', 'menu', 'link', 'combobox']) {
      const matches = root.getByRole(role, {
        name: new RegExp('^' + escapedPattern + '\$', 'i'),
      });
      const count = await matches.count().catch(() => 0);
      for (let index = 0; index < count; index += 1) {
        const candidate = matches.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (visible) return candidate;
      }
    }

    // Contains-match role searches (less strict)
    for (const role of ['button', 'menu', 'link', 'combobox']) {
      const matches = root.getByRole(role, {
        name: new RegExp(escapedPattern, 'i'),
      });
      const count = await matches.count().catch(() => 0);
      for (let index = 0; index < count; index += 1) {
        const candidate = matches.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (visible) return candidate;
      }
    }

    // Exact text in an ancestor button/link/div/label
    const exactTextTrigger = root
      .locator(
        'xpath=//*[normalize-space(text())="' +
          escaped +
          '"]/ancestor-or-self::*[self::button or self::a or @role="button" or @role="link" or @role="menu" or self::div or self::label][1]'
      )
      .first();
    const exactTextVisible = await exactTextTrigger.isVisible().catch(() => false);
    if (exactTextVisible) return exactTextTrigger;

    // Exact text followed by a sibling interactive element
    const labeledControlTrigger = root
      .locator(
        'xpath=//*[normalize-space(text())="' +
          escaped +
          '"]/following::*[(self::button or self::a or @role="button" or @role="link" or @role="menu" or @role="combobox" or @aria-haspopup="listbox" or @aria-haspopup="menu" or @aria-controls or @aria-expanded)][1]'
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

  const CHILDREN_KEYS = ['children', 'subCategories', 'subcategories', 'sub', 'items', 'nodes', 'categories'];

  const itemId = (item) =>
    String(item.id ?? item.categoryId ?? item.Id ?? item.CategoryId ?? item.value ?? '');

  const itemName = (item) =>
    String(item.name ?? item.label ?? item.title ?? item.Name ?? item.Label ?? item.Title ?? '');

  const itemParentId = (item) =>
    String(item.parentId ?? item.parent ?? item.parentCategoryId ?? item.ParentId ?? item.ParentCategoryId ?? '');

  const flattenCategoryTree = (items, parentId) => {
    const flat = [];
    if (!Array.isArray(items)) return flat;
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const id = itemId(item);
      const name = itemName(item);
      if (!id && !name) continue;
      const explicitParent = itemParentId(item);
      flat.push({
        id,
        name,
        parentId: explicitParent || parentId || '',
      });
      for (const key of CHILDREN_KEYS) {
        if (Array.isArray(item[key]) && item[key].length > 0) {
          flat.push(...flattenCategoryTree(item[key], id));
        }
      }
    }
    return flat;
  };

  const isCategoryLikeArray = (arr) =>
    arr.length > 2 && arr.some((item) =>
      item && typeof item === 'object' &&
      (itemId(item) || itemName(item)) &&
      (itemId(item) !== '' || itemName(item) !== '')
    );

  const deepSearchCategories = (obj, depth) => {
    const all = [];
    if (depth > 12 || !obj || typeof obj !== 'object') return all;
    if (Array.isArray(obj)) {
      if (isCategoryLikeArray(obj)) {
        all.push(...flattenCategoryTree(obj, ''));
      }
      for (const item of obj) {
        all.push(...deepSearchCategories(item, depth + 1));
      }
    } else {
      // Check if this single object is a category tree root with children
      for (const key of CHILDREN_KEYS) {
        if (Array.isArray(obj[key]) && isCategoryLikeArray(obj[key])) {
          all.push(...flattenCategoryTree(obj[key], itemId(obj) || ''));
        }
      }
      for (const value of Object.values(obj)) {
        all.push(...deepSearchCategories(value, depth + 1));
      }
    }
    return all;
  };

  const scrapeNextDataCategories = async () => {
    const rawCategories = await page.evaluate((childKeys) => {
      const script = document.getElementById('__NEXT_DATA__');
      if (!script || !script.textContent) return [];
      try {
        const data = JSON.parse(script.textContent);
        const flat = [];
        const getId = (item) =>
          String(item.id ?? item.categoryId ?? item.Id ?? item.CategoryId ?? item.value ?? '');
        const getName = (item) =>
          String(item.name ?? item.label ?? item.title ?? item.Name ?? item.Label ?? item.Title ?? '');
        const getParent = (item) =>
          String(item.parentId ?? item.parent ?? item.parentCategoryId ?? item.ParentId ?? item.ParentCategoryId ?? '');
        const flatten = (items, pId) => {
          if (!Array.isArray(items)) return;
          for (const item of items) {
            if (!item || typeof item !== 'object') continue;
            const id = getId(item);
            const name = getName(item);
            if (!id && !name) continue;
            flat.push({ id, name, parentId: getParent(item) || pId || '' });
            for (const key of childKeys) {
              if (Array.isArray(item[key]) && item[key].length > 0) {
                flatten(item[key], id);
              }
            }
          }
        };
        const isCatLike = (arr) =>
          arr.length > 2 && arr.some((i) => i && typeof i === 'object' && (getId(i) || getName(i)));
        const search = (obj, depth) => {
          if (depth > 12 || !obj || typeof obj !== 'object') return;
          if (Array.isArray(obj)) {
            if (isCatLike(obj)) flatten(obj, '');
            for (const item of obj) search(item, depth + 1);
          } else {
            for (const key of childKeys) {
              if (Array.isArray(obj[key]) && isCatLike(obj[key])) {
                flatten(obj[key], getId(obj) || '');
              }
            }
            for (const value of Object.values(obj)) search(value, depth + 1);
          }
        };
        search(data, 0);
        return flat;
      } catch {
        return [];
      }
    }, CHILDREN_KEYS).catch(() => []);
    return dedupeCategories(rawCategories);
  };

  const extractNetworkCategories = (responses) => {
    const raw = [];
    for (const entry of responses) {
      raw.push(...deepSearchCategories(entry.data, 0));
    }
    return dedupeCategories(raw);
  };

  const scrapeCategoryLinks = async () => {
    const rawCategories = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/category/"]');
      const results = [];
      for (const link of links) {
        const href = link.getAttribute('href') || '';
        const match = href.match(/\/category\/(\d+)/);
        if (!match) continue;
        const id = match[1];
        const name = (link.textContent || '').trim();
        // Walk up the DOM to find parent category via nesting (ul > li > ul > li pattern)
        let parentId = '';
        const parentLi = link.closest('li');
        if (parentLi) {
          const parentUl = parentLi.parentElement;
          if (parentUl && (parentUl.tagName === 'UL' || parentUl.tagName === 'OL')) {
            const grandparentLi = parentUl.closest('li');
            if (grandparentLi && grandparentLi !== parentLi) {
              const parentLink = grandparentLi.querySelector(':scope > a[href*="/category/"]');
              if (parentLink) {
                const parentMatch = (parentLink.getAttribute('href') || '').match(/\/category\/(\d+)/);
                if (parentMatch) {
                  parentId = parentMatch[1];
                }
              }
            }
          }
        }
        results.push({ id, name, parentId });
      }
      return results;
    }).catch(() => []);
    return dedupeCategories(rawCategories);
  };

  const runPageDiagnostics = async () => {
    return page.evaluate(() => {
      const selectCount = document.querySelectorAll('select').length;
      const roleMenuCount = document.querySelectorAll('[role="menu"]').length;
      const roleListboxCount = document.querySelectorAll('[role="listbox"]').length;
      const roleComboboxCount = document.querySelectorAll('[role="combobox"]').length;
      const roleButtonCount = document.querySelectorAll('[role="button"]').length;
      const categoryLinks = document.querySelectorAll('a[href*="/category/"]').length;
      const hasNextData = !!document.getElementById('__NEXT_DATA__');
      const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
        .slice(0, 5)
        .map((h) => (h.textContent || '').trim());
      const bodyClasses = document.body ? document.body.className : '';
      return {
        pageUrl: window.location.href,
        title: document.title,
        hasMain: !!document.querySelector('main'),
        hasForm: !!document.querySelector('form'),
        selectCount,
        roleMenuCount,
        roleListboxCount,
        roleComboboxCount,
        roleButtonCount,
        categoryLinks,
        hasNextData,
        headings,
        bodyClasses,
      };
    }).catch(() => ({ error: 'diagnostics failed' }));
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

  // Set up network interception for category API responses
  const networkCategoryResponses = [];
  page.on('response', async (response) => {
    try {
      const url = response.url().toLowerCase();
      const isCategoryLike = url.includes('categor') || url.includes('taxonomy');
      const contentType = (response.headers()['content-type'] || '');
      if (isCategoryLike && response.status() === 200 && contentType.includes('json')) {
        const body = await response.json();
        networkCategoryResponses.push({ url: response.url(), data: body });
      }
    } catch {
      // Response might not be JSON — safe to ignore.
    }
  });

  await acceptCookiesIfPresent().catch(() => undefined);
  await wait(400);

  const initialAuthDiagnostics = await readAuthDiagnostics();
  if (initialAuthDiagnostics.authRequired) {
    await captureDebugArtifacts('tradera-category-auth-required', {
      ...initialAuthDiagnostics,
      configuredListingUrl,
    });
    throw new Error(
      'AUTH_REQUIRED: ' +
        (initialAuthDiagnostics.recoveryMessage ||
          'Tradera browser session is missing or expired. Reconnect the browser Tradera connection and retry category fetch.')
    );
  }

  // Strategy 1: Try __NEXT_DATA__ extraction (instant, no interaction needed)
  const nextDataCategories = await scrapeNextDataCategories();
  log('tradera.category.scrape.nextdata', {
    count: nextDataCategories.length,
    currentUrl: page.url(),
  });
  if (nextDataCategories.length > 0) {
    const result = {
      categories: nextDataCategories,
      categorySource: 'nextdata',
      scrapedFrom: page.url(),
    };
    emit('result', result);
    return result;
  }

  // Wait for form readiness
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const hasSelect = Boolean(await findCategorySelect());
    const hasCategorySection = Boolean(await firstVisible(CATEGORY_SECTION_READY_SELECTORS));
    if (hasSelect || hasCategorySection) {
      break;
    }
    let hasTrigger = false;
    for (const label of CATEGORY_FIELD_LABELS) {
      const trigger = await findFieldTriggerByLabel(label);
      if (trigger) {
        hasTrigger = true;
        break;
      }
    }
    if (hasTrigger) {
      break;
    }
    // Also break if any category links are on the page already
    const linkCount = await page.locator('a[href*="/category/"]').count().catch(() => 0);
    if (linkCount > 3) {
      break;
    }
    await wait(400);
  }

  // Re-check auth after readiness wait (page may have redirected)
  const postWaitAuth = await readAuthDiagnostics();
  if (postWaitAuth.authRequired) {
    await captureDebugArtifacts('tradera-category-auth-required', {
      ...postWaitAuth,
      configuredListingUrl,
    });
    throw new Error(
      'AUTH_REQUIRED: ' +
        (postWaitAuth.recoveryMessage ||
          'Tradera browser session is missing or expired. Reconnect the browser Tradera connection and retry category fetch.')
    );
  }

  // Strategy 2: Native <select> scrape
  const selectCategories = await scrapeSelectCategories();
  log('tradera.category.scrape.select', {
    count: selectCategories.length,
    currentUrl: page.url(),
  });

  // Strategy 3: Menu/trigger-based scrape (clicks the category picker open)
  const menuCategories = selectCategories.length > 0 ? [] : await scrapeMenuCategories();
  if (selectCategories.length === 0) {
    log('tradera.category.scrape.menu', {
      count: menuCategories.length,
      currentUrl: page.url(),
    });
  }

  let categories = selectCategories.length > 0 ? selectCategories : menuCategories;
  let categorySource = selectCategories.length > 0 ? 'select' : 'menu';

  // Strategy 4: Check network-intercepted API responses (from page load + trigger click)
  if (categories.length === 0 && networkCategoryResponses.length > 0) {
    categories = extractNetworkCategories(networkCategoryResponses);
    if (categories.length > 0) {
      categorySource = 'network';
    }
    log('tradera.category.scrape.network', {
      count: categories.length,
      interceptedResponses: networkCategoryResponses.length,
      urls: networkCategoryResponses.map((r) => r.url),
    });
  }

  // Strategy 5: Link-based scraping (find <a href="*/category/*"> links)
  if (categories.length === 0) {
    categories = await scrapeCategoryLinks();
    if (categories.length > 0) {
      categorySource = 'links';
    }
    log('tradera.category.scrape.links', {
      count: categories.length,
      currentUrl: page.url(),
    });
  }

  // If still empty, capture full diagnostics
  if (categories.length === 0) {
    const emptyAuthDiagnostics = await readAuthDiagnostics();
    if (emptyAuthDiagnostics.authRequired) {
      log('tradera.category.scrape.auth-required', {
        ...emptyAuthDiagnostics,
        configuredListingUrl,
      });
      await captureDebugArtifacts('tradera-category-auth-required', {
        ...emptyAuthDiagnostics,
        configuredListingUrl,
      });
      throw new Error(
        'AUTH_REQUIRED: ' +
          (emptyAuthDiagnostics.recoveryMessage ||
            'Tradera browser session is missing or expired. Reconnect the browser Tradera connection and retry category fetch.')
      );
    }

    const diagnostics = await runPageDiagnostics();
    const state = {
      ...emptyAuthDiagnostics,
      configuredListingUrl,
      diagnostics,
      networkIntercepted: networkCategoryResponses.length,
    };
    log('tradera.category.scrape.empty', state);
    await captureDebugArtifacts('tradera-category-empty', state);
  }

  const result = {
    categories,
    categorySource,
    scrapedFrom: page.url(),
  };
  emit('result', result);
  return result;
}
`;
