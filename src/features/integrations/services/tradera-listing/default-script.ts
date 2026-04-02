export const DEFAULT_TRADERA_QUICKLIST_SCRIPT = String.raw`export default async function run({
  page,
  input,
  emit,
  artifacts,
  log,
}) {
  // tradera-quicklist-default:v8
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
  ];
  const DESCRIPTION_SELECTORS = [
    '#tip-tap-editor',
    '[aria-label="Description"][contenteditable="true"]',
    'textarea[name="description"]',
    '#description',
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
  ];
  const IMAGE_INPUT_SELECTORS = [
    'input[type="file"][accept*="image"]',
    '[data-testid*="image"] input[type="file"]',
    '[data-testid*="upload"] input[type="file"]',
    'input[type="file"]',
  ];
  const CONTINUE_SELECTORS = [
    'button:has-text("Continue")',
    'button:has-text("Fortsätt")',
    'button:has-text("Next")',
  ];
  const PUBLISH_SELECTORS = [
    'button[type="submit"]',
    'button:has-text("Publish")',
    'button:has-text("Publicera")',
    'button:has-text("Lägg upp")',
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
    'a:has-text("Create a New Listing")',
    'a:has-text("Create new listing")',
    'a:has-text("Skapa en ny annons")',
    '[data-testid*="create"]',
    '[data-testid*="new-listing"]',
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
    const titleInput = await firstVisible(TITLE_SELECTORS);
    const publishButton = await firstVisible(PUBLISH_SELECTORS);
    const heading = await page
      .getByRole('heading', { name: /Create( a)? new listing|Skapa en ny annons/i })
      .first()
      .isVisible()
      .catch(() => false);
    return Boolean((titleInput && publishButton) || heading);
  };

  const findCreateListingTrigger = async () => {
    const triggerLocators = [
      page.getByRole('button', { name: /Create( a)? New Listing|Create( a)? new listing|Skapa en ny annons/i }).first(),
      page.getByRole('link', { name: /Create( a)? New Listing|Create( a)? new listing|Skapa en ny annons/i }).first(),
      page.getByText(/Create( a)? New Listing|Create( a)? new listing|Skapa en ny annons/i).first(),
    ];

    for (const locator of triggerLocators) {
      const visible = await locator.isVisible().catch(() => false);
      if (visible) {
        return locator;
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
      page.waitForURL(/\/selling\/new|\/sell(\/new)?/i, { timeout: 15_000 }),
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

  const setTextField = async (locator, value) => {
    const tagName = await locator.evaluate((element) => element.tagName.toLowerCase()).catch(() => '');
    const isContentEditable = await locator.evaluate((element) => element.isContentEditable).catch(() => false);

    if (tagName === 'input' || tagName === 'textarea') {
      await locator.fill(value);
      return;
    }

    if (isContentEditable) {
      await locator.click();
      await page.keyboard.press('ControlOrMeta+A').catch(() => undefined);
      await page.keyboard.type(value);
      return;
    }

    await locator.click();
    await page.keyboard.type(value);
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
          if (
            metadata.aria.toLowerCase().includes('items, sellers or a category') ||
            metadata.placeholder.toLowerCase().includes('what are you looking for')
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

    const searchButton = page.locator('main button').filter({ hasText: /^Search$/i }).first();
    const searchButtonVisible = await searchButton.isVisible().catch(() => false);
    if (searchButtonVisible) {
      await searchButton.click();
      await wait(500);
      searchInput = await findScopedSearchInput();
    }

    return searchInput;
  };

  const clickMenuItemByName = async (name) => {
    const candidate = page.getByRole('menuitem', { name: new RegExp('^' + name.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&') + '$', 'i') }).first();
    const visible = await candidate.isVisible().catch(() => false);
    if (visible) {
      await candidate.click();
      await wait(400);
      return true;
    }

    const buttonCandidate = page.getByRole('button', {
      name: new RegExp('^' + name.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&') + '$', 'i'),
    }).first();
    const buttonVisible = await buttonCandidate.isVisible().catch(() => false);
    if (buttonVisible) {
      await buttonCandidate.click();
      await wait(400);
      return true;
    }

    const textFallback = page
      .locator(
        'xpath=//*[normalize-space(text())="' +
          name.replace(/"/g, '\\"') +
          '"]/ancestor-or-self::*[self::button or @role="button" or @role="menuitem" or self::div or self::label][1]'
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

    const exactTextTrigger = page
      .locator(
        'xpath=//*[normalize-space(text())="' +
          escaped +
          '"]/ancestor-or-self::*[self::button or @role="button" or self::div or self::label][1]'
      )
      .first();
    const exactTextVisible = await exactTextTrigger.isVisible().catch(() => false);
    if (exactTextVisible) return exactTextTrigger;

    return null;
  };

  const chooseFallbackCategory = async () => {
    const categoryTrigger = await findFieldTriggerByLabel('Category');
    if (!categoryTrigger) {
      throw new Error('FAIL_CATEGORY_SET: Category selector trigger not found.');
    }

    await categoryTrigger.click().catch(() => undefined);
    await wait(400);

    const selectedTopLevel = await clickMenuItemByName('Other');
    if (!selectedTopLevel) {
      throw new Error('FAIL_CATEGORY_SET: Fallback top-level category "Other" not found.');
    }

    const secondLevelOther = page.getByRole('menuitem', { name: /^Other$/i }).first();
    const secondLevelVisible = await secondLevelOther.isVisible().catch(() => false);
    if (secondLevelVisible) {
      await secondLevelOther.click();
      await wait(400);
    }
  };

  const chooseMappedCategory = async (segments) => {
    if (!Array.isArray(segments) || segments.length === 0) {
      return false;
    }

    const categoryTrigger = await findFieldTriggerByLabel('Category');
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

  const chooseBuyNowListingFormat = async () => {
    const listingFormatTrigger = await findFieldTriggerByLabel('Listing format');
    if (!listingFormatTrigger) {
      throw new Error('FAIL_PRICE_SET: Listing format selector not found.');
    }

    await listingFormatTrigger.click().catch(() => undefined);
    await wait(400);

    if (await clickMenuItemByName('Buy now')) return;
    if (await clickMenuItemByName('Buy Now')) return;
    if (await clickMenuItemByName('Fixed price')) return;

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

    const disabled = await actionableContinueButton.isDisabled().catch(async () => {
      return actionableContinueButton
        .evaluate((element) => {
          return (
            element.hasAttribute('disabled') ||
            element.getAttribute('aria-disabled') === 'true'
          );
        })
        .catch(() => false);
    });

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

  const checkDuplicate = async (term) => {
    if (!term) return false;
    const searchInput = await openActiveSearchInput();
    if (!searchInput) {
      throw new Error('FAIL_DUPLICATE_UNCERTAIN: Active listings search input not found.');
    }

    await searchInput.fill('');
    await searchInput.fill(term);
    await searchInput.press('Enter').catch(() => undefined);
    await wait(1200);

    const bodyText = await page.locator('body').innerText().catch(() => '');
    const hits = await page
      .locator('a[href*="/item/"], a[href*="/listing/"], [data-testid*="listing"]')
      .allInnerTexts()
      .catch(() => []);

    return bodyText.includes(term) && hits.some((text) => text.includes(term));
  };

  try {
    log?.('tradera.quicklist.start', {
      baseProductId,
      sku,
      imageCount: imageUrls.length,
      mappedCategoryPath,
    });

    await page.goto(ACTIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await ensureLoggedIn();

    if (await checkDuplicate(baseProductId)) {
      throw new Error('SKIP_PRODUCT_DUPLICATE_FOUND: Duplicate active Tradera listing for ' + baseProductId + '.');
    }
    if (sku && (await checkDuplicate(sku))) {
      throw new Error('SKIP_PRODUCT_DUPLICATE_FOUND: Duplicate active Tradera listing for ' + sku + '.');
    }

    await gotoSellPage();

    const imageInput = await firstExisting(IMAGE_INPUT_SELECTORS);
    if (!imageInput) {
      throw new Error('FAIL_IMAGE_SET_INVALID: Tradera image upload input not found.');
    }
    const uploadFiles = await resolveUploadFiles();
    await imageInput.setInputFiles(uploadFiles);
    await advancePastImagesStep();
    await wait(1000);

    await applyCategorySelection();
    await chooseBuyNowListingFormat();
    await wait(500);

    const titleInput = await firstVisible(TITLE_SELECTORS);
    const descriptionInput = await firstVisible(DESCRIPTION_SELECTORS);
    const priceInput = await firstVisible(PRICE_SELECTORS);
    const publishButton = await firstVisible(PUBLISH_SELECTORS);

    if (!titleInput || !descriptionInput || !priceInput || !publishButton) {
      throw new Error('FAIL_PUBLISH_VALIDATION: Tradera listing form selectors were not found.');
    }

    await setTextField(titleInput, title);
    await setTextField(descriptionInput, description);
    await setTextField(priceInput, String(price));

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
      const duplicateFound = await checkDuplicate(baseProductId);
      if (duplicateFound) {
        const href = await page
          .locator('a[href*="/item/"], a[href*="/listing/"]')
          .first()
          .getAttribute('href')
          .catch(() => null);
        if (href) {
          try {
            listingUrl = new URL(href, page.url()).toString();
          } catch {
            listingUrl = href;
          }
        }
        externalListingId = extractListingId(listingUrl);
      }
    }

    if (!externalListingId) {
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
