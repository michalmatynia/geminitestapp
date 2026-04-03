/* eslint-disable no-useless-escape */
export const PART_2 = `      /(delivery|shipping|ship|leverans|frakt)/i.test(String(message || ''))
    );
  };

  const acceptCookiesIfPresent = async () => {
    for (const selector of COOKIE_ACCEPT_SELECTORS) {
      const locator = page.locator(selector).first();
      const count = await locator.count().catch(() => 0);
      if (!count) continue;
      const visible = await locator.isVisible().catch(() => false);
      if (!visible) continue;
      await humanClick(locator).catch(() => undefined);
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

    await humanFill(usernameInput, username);
    await humanFill(passwordInput, password);
    await Promise.allSettled([
      page.waitForLoadState('domcontentloaded', { timeout: 20_000 }),
      humanClick(loginButton, { pauseAfter: false }),
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

    // /selling/new or /selling/draft/<id> — Tradera redirects /selling/new to a draft URL
    if (currentUrl.includes('/selling/new') || currentUrl.includes('/selling/draft/')) {
      log?.('tradera.quicklist.page_detection', { method: 'url_selling_new_or_draft', currentUrl });
      return true;
    }

    // /selling or /selling? might be a dashboard or redirect — verify with DOM
    if (
      currentUrl.includes('/selling?') ||
      new RegExp('/selling(?:[?#]|$)').test(currentUrl)
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
      const escapedPattern = label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&');
      const escapedText = label.replace(/"/g, '\\"');
      const triggerLocators = [
        page.getByRole('button', { name: new RegExp('^' + escapedPattern + '\$', 'i') }).first(),
        page.getByRole('link', { name: new RegExp('^' + escapedPattern + '\$', 'i') }).first(),
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
      page.waitForURL(
        new RegExp('/selling(?:/(?:new|draft(?:/[^/?#]+)?))?(?:[?#/]|$)|/sell(?:/new)?(?:[?#/]|$)', 'i'),
        {
          timeout: 15_000,
        }
      ),
      page.waitForLoadState('domcontentloaded', { timeout: 20_000 }),
      humanClick(trigger, { pauseAfter: false }),
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
    // Auth is already verified before gotoSellPage is called (ensureLoggedIn on ACTIVE_URL).
    // Do NOT call ensureLoggedIn here — on /selling/new the auth detection is unreliable
    // (LOGIN_FORM_SELECTORS like form[action*="login"] can false-positive on listing pages).
    for (const candidate of SELL_URL_CANDIDATES) {
      log?.('tradera.quicklist.sell_page.trying', { candidate });
      await page.goto(candidate, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await acceptCookiesIfPresent();

      const entryPoint = await waitForSellEntryPoint();
      log?.('tradera.quicklist.sell_page.entry_point', { candidate, entryPoint, url: page.url() });
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
    await humanPress('ControlOrMeta+A', { pauseBefore: false, pauseAfter: false }).catch(
      () => undefined
    );
    await humanPress('Delete', { pauseBefore: false, pauseAfter: false }).catch(
      () => undefined
    );
    await humanPress('Backspace', { pauseBefore: false, pauseAfter: false }).catch(
      () => undefined
    );
  };

  const setTextField = async (locator, value) => {
    const tagName = await locator.evaluate((element) => element.tagName.toLowerCase()).catch(() => '');
    const isContentEditable = await locator.evaluate((element) => element.isContentEditable).catch(() => false);

    if (tagName === 'input' || tagName === 'textarea') {
      await humanFill(locator, value);
      return;
    }

    if (isContentEditable) {
      await humanClick(locator);
      await clearFocusedEditableField();
      await humanType(value, { pauseBefore: false, pauseAfter: false });
      return;
    }

    await humanClick(locator);
    await clearFocusedEditableField();
    await humanType(value, { pauseBefore: false, pauseAfter: false });
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
        attempt,`;
