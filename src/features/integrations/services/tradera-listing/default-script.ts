export const DEFAULT_TRADERA_QUICKLIST_SCRIPT = String.raw`export default async function run({
  page,
  input,
  emit,
  artifacts,
  log,
}) {
  // tradera-quicklist-default:v39
  const ACTIVE_URL = 'https://www.tradera.com/en/my/listings?tab=active';
  const DIRECT_SELL_URL = 'https://www.tradera.com/en/selling/new';
  const LEGACY_SELL_URL = 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts';
  const configuredSellUrl =
    typeof input?.traderaConfig?.listingFormUrl === 'string' &&
    input.traderaConfig.listingFormUrl.trim()
      ? input.traderaConfig.listingFormUrl.trim()
      : null;
  const normalizedConfiguredSellUrl =
    configuredSellUrl === LEGACY_SELL_URL ? DIRECT_SELL_URL : configuredSellUrl;
  const SELL_URL_CANDIDATES = Array.from(
    new Set(
      [normalizedConfiguredSellUrl, DIRECT_SELL_URL, LEGACY_SELL_URL].filter(
        (value) => typeof value === 'string' && value.trim().length > 0
      )
    )
  );

  const TITLE_SELECTORS = [
    'input[name="shortDescription"]',
    '#shortDescription',
    'input[name="title"]',
    '#title',
    '[data-testid*="title"] input',
    'input[placeholder*="headline" i]',
    'input[placeholder*="rubrik" i]',
    'input[aria-label*="title" i]',
    'input[aria-label*="titel" i]',
    'input[aria-label*="rubrik" i]',
  ];
  const DESCRIPTION_SELECTORS = [
    '#tip-tap-editor',
    '[aria-label="Description"][contenteditable="true"]',
    '[aria-label="Beskrivning"][contenteditable="true"]',
    '[aria-label*="description" i][contenteditable="true"]',
    '[aria-label*="beskriv" i][contenteditable="true"]',
    'textarea[name="description"]',
    '#description',
    'textarea[placeholder*="description" i]',
    'textarea[placeholder*="beskriv" i]',
    '[data-testid*="description"] textarea',
    '[contenteditable="true"]',
    '[role="textbox"][contenteditable="true"]',
  ];
  const PRICE_SELECTORS = [
    'input[name="price_fixedPrice"]',
    '#price_fixedPrice',
    'input[name="price"]',
    '#price',
    'input[data-testid*="price"]',
    'input[inputmode="decimal"]',
    'input[placeholder*="price" i]',
    'input[placeholder*="pris" i]',
    'input[aria-label*="price" i]',
    'input[aria-label*="pris" i]',
  ];
  const IMAGE_INPUT_SELECTORS = [
    'input[type="file"][accept*="image"]',
    '[data-testid*="image"] input[type="file"]',
    '[data-testid*="photo"] input[type="file"]',
    '[data-testid*="upload"] input[type="file"]',
    'input[type="file"][name*="image" i]',
    'input[type="file"][name*="photo" i]',
    'input[type="file"]',
  ];
  const DRAFT_IMAGE_REMOVE_SELECTORS = [
    'button[aria-label*="Remove image" i]',
    'button[aria-label*="Delete image" i]',
    'button[aria-label*="Remove photo" i]',
    'button[aria-label*="Delete photo" i]',
    'button[aria-label*="Ta bort" i]',
    'button[aria-label*="Radera" i]',
    'a[aria-label*="Ta bort" i]',
    'a[aria-label*="Radera" i]',
    '[data-testid*="remove-image"]',
    '[data-testid*="delete-image"]',
    '[data-testid*="remove-photo"]',
    '[data-testid*="delete-photo"]',
    '[data-testid*="remove"]',
    '[data-testid*="delete"]',
    'button:has-text("Remove image")',
    'button:has-text("Delete image")',
    'button:has-text("Ta bort")',
    'button:has-text("Radera")',
    'a:has-text("Ta bort")',
    'a:has-text("Radera")',
  ];
  const CONTINUE_SELECTORS = [
    'button[aria-label*="Continue" i]',
    'button[aria-label*="Fortsätt" i]',
    'button[aria-label*="Next" i]',
    'button:has-text("Continue")',
    'button:has-text("Fortsätt")',
    'button:has-text("Next")',
    '[data-testid*="continue"]',
    '[data-testid*="next"]',
  ];
  const PUBLISH_SELECTORS = [
    'button[type="submit"]',
    'button[aria-label*="Publish" i]',
    'button[aria-label*="Review and publish" i]',
    'button[aria-label*="Publicera" i]',
    'button[aria-label*="Granska och publicera" i]',
    'button:has-text("Publish")',
    'button:has-text("Review and publish")',
    'button:has-text("Publicera")',
    'button:has-text("Granska och publicera")',
    'button:has-text("Lägg upp")',
    '[data-testid*="publish"]',
  ];
  const VALIDATION_MESSAGE_SELECTORS = [
    '[role="alert"]',
    '[aria-live="assertive"]',
    '[data-testid*="error"]',
    '[data-testid*="validation"]',
    '[aria-invalid="true"]',
    '.error-message',
    '.field-error',
  ];
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
  const ACTIVE_TAB_LABELS = ['Active', 'Aktiva'];
  const ACTIVE_TAB_STATE_SELECTORS = [
    '[aria-current="page"]:has-text("Active")',
    '[aria-current="true"]:has-text("Active")',
    '[role="tab"][aria-selected="true"]:has-text("Active")',
    '[aria-current="page"]:has-text("Aktiva")',
    '[aria-current="true"]:has-text("Aktiva")',
    '[role="tab"][aria-selected="true"]:has-text("Aktiva")',
  ];
  const LOGIN_FORM_SELECTORS = [
    '#sign-in-form',
    'form[data-sign-in-form="true"]',
    'form[action*="login"]',
  ];
  const LOGIN_SUCCESS_SELECTORS = [
    'a[href*="logout"]',
    'a:has-text("Logga ut")',
    'a:has-text("Logout")',
    'a:has-text("Mina sidor")',
    'a:has-text("My pages")',
    'button[aria-label*="Account"]',
    'button[aria-label*="Profile"]',
    'a[href*="/profile"]',
    'a[href*="/my"]',
  ];
  const USERNAME_SELECTORS = ['#email', 'input[name="email"]', 'input[type="email"]'];
  const PASSWORD_SELECTORS = ['#password', 'input[name="password"]', 'input[type="password"]'];
  const LOGIN_BUTTON_SELECTORS = [
    'button[data-login-submit="true"]',
    '#sign-in-form button[type="submit"]',
    'button:has-text("Sign in")',
    'button:has-text("Logga in")',
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
  const CREATE_LISTING_TRIGGER_SELECTORS = [
    'a[href*="/selling/new"]',
    'a[href*="/sell"]',
    'button:has-text("Create a New Listing")',
    'button:has-text("Create new listing")',
    'button:has-text("Skapa en ny annons")',
    'button:has-text("Skapa annons")',
    'button:has-text("Ny annons")',
    'a:has-text("Create a New Listing")',
    'a:has-text("Create new listing")',
    'a:has-text("Skapa en ny annons")',
    'a:has-text("Skapa annons")',
    'a:has-text("Ny annons")',
    '[data-testid*="create"]',
    '[data-testid*="new-listing"]',
  ];
  const CREATE_LISTING_TRIGGER_LABELS = [
    'Create a New Listing',
    'Create new listing',
    'Skapa en ny annons',
    'Skapa annons',
    'Ny annons',
  ];
  const CATEGORY_FIELD_LABELS = ['Category', 'Kategori'];
  const FALLBACK_CATEGORY_OPTION_LABELS = ['Other', 'Övrigt'];
  const FALLBACK_CATEGORY_MAX_DEPTH = 3;
  const LISTING_FORMAT_FIELD_LABELS = ['Listing format', 'Annonsformat'];
  const BUY_NOW_OPTION_LABELS = ['Buy now', 'Buy Now', 'Fixed price', 'Köp nu', 'Fast pris'];
  const CONDITION_FIELD_LABELS = ['Condition', 'Skick'];
  const CONDITION_OPTION_LABELS = [
    'Unused',
    'New without tags',
    'Ny utan etikett',
    'Helt ny',
    'Ny',
  ];
  const DEPARTMENT_FIELD_LABELS = ['Department', 'Avdelning'];
  const DEPARTMENT_OPTION_LABELS = ['Unisex', 'Dam/Herr', 'Women/Men'];
  const DELIVERY_FIELD_LABELS = ['Delivery', 'Leverans'];
  const DELIVERY_OPTION_LABELS = [
    'Buyer pays shipping',
    'Shipping paid by buyer',
    'Shipping paid by the buyer',
    'Buyer pays',
    'Köparen betalar frakten',
    'Köparen betalar',
    'Frakt betalas av köparen',
  ];
  const AUTOFILL_PENDING_SELECTORS = [
    'text=/Autofilling your listing/i',
    'text=/Autofilling/i',
    'text=/Fyller i din annons/i',
  ];

  const toText = (value) =>
    typeof value === 'string' && value.trim() ? value.trim() : null;
  const toNumber = (value) =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;
  const normalizeWhitespace = (value) =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  const normalizePriceValue = (value) => {
    const normalized = String(value || '')
      .replace(/\s+/g, '')
      .replace(/[^\d,.-]/g, '')
      .replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed.toFixed(2) : normalized;
  };

  const baseProductId = toText(input?.baseProductId) || toText(input?.productId) || 'product';
  const sku = toText(input?.sku);
  const username = toText(input?.username);
  const password = toText(input?.password);
  const title = toText(input?.title) || 'Listing ' + baseProductId;
  const rawDescription = toText(input?.description) || title;
  const description = rawDescription.includes('Item reference:')
    ? rawDescription
    : rawDescription + '\n\nItem reference: ' + baseProductId;
  const price = toNumber(input?.price) ?? 1;
  const mappedCategorySegments = Array.isArray(input?.traderaCategory?.segments)
    ? input.traderaCategory.segments
        .map((value) => toText(value))
        .filter((value) => typeof value === 'string')
    : [];
  const mappedCategoryPath =
    mappedCategorySegments.length > 0
      ? mappedCategorySegments.join(' > ')
      : toText(input?.traderaCategory?.path) || toText(input?.traderaCategory?.name);
  const configuredDeliveryOptionLabel = toText(input?.traderaShipping?.shippingCondition);
  const requiresConfiguredDeliveryOption = Boolean(configuredDeliveryOptionLabel);
  const deliveryOptionLabels = configuredDeliveryOptionLabel
    ? [
        configuredDeliveryOptionLabel,
        ...DELIVERY_OPTION_LABELS.filter(
          (label) =>
            normalizeWhitespace(label).toLowerCase() !==
            normalizeWhitespace(configuredDeliveryOptionLabel).toLowerCase()
        ),
      ]
    : DELIVERY_OPTION_LABELS;
  const imageUrls = Array.isArray(input?.imageUrls)
    ? input.imageUrls
        .map((value) => toText(value))
        .filter((value) => typeof value === 'string')
        .slice(0, 12)
    : [];
  const localImagePaths = Array.isArray(input?.localImagePaths)
    ? input.localImagePaths
        .map((value) => toText(value))
        .filter((value) => typeof value === 'string')
        .slice(0, 12)
    : [];

  const wait = async (ms) => {
    await page.waitForTimeout(ms);
  };

  const toSafeArtifactName = (value) =>
    String(value || 'artifact')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'artifact';

  const firstExisting = async (selectors) => {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      const count = await locator.count().catch(() => 0);
      if (count) return locator;
    }
    return null;
  };

  const firstVisible = async (selectors) => {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      const count = await locator.count().catch(() => 0);
      if (!count) continue;
      const visible = await locator.isVisible().catch(() => false);
      if (visible) return locator;
    }
    return null;
  };

  const isControlDisabled = async (locator) => {
    if (!locator) return true;
    return locator.isDisabled().catch(async () => {
      return locator
        .evaluate((element) => {
          return (
            element.hasAttribute('disabled') ||
            element.getAttribute('aria-disabled') === 'true'
          );
        })
        .catch(() => false);
    });
  };

  const collectValidationMessages = async () => {
    const messages = new Set();

    for (const selector of VALIDATION_MESSAGE_SELECTORS) {
      const locator = page.locator(selector);
      const count = await locator.count().catch(() => 0);
      if (!count) continue;

      for (let index = 0; index < Math.min(count, 8); index += 1) {
        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible) continue;

        const text = await candidate.innerText().catch(() => '');
        const normalized = text.trim().replace(/\s+/g, ' ');
        if (normalized) {
          messages.add(normalized.slice(0, 240));
          continue;
        }

        const fieldLabel = await candidate
          .evaluate((element) => {
            return (
              element.getAttribute('aria-label') ||
              element.getAttribute('name') ||
              element.getAttribute('id') ||
              ''
            );
          })
          .catch(() => '');
        const normalizedFieldLabel = fieldLabel.trim();
        if (normalizedFieldLabel) {
          messages.add('Invalid field: ' + normalizedFieldLabel);
        }
      }
    }

    return Array.from(messages).slice(0, 6);
  };

  const hasDeliveryValidationIssue = (messages) => {
    if (!Array.isArray(messages) || messages.length === 0) {
      return false;
    }

    return messages.some((message) =>
      /(delivery|shipping|ship|leverans|frakt)/i.test(String(message || ''))
    );
  };

  const acceptCookiesIfPresent = async () => {
    for (const selector of COOKIE_ACCEPT_SELECTORS) {
      const locator = page.locator(selector).first();
      const count = await locator.count().catch(() => 0);
      if (!count) continue;
      const visible = await locator.isVisible().catch(() => false);
      if (!visible) continue;
      await locator.click().catch(() => undefined);
      await wait(600);
      return true;
    }
    return false;
  };

  async function collectAuthState(extra = {}) {
    const successVisible = Boolean(await firstVisible(LOGIN_SUCCESS_SELECTORS));
    const loginFormVisible = Boolean(await firstVisible(LOGIN_FORM_SELECTORS));
    return {
      currentUrl: page.url(),
      pageTitle: await page.title().catch(() => null),
      successVisible,
      loginFormVisible,
      ...extra,
    };
  }

  async function captureFailureArtifacts(label, extra = {}) {
    if (!artifacts) return null;
    const safeName = toSafeArtifactName(label);
    const payload = await collectAuthState(extra);
    const [jsonResult, screenshotResult, htmlResult] = await Promise.allSettled([
      typeof artifacts.json === 'function' ? artifacts.json(safeName + '-state', payload) : null,
      typeof artifacts.screenshot === 'function' ? artifacts.screenshot(safeName) : null,
      typeof artifacts.html === 'function' ? artifacts.html(safeName) : null,
    ]);

    const captured = {
      label,
      state:
        jsonResult.status === 'fulfilled' && typeof jsonResult.value === 'string'
          ? jsonResult.value
          : null,
      screenshot:
        screenshotResult.status === 'fulfilled' && typeof screenshotResult.value === 'string'
          ? screenshotResult.value
          : null,
      html:
        htmlResult.status === 'fulfilled' && typeof htmlResult.value === 'string'
          ? htmlResult.value
          : null,
    };

    log?.('tradera.quicklist.debug', captured);
    return captured;
  }

  const isLoginPage = async () => {
    for (const selector of LOGIN_FORM_SELECTORS) {
      const visible = await page.locator(selector).first().isVisible().catch(() => false);
      if (visible) return true;
    }
    return page.url().toLowerCase().includes('/login');
  };

  const extractListingId = (value) => {
    if (typeof value !== 'string') return null;
    const match = value.match(/(\d{6,})/);
    return match && match[1] ? match[1] : null;
  };

  const findListingLinkForTerm = async (term) => {
    const normalizedTerm = typeof term === 'string' ? term.trim().toLowerCase() : '';
    if (!normalizedTerm) return null;

    const candidates = page.locator('a[href*="/item/"], a[href*="/listing/"]');
    const count = await candidates.count().catch(() => 0);

    for (let index = 0; index < Math.min(count, 20); index += 1) {
      const candidate = candidates.nth(index);
      const visible = await candidate.isVisible().catch(() => false);
      if (!visible) continue;

      const candidateInfo = await candidate
        .evaluate((element) => {
          const candidateContainer =
            element.closest('article, li, tr, [data-testid*="listing"], [data-testid*="item"], [class*="listing"], [class*="Listing"], [class*="result"], [class*="Result"]') ||
            element;

          return {
            href: element.getAttribute('href') || '',
            text: (element.textContent || '').replace(/\s+/g, ' ').trim(),
            containerText: (candidateContainer.textContent || '').replace(/\s+/g, ' ').trim(),
          };
        })
        .catch(() => null);

      if (!candidateInfo || !candidateInfo.href) continue;

      const haystack = (candidateInfo.containerText || candidateInfo.text || '').toLowerCase();
      if (!haystack.includes(normalizedTerm)) continue;

      let listingUrl = candidateInfo.href;
      try {
        listingUrl = new URL(candidateInfo.href, page.url()).toString();
      } catch {}

      return {
        listingUrl,
        listingId: extractListingId(listingUrl),
        text: candidateInfo.containerText || candidateInfo.text || '',
      };
    }

    return null;
  };

  const ensureLoggedIn = async () => {
    const readAuthState = async () => {
      const successVisible = Boolean(await firstVisible(LOGIN_SUCCESS_SELECTORS));
      const loginFormVisible = Boolean(await firstVisible(LOGIN_FORM_SELECTORS));
      const currentUrl = page.url().trim().toLowerCase();
      const loggedIn =
        successVisible ||
        (!loginFormVisible &&
          (currentUrl.includes('/my/') ||
            currentUrl.includes('/my?') ||
            currentUrl.includes('/selling')));

      return {
        successVisible,
        loginFormVisible,
        currentUrl,
        loggedIn,
      };
    };

    await acceptCookiesIfPresent();
    const initialAuthState = await readAuthState();
    log?.('tradera.quicklist.auth.initial', initialAuthState);
    if (initialAuthState.loggedIn) {
      return;
    }

    if (!username || !password) {
      await captureFailureArtifacts('auth-required', {
        phase: 'credentials-missing',
        authState: initialAuthState,
      });
      throw new Error('AUTH_REQUIRED: Tradera login requires manual verification.');
    }

    if (!initialAuthState.currentUrl.includes('/login')) {
      await page.goto('https://www.tradera.com/en/login', {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await acceptCookiesIfPresent();
    }

    const usernameInput = await firstVisible(USERNAME_SELECTORS);
    const passwordInput = await firstVisible(PASSWORD_SELECTORS);
    const loginButton = await firstVisible(LOGIN_BUTTON_SELECTORS);

    if (!usernameInput || !passwordInput || !loginButton) {
      await captureFailureArtifacts('auth-required', {
        phase: 'login-controls-missing',
        authState: await readAuthState(),
      });
      throw new Error('AUTH_REQUIRED: Tradera login requires manual verification.');
    }

    await usernameInput.fill(username);
    await passwordInput.fill(password);
    await Promise.allSettled([
      page.waitForLoadState('domcontentloaded', { timeout: 20_000 }),
      loginButton.click(),
    ]);
    await wait(1500);
    await acceptCookiesIfPresent();

    const finalAuthState = await readAuthState();
    log?.('tradera.quicklist.auth.final', finalAuthState);

    if (!finalAuthState.loggedIn) {
      await captureFailureArtifacts('auth-required', {
        phase: 'post-login-not-authenticated',
        authState: finalAuthState,
      });
      throw new Error('AUTH_REQUIRED: Tradera login requires manual verification.');
    }
  };

  const isCreateListingPage = async () => {
    const currentUrl = page.url().toLowerCase();

    // /selling/new is unambiguously the create listing page — trust the URL
    if (currentUrl.includes('/selling/new')) {
      log?.('tradera.quicklist.page_detection', { method: 'url_selling_new', currentUrl });
      return true;
    }

    // /selling or /selling? might be a dashboard or redirect — verify with DOM
    if (
      currentUrl.includes('/selling?') ||
      /\/selling(?:$|[?#])/.test(currentUrl)
    ) {
      const hasImageInput = Boolean(await firstExisting(IMAGE_INPUT_SELECTORS));
      const hasContinue = Boolean(await firstVisible(CONTINUE_SELECTORS));
      const hasTitleInput = Boolean(await firstVisible(TITLE_SELECTORS));
      const hasPublishButton = Boolean(await firstVisible(PUBLISH_SELECTORS));
      if (hasImageInput || hasContinue || hasTitleInput || hasPublishButton) {
        log?.('tradera.quicklist.page_detection', { method: 'url_selling_with_dom', currentUrl, hasImageInput, hasContinue, hasTitleInput, hasPublishButton });
        return true;
      }
    }

    // Original checks: title+publish or heading
    const titleInput = await firstVisible(TITLE_SELECTORS);
    const publishButton = await firstVisible(PUBLISH_SELECTORS);
    const heading = await page
      .getByRole('heading', { name: /Create( a)? new listing|Skapa en ny annons|Skapa annons|New listing|Ny annons/i })
      .first()
      .isVisible()
      .catch(() => false);
    if (titleInput && publishButton) {
      log?.('tradera.quicklist.page_detection', { method: 'title_and_publish', currentUrl });
      return true;
    }
    if (heading) {
      log?.('tradera.quicklist.page_detection', { method: 'heading', currentUrl });
      return true;
    }
    return false;
  };

  const findCreateListingTrigger = async () => {
    for (const label of CREATE_LISTING_TRIGGER_LABELS) {
      const escapedPattern = label.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&');
      const escapedText = label.replace(/"/g, '\\"');
      const triggerLocators = [
        page.getByRole('button', { name: new RegExp('^' + escapedPattern + '$', 'i') }).first(),
        page.getByRole('link', { name: new RegExp('^' + escapedPattern + '$', 'i') }).first(),
        page.getByRole('button', { name: new RegExp(escapedPattern, 'i') }).first(),
        page.getByRole('link', { name: new RegExp(escapedPattern, 'i') }).first(),
        page
          .locator(
            'xpath=//*[normalize-space(text())="' +
              escapedText +
              '"]/ancestor-or-self::*[self::button or self::a or @role="button" or @role="link"][1]'
          )
          .first(),
      ];

      for (const locator of triggerLocators) {
        const visible = await locator.isVisible().catch(() => false);
        if (visible) {
          return locator;
        }
      }
    }

    return firstVisible(CREATE_LISTING_TRIGGER_SELECTORS);
  };

  const waitForSellEntryPoint = async (timeoutMs = 12_000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await isCreateListingPage()) {
        return 'form';
      }
      const trigger = await findCreateListingTrigger();
      if (trigger) {
        return 'trigger';
      }
      await wait(400);
    }

    if (await isCreateListingPage()) {
      return 'form';
    }

    return (await findCreateListingTrigger()) ? 'trigger' : null;
  };

  const openCreateListingPage = async () => {
    const trigger = await findCreateListingTrigger();
    if (!trigger) {
      return false;
    }

    await trigger.scrollIntoViewIfNeeded().catch(() => undefined);
    await Promise.allSettled([
      page.waitForURL(/\/selling(?:\/new)?(?:[?#]|$)|\/sell(?:\/new)?(?:[?#]|$)/i, {
        timeout: 15_000,
      }),
      page.waitForLoadState('domcontentloaded', { timeout: 20_000 }),
      trigger.click(),
    ]);
    await acceptCookiesIfPresent();

    const afterClick = await waitForSellEntryPoint(8_000);
    if (afterClick === 'form') {
      return true;
    }

    await page.goto(DIRECT_SELL_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await acceptCookiesIfPresent();

    return (await waitForSellEntryPoint(8_000)) === 'form';
  };

  const gotoSellPage = async () => {
    for (const candidate of SELL_URL_CANDIDATES) {
      await page.goto(candidate, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await acceptCookiesIfPresent();
      await ensureLoggedIn();
      const entryPoint = await waitForSellEntryPoint();
      if (entryPoint === 'form') {
        return candidate;
      }
      const opened = entryPoint === 'trigger' ? await openCreateListingPage() : false;
      if (opened) {
        return candidate;
      }
    }

    throw new Error('FAIL_SELL_PAGE_INVALID: Tradera create listing page did not load.');
  };

  const clearFocusedEditableField = async () => {
    await page.keyboard.press('ControlOrMeta+A').catch(() => undefined);
    await page.keyboard.press('Delete').catch(() => undefined);
    await page.keyboard.press('Backspace').catch(() => undefined);
  };

  const setTextField = async (locator, value) => {
    const tagName = await locator.evaluate((element) => element.tagName.toLowerCase()).catch(() => '');
    const isContentEditable = await locator.evaluate((element) => element.isContentEditable).catch(() => false);

    if (tagName === 'input' || tagName === 'textarea') {
      await locator.fill(value);
      return;
    }

    if (isContentEditable) {
      await locator.click();
      await clearFocusedEditableField();
      await page.keyboard.type(value);
      return;
    }

    await locator.click();
    await clearFocusedEditableField();
    await page.keyboard.type(value);
  };

  const readFieldValue = async (locator) => {
    const tagName = await locator.evaluate((element) => element.tagName.toLowerCase()).catch(() => '');
    const isContentEditable = await locator.evaluate((element) => element.isContentEditable).catch(() => false);

    if (tagName === 'input' || tagName === 'textarea') {
      return locator.inputValue().catch(() => '');
    }

    if (isContentEditable) {
      return locator.innerText().catch(() => '');
    }

    return locator.textContent().catch(() => '');
  };

  const setAndVerifyFieldValue = async ({
    locator,
    value,
    fieldKey,
    errorPrefix,
    normalize = normalizeWhitespace,
  }) => {
    const expectedValue = normalize(value);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await setTextField(locator, value);
      await wait(250);

      const currentValue = normalize(await readFieldValue(locator));
      if (currentValue === expectedValue) {
        log?.('tradera.quicklist.field.verified', { field: fieldKey, attempt });
        return;
      }

      log?.('tradera.quicklist.field.mismatch', {
        field: fieldKey,
        attempt,
        expectedValue,
        currentValue,
      });
    }

    throw new Error(errorPrefix + ': Unable to set Tradera ' + fieldKey + ' field.');
  };

  const openActiveSearchInput = async () => {
    const findScopedSearchInput = async () => {
      for (const selector of ACTIVE_SEARCH_SELECTORS) {
        const locator = page.locator(selector);
        const count = await locator.count().catch(() => 0);
        for (let index = 0; index < count; index += 1) {
          const candidate = locator.nth(index);
          const visible = await candidate.isVisible().catch(() => false);
          if (!visible) continue;

          const metadata = await candidate
            .evaluate((element) => ({
              name: element.getAttribute('name') || '',
              aria: element.getAttribute('aria-label') || '',
              placeholder: element.getAttribute('placeholder') || '',
              insideHeader: Boolean(element.closest('header, #site-header, [role="banner"]')),
            }))
            .catch(() => null);

          if (!metadata) continue;
          if (metadata.insideHeader) continue;
          if (metadata.name === 'q') continue;
          const normalizedAria = metadata.aria.toLowerCase();
          const normalizedPlaceholder = metadata.placeholder.toLowerCase();
          if (
            GLOBAL_HEADER_SEARCH_HINTS.some((hint) => normalizedAria.includes(hint)) ||
            GLOBAL_HEADER_SEARCH_HINTS.some((hint) => normalizedPlaceholder.includes(hint))
          ) {
            continue;
          }

          return candidate;
        }
      }

      return null;
    };

    let searchInput = await findScopedSearchInput();
    if (searchInput) return searchInput;

    for (const label of ACTIVE_SEARCH_TRIGGER_LABELS) {
      const searchButton = page
        .locator('main button')
        .filter({
          hasText: new RegExp(
            '^' + label.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&') + '$',
            'i'
          ),
        })
        .first();
      const searchButtonVisible = await searchButton.isVisible().catch(() => false);
      if (!searchButtonVisible) continue;
      await searchButton.click();
      await wait(500);
      searchInput = await findScopedSearchInput();
      if (searchInput) {
        break;
      }
    }

    return searchInput;
  };

  const triggerActiveSearchSubmit = async () => {
    const submitButton = await firstVisible(ACTIVE_SEARCH_SUBMIT_SELECTORS);
    if (submitButton) {
      await submitButton.click().catch(() => undefined);
      await wait(500);
      return 'button';
    }

    await page.keyboard.press('Enter').catch(() => undefined);
    await wait(500);
    return 'enter';
  };

  const findActiveTabTrigger = async () => {
    for (const label of ACTIVE_TAB_LABELS) {
      const tabCandidate = page.getByRole('tab', { name: new RegExp('^' + label.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&') + '$', 'i') }).first();
      const tabVisible = await tabCandidate.isVisible().catch(() => false);
      if (tabVisible) return tabCandidate;

      const partialTabCandidate = page
        .getByRole('tab', {
          name: new RegExp(label.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&'), 'i'),
        })
        .first();
      const partialTabVisible = await partialTabCandidate.isVisible().catch(() => false);
      if (partialTabVisible) return partialTabCandidate;

      const linkCandidate = page.getByRole('link', { name: new RegExp('^' + label.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&') + '$', 'i') }).first();
      const linkVisible = await linkCandidate.isVisible().catch(() => false);
      if (linkVisible) return linkCandidate;

      const partialLinkCandidate = page
        .getByRole('link', {
          name: new RegExp(label.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&'), 'i'),
        })
        .first();
      const partialLinkVisible = await partialLinkCandidate.isVisible().catch(() => false);
      if (partialLinkVisible) return partialLinkCandidate;

      const buttonCandidate = page.getByRole('button', { name: new RegExp('^' + label.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&') + '$', 'i') }).first();
      const buttonVisible = await buttonCandidate.isVisible().catch(() => false);
      if (buttonVisible) return buttonCandidate;

      const partialButtonCandidate = page
        .getByRole('button', {
          name: new RegExp(label.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&'), 'i'),
        })
        .first();
      const partialButtonVisible = await partialButtonCandidate.isVisible().catch(() => false);
      if (partialButtonVisible) return partialButtonCandidate;
    }

    return null;
  };

  const ensureActiveListingsContext = async () => {
    const hasActiveTabState = Boolean(await firstVisible(ACTIVE_TAB_STATE_SELECTORS));
    const currentUrl = page.url().toLowerCase();
    if (currentUrl.includes('tab=active') || hasActiveTabState) {
      return true;
    }

    const activeTabTrigger = await findActiveTabTrigger();
    if (!activeTabTrigger) {
      return false;
    }

    await activeTabTrigger.click().catch(() => undefined);
    await wait(700);

    const afterClickUrl = page.url().toLowerCase();
    const hasActiveStateAfterClick = Boolean(await firstVisible(ACTIVE_TAB_STATE_SELECTORS));
    return afterClickUrl.includes('tab=active') || hasActiveStateAfterClick;
  };

  const clickMenuItemByName = async (name) => {
    const normalizedNamePattern = name.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&');

    const candidate = page.getByRole('menuitem', { name: new RegExp('^' + normalizedNamePattern + '$', 'i') }).first();
    const visible = await candidate.isVisible().catch(() => false);
    if (visible) {
      await candidate.click();
      await wait(400);
      return true;
    }

    const menuItemRadioCandidate = page
      .getByRole('menuitemradio', {
        name: new RegExp('^' + normalizedNamePattern + '$', 'i'),
      })
      .first();
    const menuItemRadioVisible = await menuItemRadioCandidate.isVisible().catch(() => false);
    if (menuItemRadioVisible) {
      await menuItemRadioCandidate.click();
      await wait(400);
      return true;
    }

    const optionCandidate = page
      .getByRole('option', {
        name: new RegExp('^' + normalizedNamePattern + '$', 'i'),
      })
      .first();
    const optionVisible = await optionCandidate.isVisible().catch(() => false);
    if (optionVisible) {
      await optionCandidate.click();
      await wait(400);
      return true;
    }

    const radioCandidate = page
      .getByRole('radio', {
        name: new RegExp('^' + normalizedNamePattern + '$', 'i'),
      })
      .first();
    const radioVisible = await radioCandidate.isVisible().catch(() => false);
    if (radioVisible) {
      await radioCandidate.click();
      await wait(400);
      return true;
    }

    const linkCandidate = page.getByRole('link', {
      name: new RegExp('^' + normalizedNamePattern + '$', 'i'),
    }).first();
    const linkVisible = await linkCandidate.isVisible().catch(() => false);
    if (linkVisible) {
      await linkCandidate.click();
      await wait(400);
      return true;
    }

    const partialMenuItemCandidate = page
      .getByRole('menuitem', {
        name: new RegExp(normalizedNamePattern, 'i'),
      })
      .first();
    const partialMenuItemVisible = await partialMenuItemCandidate.isVisible().catch(() => false);
    if (partialMenuItemVisible) {
      await partialMenuItemCandidate.click();
      await wait(400);
      return true;
    }

    const partialMenuItemRadioCandidate = page
      .getByRole('menuitemradio', {
        name: new RegExp(normalizedNamePattern, 'i'),
      })
      .first();
    const partialMenuItemRadioVisible = await partialMenuItemRadioCandidate
      .isVisible()
      .catch(() => false);
    if (partialMenuItemRadioVisible) {
      await partialMenuItemRadioCandidate.click();
      await wait(400);
      return true;
    }

    const partialOptionCandidate = page
      .getByRole('option', {
        name: new RegExp(normalizedNamePattern, 'i'),
      })
      .first();
    const partialOptionVisible = await partialOptionCandidate.isVisible().catch(() => false);
    if (partialOptionVisible) {
      await partialOptionCandidate.click();
      await wait(400);
      return true;
    }

    const partialRadioCandidate = page
      .getByRole('radio', {
        name: new RegExp(normalizedNamePattern, 'i'),
      })
      .first();
    const partialRadioVisible = await partialRadioCandidate.isVisible().catch(() => false);
    if (partialRadioVisible) {
      await partialRadioCandidate.click();
      await wait(400);
      return true;
    }

    const partialLinkCandidate = page
      .getByRole('link', {
        name: new RegExp(normalizedNamePattern, 'i'),
      })
      .first();
    const partialLinkVisible = await partialLinkCandidate.isVisible().catch(() => false);
    if (partialLinkVisible) {
      await partialLinkCandidate.click();
      await wait(400);
      return true;
    }

    const buttonCandidate = page.getByRole('button', {
      name: new RegExp('^' + normalizedNamePattern + '$', 'i'),
    }).first();
    const buttonVisible = await buttonCandidate.isVisible().catch(() => false);
    if (buttonVisible) {
      await buttonCandidate.click();
      await wait(400);
      return true;
    }

    const partialButtonCandidate = page
      .getByRole('button', {
        name: new RegExp(normalizedNamePattern, 'i'),
      })
      .first();
    const partialButtonVisible = await partialButtonCandidate.isVisible().catch(() => false);
    if (partialButtonVisible) {
      await partialButtonCandidate.click();
      await wait(400);
      return true;
    }

    const textFallback = page
      .locator(
        'xpath=//*[normalize-space(text())="' +
          name.replace(/"/g, '\\"') +
          '"]/ancestor-or-self::*[self::button or self::a or @role="button" or @role="link" or @role="menuitem" or @role="menuitemradio" or @role="option" or @role="radio"][1]'
      )
      .first();
    const fallbackVisible = await textFallback.isVisible().catch(() => false);
    if (!fallbackVisible) return false;
    await textFallback.click().catch(() => undefined);
    await wait(400);
    return true;
  };

  const findFieldTriggerByLabel = async (label) => {
    const escaped = label.replace(/"/g, '\\"');
    const byRole = page.getByRole('button', { name: new RegExp('^' + label.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&') + '$', 'i') }).first();
    const byRoleVisible = await byRole.isVisible().catch(() => false);
    if (byRoleVisible) return byRole;

    const byRoleLink = page
      .getByRole('link', {
        name: new RegExp('^' + label.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&') + '$', 'i'),
      })
      .first();
    const byRoleLinkVisible = await byRoleLink.isVisible().catch(() => false);
    if (byRoleLinkVisible) return byRoleLink;

    const byRoleContains = page
      .getByRole('button', {
        name: new RegExp(label.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&'), 'i'),
      })
      .first();
    const byRoleContainsVisible = await byRoleContains.isVisible().catch(() => false);
    if (byRoleContainsVisible) return byRoleContains;

    const byRoleContainsLink = page
      .getByRole('link', {
        name: new RegExp(label.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&'), 'i'),
      })
      .first();
    const byRoleContainsLinkVisible = await byRoleContainsLink.isVisible().catch(() => false);
    if (byRoleContainsLinkVisible) return byRoleContainsLink;

    const byCombobox = page
      .getByRole('combobox', {
        name: new RegExp(label.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&'), 'i'),
      })
      .first();
    const byComboboxVisible = await byCombobox.isVisible().catch(() => false);
    if (byComboboxVisible) return byCombobox;

    const exactTextTrigger = page
      .locator(
        'xpath=//*[normalize-space(text())="' +
          escaped +
          '"]/ancestor-or-self::*[self::button or self::a or @role="button" or @role="link" or self::div or self::label][1]'
      )
      .first();
    const exactTextVisible = await exactTextTrigger.isVisible().catch(() => false);
    if (exactTextVisible) return exactTextTrigger;

    const labeledControlTrigger = page
      .locator(
        'xpath=//*[normalize-space(text())="' +
          escaped +
          '"]/following::*[(self::button or self::a or @role="button" or @role="link" or @role="combobox" or @aria-haspopup="listbox" or @aria-haspopup="menu")][1]'
      )
      .first();
    const labeledControlVisible = await labeledControlTrigger.isVisible().catch(() => false);
    if (labeledControlVisible) return labeledControlTrigger;

    return null;
  };

  const findFieldTriggerByLabels = async (labels) => {
    for (const label of labels) {
      const trigger = await findFieldTriggerByLabel(label);
      if (trigger) {
        return trigger;
      }
    }
    return null;
  };

  const chooseFallbackCategory = async () => {
    const categoryTrigger = await findFieldTriggerByLabels(CATEGORY_FIELD_LABELS);
    if (!categoryTrigger) {
      throw new Error('FAIL_CATEGORY_SET: Category selector trigger not found.');
    }

    await categoryTrigger.click().catch(() => undefined);
    await wait(400);

    let selectedDepth = 0;

    for (let depth = 0; depth < FALLBACK_CATEGORY_MAX_DEPTH; depth += 1) {
      let selectedAtDepth = false;
      for (const optionLabel of FALLBACK_CATEGORY_OPTION_LABELS) {
        selectedAtDepth = await clickMenuItemByName(optionLabel);
        if (selectedAtDepth) {
          selectedDepth += 1;
          break;
        }
      }

      if (!selectedAtDepth) {
        if (depth === 0) {
          throw new Error(
            'FAIL_CATEGORY_SET: Fallback top-level category "' +
              FALLBACK_CATEGORY_OPTION_LABELS.join('" or "') +
              '" not found.'
          );
        }
        break;
      }

      await wait(400);
    }

    log?.('tradera.quicklist.category.fallback', {
      selectedDepth,
      maxDepth: FALLBACK_CATEGORY_MAX_DEPTH,
    });
  };

  const chooseMappedCategory = async (segments) => {
    if (!Array.isArray(segments) || segments.length === 0) {
      return false;
    }

    const categoryTrigger = await findFieldTriggerByLabels(CATEGORY_FIELD_LABELS);
    if (!categoryTrigger) {
      throw new Error('FAIL_CATEGORY_SET: Category selector trigger not found.');
    }

    await categoryTrigger.click().catch(() => undefined);
    await wait(400);

    for (const segment of segments) {
      const clicked = await clickMenuItemByName(segment);
      if (!clicked) {
        throw new Error(
          'FAIL_CATEGORY_SET: Mapped Tradera category segment "' +
            segment +
            '" was not found for "' +
            segments.join(' > ') +
            '".'
        );
      }
      await wait(500);
    }

    return true;
  };

  const applyCategorySelection = async () => {
    if (mappedCategorySegments.length > 0) {
      await chooseMappedCategory(mappedCategorySegments);
      return;
    }

    await chooseFallbackCategory();
  };

  const trySelectOptionalFieldValue = async ({
    fieldLabels,
    optionLabels,
    fieldKey,
    requiredOptionLabel = null,
    failureCode = 'FAIL_PUBLISH_VALIDATION',
  }) => {
    const trigger = await findFieldTriggerByLabels(fieldLabels);
    if (!trigger) {
      log?.('tradera.quicklist.field.skipped', { field: fieldKey, reason: 'trigger-missing' });
      if (requiredOptionLabel) {
        throw new Error(
          failureCode +
            ': Required Tradera ' +
            fieldKey +
            ' field was not available for option "' +
            requiredOptionLabel +
            '".'
        );
      }
      return false;
    }

    await trigger.click().catch(() => undefined);
    await wait(400);

    for (const optionLabel of optionLabels) {
      const selected = await clickMenuItemByName(optionLabel);
      if (!selected) continue;
      log?.('tradera.quicklist.field.selected', { field: fieldKey, option: optionLabel });
      return true;
    }

    await page.keyboard.press('Escape').catch(() => undefined);
    log?.('tradera.quicklist.field.unresolved', {
      field: fieldKey,
      options: optionLabels,
      requiredOptionLabel,
    });

    if (requiredOptionLabel) {
      throw new Error(
        failureCode +
          ': Required Tradera ' +
          fieldKey +
          ' option "' +
          requiredOptionLabel +
          '" was not found.'
      );
    }

    return false;
  };

  const chooseBuyNowListingFormat = async () => {
    const listingFormatTrigger = await findFieldTriggerByLabels(LISTING_FORMAT_FIELD_LABELS);
    if (!listingFormatTrigger) {
      throw new Error('FAIL_PRICE_SET: Listing format selector not found.');
    }

    await listingFormatTrigger.click().catch(() => undefined);
    await wait(400);

    for (const optionLabel of BUY_NOW_OPTION_LABELS) {
      if (await clickMenuItemByName(optionLabel)) {
        return;
      }
    }

    throw new Error('FAIL_PRICE_SET: Buy now listing format option not found.');
  };

  const waitForImageUploadsToSettle = async (timeoutMs = 120_000) => {
    const isListingFormReady = async () => {
      const readyLocators = await Promise.all([
        firstVisible(TITLE_SELECTORS),
        firstVisible(DESCRIPTION_SELECTORS),
        firstVisible(PRICE_SELECTORS),
        firstVisible(PUBLISH_SELECTORS),
      ]);

      return readyLocators.some(Boolean);
    };

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const continueButton = await firstVisible(CONTINUE_SELECTORS);
      if (continueButton) {
        const disabled = await continueButton.isDisabled().catch(async () => {
          return continueButton
            .evaluate((element) => {
              return (
                element.hasAttribute('disabled') ||
                element.getAttribute('aria-disabled') === 'true'
              );
            })
            .catch(() => true);
        });
        if (!disabled) {
          return true;
        }

        await wait(1000);
        continue;
      }

      if (await isListingFormReady()) {
        return true;
      }

      await wait(1000);
    }

    return false;
  };

  const advancePastImagesStep = async () => {
    const isAutofillPending = async () => {
      const indicator = await firstVisible(AUTOFILL_PENDING_SELECTORS);
      return Boolean(indicator);
    };

    const waitForListingFormReady = async (timeoutMs = 20_000) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const [titleInput, descriptionInput, priceInput, publishButton, autofillPending] =
          await Promise.all([
          firstVisible(TITLE_SELECTORS),
          firstVisible(DESCRIPTION_SELECTORS),
          firstVisible(PRICE_SELECTORS),
          firstVisible(PUBLISH_SELECTORS),
          isAutofillPending(),
        ]);

        if (titleInput && descriptionInput && priceInput && publishButton && !autofillPending) {
          return true;
        }

        await wait(500);
      }

      return false;
    };

    const clickContinueButton = async (button) => {
      await button.scrollIntoViewIfNeeded().catch(() => undefined);
      await button.click().catch(() => undefined);
      await wait(400);

      const stillVisible = await button.isVisible().catch(() => false);
      if (stillVisible) {
        await button.evaluate((element) => {
          element.click();
        }).catch(() => undefined);
      }
    };

    const ready = await waitForImageUploadsToSettle();
    if (!ready) {
      throw new Error('FAIL_IMAGE_SET_INVALID: Tradera image upload step did not finish.');
    }

    const actionableContinueButton = await firstVisible(CONTINUE_SELECTORS);
    if (!actionableContinueButton) {
      const formReadyWithoutContinue = await waitForListingFormReady(8_000);
      if (formReadyWithoutContinue) {
        return false;
      }

      throw new Error(
        'FAIL_IMAGE_SET_INVALID: Tradera listing form did not appear after the image step.'
      );
    }

    const disabled = await isControlDisabled(actionableContinueButton);

    if (disabled) {
      return false;
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await clickContinueButton(actionableContinueButton);

      const formReady = await waitForListingFormReady(20_000);
      if (formReady) {
        return true;
      }

      const continueStillVisible = await actionableContinueButton.isVisible().catch(() => false);
      const continueStillDisabled = continueStillVisible
        ? await actionableContinueButton.isDisabled().catch(() => false)
        : false;

      if (!continueStillVisible || continueStillDisabled) {
        break;
      }
    }

    throw new Error(
      'FAIL_IMAGE_SET_INVALID: Continue completed the image step but the listing editor never became ready.'
    );
  };

  const guessExtension = (url, contentType) => {
    if (typeof contentType === 'string') {
      if (contentType.includes('png')) return 'png';
      if (contentType.includes('webp')) return 'webp';
      if (contentType.includes('gif')) return 'gif';
      if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
    }
    try {
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\.([a-z0-9]{2,5})$/i);
      if (match && match[1]) return match[1].toLowerCase();
    } catch {}
    return 'jpg';
  };

  const downloadImages = async () => {
    const downloaded = [];

    for (let index = 0; index < imageUrls.length; index += 1) {
      const sourceUrl = imageUrls[index];
      if (!sourceUrl) continue;
      const response = await page.context().request.get(sourceUrl).catch(() => null);
      if (!response || !response.ok()) {
        log?.('tradera.quicklist.image.download_failed', { index, sourceUrl, status: response?.status() ?? null });
        continue;
      }
      const bytes = await response.body().catch(() => null);
      if (!bytes) {
        log?.('tradera.quicklist.image.download_failed', { index, sourceUrl, reason: 'empty_body' });
        continue;
      }
      if (bytes.byteLength < 10_240) {
        log?.('tradera.quicklist.image.download_skipped', { index, sourceUrl, reason: 'too_small', size: bytes.byteLength });
        continue;
      }
      const contentType = response.headers()['content-type'] || '';
      const extension = guessExtension(sourceUrl, contentType);
      const filename =
        String(baseProductId).replace(/[^a-zA-Z0-9_-]+/g, '-') +
        '_' +
        String(index + 1).padStart(2, '0') +
        '.' +
        extension;
      downloaded.push({
        name: filename,
        mimeType: contentType || 'image/jpeg',
        buffer: bytes,
      });
    }

    if (!downloaded.length) {
      throw new Error(
        'FAIL_IMAGE_SET_INVALID: No usable product images were downloaded. Attempted ' +
        imageUrls.length + ' URL(s): ' + imageUrls.slice(0, 3).join(', ') +
        (imageUrls.length > 3 ? ' ...' : '')
      );
    }

    return downloaded;
  };

  const resolveUploadFiles = async () => {
    if (localImagePaths.length) {
      log?.('tradera.quicklist.image.local_paths', {
        count: localImagePaths.length,
        sample: localImagePaths.slice(0, 3),
      });
      return localImagePaths;
    }

    return downloadImages();
  };

  const clearDraftImagesIfPresent = async () => {
    let removedCount = 0;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      let removedInAttempt = false;

      for (const selector of DRAFT_IMAGE_REMOVE_SELECTORS) {
        const locator = page.locator(selector);
        const count = await locator.count().catch(() => 0);
        if (!count) continue;

        for (let index = 0; index < count; index += 1) {
          const candidate = locator.nth(index);
          const visible = await candidate.isVisible().catch(() => false);
          if (!visible) continue;
          await candidate.scrollIntoViewIfNeeded().catch(() => undefined);
          await candidate.click().catch(() => undefined);
          removedCount += 1;
          removedInAttempt = true;
          await wait(500);
          break;
        }

        if (removedInAttempt) {
          break;
        }
      }

      if (!removedInAttempt) {
        break;
      }
    }

    if (removedCount > 0) {
      log?.('tradera.quicklist.draft.reset', { removedCount });
      await wait(800);
    }

    return removedCount;
  };

  const checkDuplicate = async (term) => {
    if (!term) return false;
    const activeContextReady = await ensureActiveListingsContext();
    if (!activeContextReady) {
      throw new Error('FAIL_DUPLICATE_UNCERTAIN: Active listings context could not be confirmed.');
    }
    const searchInput = await openActiveSearchInput();
    if (!searchInput) {
      throw new Error('FAIL_DUPLICATE_UNCERTAIN: Active listings search input not found.');
    }

    await searchInput.fill('');
    await searchInput.fill(term);
    const searchTrigger = await triggerActiveSearchSubmit();
    log?.('tradera.quicklist.duplicate.search', { term, searchTrigger });
    await wait(1200);

    const duplicateMatch = await findListingLinkForTerm(term);
    log?.('tradera.quicklist.duplicate.result', {
      term,
      duplicateFound: Boolean(duplicateMatch),
      listingUrl: duplicateMatch?.listingUrl || null,
      listingId: duplicateMatch?.listingId || null,
    });

    return duplicateMatch
      ? {
          duplicateFound: true,
          listingUrl: duplicateMatch.listingUrl,
          listingId: duplicateMatch.listingId,
        }
      : {
          duplicateFound: false,
          listingUrl: null,
          listingId: null,
        };
  };

  try {
    log?.('tradera.quicklist.start', {
      baseProductId,
      sku,
      imageCount: imageUrls.length,
      mappedCategoryPath,
      configuredDeliveryOptionLabel,
      requiresConfiguredDeliveryOption,
    });

    await page.goto(ACTIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await ensureLoggedIn();

    const baseProductDuplicate = await checkDuplicate(baseProductId);
    if (baseProductDuplicate.duplicateFound) {
      throw new Error('SKIP_PRODUCT_DUPLICATE_FOUND: Duplicate active Tradera listing for ' + baseProductId + '.');
    }
    if (sku) {
      const skuDuplicate = await checkDuplicate(sku);
      if (skuDuplicate.duplicateFound) {
      throw new Error('SKIP_PRODUCT_DUPLICATE_FOUND: Duplicate active Tradera listing for ' + sku + '.');
      }
    }

    await gotoSellPage();
    // Wait for SPA to fully render the listing form
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    await wait(1500);
    await clearDraftImagesIfPresent();

    // Wait for the image input to appear — Tradera's SPA may take time to render it
    let imageInput = await firstExisting(IMAGE_INPUT_SELECTORS);
    if (!imageInput) {
      log?.('tradera.quicklist.image_input.waiting', { selectors: IMAGE_INPUT_SELECTORS });
      await wait(3000);
      imageInput = await firstExisting(IMAGE_INPUT_SELECTORS);
    }
    if (!imageInput) {
      await captureFailureArtifacts('image-input-missing', {
        url: page.url(),
        html: await page.content().catch(() => '').then((h) => h.slice(0, 2000)),
      });
      throw new Error('FAIL_IMAGE_SET_INVALID: Tradera image upload input not found.');
    }
    const uploadFiles = await resolveUploadFiles();
    await imageInput.setInputFiles(uploadFiles);
    await advancePastImagesStep();
    await wait(1000);

    await applyCategorySelection();
    await chooseBuyNowListingFormat();
    await trySelectOptionalFieldValue({
      fieldLabels: CONDITION_FIELD_LABELS,
      optionLabels: CONDITION_OPTION_LABELS,
      fieldKey: 'condition',
    });
    await trySelectOptionalFieldValue({
      fieldLabels: DEPARTMENT_FIELD_LABELS,
      optionLabels: DEPARTMENT_OPTION_LABELS,
      fieldKey: 'department',
    });
    await trySelectOptionalFieldValue({
      fieldLabels: DELIVERY_FIELD_LABELS,
      optionLabels: deliveryOptionLabels,
      fieldKey: 'delivery',
      requiredOptionLabel: configuredDeliveryOptionLabel,
      failureCode: 'FAIL_SHIPPING_SET',
    });
    await wait(500);

    const titleInput = await firstVisible(TITLE_SELECTORS);
    const descriptionInput = await firstVisible(DESCRIPTION_SELECTORS);
    const priceInput = await firstVisible(PRICE_SELECTORS);
    const publishButton = await firstVisible(PUBLISH_SELECTORS);

    if (!titleInput || !descriptionInput || !priceInput || !publishButton) {
      throw new Error('FAIL_PUBLISH_VALIDATION: Tradera listing form selectors were not found.');
    }

    await setAndVerifyFieldValue({
      locator: titleInput,
      value: title,
      fieldKey: 'title',
      errorPrefix: 'FAIL_PUBLISH_VALIDATION',
    });
    await setAndVerifyFieldValue({
      locator: descriptionInput,
      value: description,
      fieldKey: 'description',
      errorPrefix: 'FAIL_PUBLISH_VALIDATION',
    });
    await setAndVerifyFieldValue({
      locator: priceInput,
      value: String(price),
      fieldKey: 'price',
      errorPrefix: 'FAIL_PRICE_SET',
      normalize: normalizePriceValue,
    });

    const prePublishValidationMessages = await collectValidationMessages();
    const publishDisabled = await isControlDisabled(publishButton);
    if (publishDisabled || prePublishValidationMessages.length > 0) {
      log?.('tradera.quicklist.publish.validation', {
        publishDisabled,
        messages: prePublishValidationMessages,
      });
      throw new Error(
        (hasDeliveryValidationIssue(prePublishValidationMessages)
          ? 'FAIL_SHIPPING_SET: '
          : 'FAIL_PUBLISH_VALIDATION: ') +
          (prePublishValidationMessages.length > 0
            ? prePublishValidationMessages.join(' | ')
            : 'Publish action is disabled.')
      );
    }

    const previousUrl = page.url();
    await Promise.allSettled([
      page.waitForLoadState('domcontentloaded', { timeout: 25_000 }),
      publishButton.click(),
    ]);
    await wait(2000);

    let listingUrl = page.url();
    let externalListingId = extractListingId(listingUrl);

    if (!externalListingId) {
      await page.goto(ACTIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await ensureLoggedIn();
      const verificationTerms = [baseProductId, sku].filter((value) => Boolean(value));
      for (const verificationTerm of verificationTerms) {
        const duplicateResult = await checkDuplicate(verificationTerm);
        log?.('tradera.quicklist.publish.verify', {
          term: verificationTerm,
          duplicateFound: duplicateResult.duplicateFound,
          listingUrl: duplicateResult.listingUrl || null,
          listingId: duplicateResult.listingId || null,
        });
        if (!duplicateResult.duplicateFound) {
          continue;
        }
        listingUrl = duplicateResult.listingUrl || listingUrl;
        externalListingId = duplicateResult.listingId || extractListingId(listingUrl);
        if (externalListingId) {
          break;
        }
      }
    }

    if (!externalListingId) {
      const postPublishValidationMessages = await collectValidationMessages();
      if (postPublishValidationMessages.length > 0) {
        log?.('tradera.quicklist.publish.validation', {
          publishDisabled: false,
          messages: postPublishValidationMessages,
          phase: 'post-publish',
        });
        throw new Error(
          (hasDeliveryValidationIssue(postPublishValidationMessages)
            ? 'FAIL_SHIPPING_SET: '
            : 'FAIL_PUBLISH_VALIDATION: ') +
            postPublishValidationMessages.join(' | ')
        );
      }

      throw new Error(
        previousUrl !== listingUrl
          ? 'FAIL_PUBLISH_NOT_CONFIRMED: Publish changed the page but listing id could not be verified.'
          : 'FAIL_PUBLISH_STUCK: Publish did not produce a verifiable Tradera listing.'
      );
    }

    const result = {
      externalListingId,
      listingUrl,
      publishVerified: true,
    };
    emit('result', result);
    return result;
  } catch (error) {
    await captureFailureArtifacts('run-failure', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}`;
