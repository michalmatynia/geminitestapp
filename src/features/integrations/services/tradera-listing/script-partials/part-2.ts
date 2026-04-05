export const PART_2 = String.raw`      /(delivery|shipping|ship|leverans|frakt)/i.test(String(message || ''))
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
    const listingIdPattern = /\/(?:item\/(?:\d+\/)?|listing\/)(\d{6,})(?:[/?#]|$)/i;
    try {
      const url = new URL(value, 'https://www.tradera.com');
      const pathname = url.pathname || '';
      const match = pathname.match(listingIdPattern);
      return match && match[1] ? match[1] : null;
    } catch {}
    const match = value.match(listingIdPattern);
    return match && match[1] ? match[1] : null;
  };

  const collectVisibleListingCandidatePreview = async (limit = 8) => {
    const candidates = page.locator('a[href*="/item/"], a[href*="/listing/"]');
    const count = await candidates.count().catch(() => 0);
    const previewLimit =
      typeof limit === 'number' && Number.isFinite(limit) && limit > 0
        ? Math.max(1, Math.floor(limit))
        : 8;
    const preview = [];
    const seen = new Set();

    for (let index = 0; index < count; index += 1) {
      if (preview.length >= previewLimit) {
        break;
      }

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

      let listingUrl = candidateInfo.href;
      try {
        listingUrl = new URL(candidateInfo.href, page.url()).toString();
      } catch {}

      const listingId = extractListingId(listingUrl);
      const dedupeKey = listingId || listingUrl;
      if (!dedupeKey || seen.has(dedupeKey)) continue;

      seen.add(dedupeKey);
      preview.push({
        listingUrl,
        listingId,
        text: normalizeWhitespace(candidateInfo.containerText || candidateInfo.text || '').slice(0, 160),
      });
    }

    return preview;
  };

  const collectListingLinksForTerm = async (term, maxMatches = null) => {
    const normalizedTerm = typeof term === 'string' ? term.trim().toLowerCase() : '';
    if (!normalizedTerm) return [];

    const candidates = page.locator('a[href*="/item/"], a[href*="/listing/"]');
    const count = await candidates.count().catch(() => 0);
    const matchLimit =
      typeof maxMatches === 'number' && Number.isFinite(maxMatches) && maxMatches > 0
        ? Math.max(1, Math.floor(maxMatches))
        : null;
    const matches = [];
    const seen = new Set();

    for (let index = 0; index < count; index += 1) {
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

      const listingId = extractListingId(listingUrl);
      const dedupeKey = listingId || listingUrl;
      if (!dedupeKey || seen.has(dedupeKey)) continue;

      seen.add(dedupeKey);
      matches.push({
        listingUrl,
        listingId,
        text: candidateInfo.containerText || candidateInfo.text || '',
      });
      if (matchLimit !== null && matches.length >= matchLimit) {
        break;
      }
    }

    return matches;
  };

  const findListingLinkForTerm = async (term) => {
    const matches = await collectListingLinksForTerm(term, 1);
    return matches[0] || null;
  };

  const extractReferencedProductId = (value) => {
    const normalizedValue = normalizeWhitespace(value);
    if (!normalizedValue) {
      return null;
    }

    const match = normalizedValue.match(/(?:item reference|product id)\s*:\s*([^|\n\r]+)/i);
    if (!match || !match[1]) {
      return null;
    }

    const extracted = normalizeWhitespace(match[1]).replace(/[.,;:]+$/g, '').trim();
    return extracted || null;
  };

  const readDuplicateCandidateListingText = async () => {
    for (const selector of DUPLICATE_DESCRIPTION_TEXT_SELECTORS) {
      const locator = page.locator(selector).first();
      const visible = await locator.isVisible().catch(() => false);
      if (!visible) continue;
      const text = normalizeWhitespace(await locator.innerText().catch(() => ''));
      if (text) {
        return text;
      }
    }

    const mainText = normalizeWhitespace(
      await page
        .locator('main')
        .first()
        .innerText()
        .catch(() => '')
    );
    if (mainText) {
      return mainText;
    }

    return normalizeWhitespace(
      await page
        .locator('body')
        .first()
        .innerText()
        .catch(() => '')
    );
  };

  const inspectDuplicateCandidateListing = async (candidate) => {
    if (!candidate || !candidate.listingUrl) {
      return null;
    }

    await page.goto(candidate.listingUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await assertAllowedTraderaPage('duplicate candidate inspection');
    await wait(900);

    const finalUrl = page.url();
    const listingText = await readDuplicateCandidateListingText();

    return {
      listingUrl: finalUrl || candidate.listingUrl,
      listingId: extractListingId(finalUrl) || candidate.listingId || null,
      matchedProductId: extractReferencedProductId(listingText),
      textSample: listingText ? listingText.slice(0, 400) : '',
    };
  };

  const findVisibleListingLink = async () => {
    const candidates = page.locator('a[href*="/item/"], a[href*="/listing/"]');
    const count = await candidates.count().catch(() => 0);

    for (let index = 0; index < Math.min(count, 20); index += 1) {
      const candidate = candidates.nth(index);
      const visible = await candidate.isVisible().catch(() => false);
      if (!visible) continue;

      const href = await candidate.getAttribute('href').catch(() => null);
      if (!href) continue;

      let listingUrl = href;
      try {
        listingUrl = new URL(href, page.url()).toString();
      } catch {}

      const listingId = extractListingId(listingUrl);
      if (!listingId) continue;

      return {
        listingUrl,
        listingId,
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

    // /selling/new, /selling/draft/<id>, or /sell/new — Tradera may use multiple
    // in-flow routes before the listing editor fully stabilizes.
    if (
      currentUrl.includes('/selling/new') ||
      currentUrl.includes('/selling/draft/') ||
      /\/sell\/new(?:[?#/]|$)/.test(currentUrl)
    ) {
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

  const isTraderaHomepage = (url) => {
    const normalizedUrl = typeof url === 'string' ? url.trim().toLowerCase() : '';
    return (
      normalizedUrl.endsWith('/en') ||
      normalizedUrl.endsWith('/en/') ||
      /\/en(?:[?#]|$)/.test(normalizedUrl)
    );
  };

  const isTraderaSellingRoute = (url) => {
    const normalizedUrl = typeof url === 'string' ? url.trim().toLowerCase() : '';
    return (
      normalizedUrl.includes('/selling/new') ||
      normalizedUrl.includes('/selling/draft/') ||
      /\/sell(?:\/new)?(?:[?#/]|$)/.test(normalizedUrl) ||
      normalizedUrl.includes('/selling?') ||
      /\/selling(?:[?#/]|$)/.test(normalizedUrl)
    );
  };

  const findCreateListingTrigger = async () => {
    const createListingRoot = page.locator('main').first();
    const rootVisible = await createListingRoot.isVisible().catch(() => false);
    const root = rootVisible ? createListingRoot : page;
    const isSafeCreateListingTrigger = async (locator) => {
      const metadata = await readClickTargetMetadata(locator);
      return !resolveExternalClickTargetUrl(metadata);
    };

    for (const label of CREATE_LISTING_TRIGGER_LABELS) {
      const escapedPattern = label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&');
      const escapedText = label.replace(/"/g, '\\"');
      const triggerLocators = [
        root.getByRole('button', { name: new RegExp('^' + escapedPattern + '\$', 'i') }).first(),
        root.getByRole('link', { name: new RegExp('^' + escapedPattern + '\$', 'i') }).first(),
        root.getByRole('button', { name: new RegExp(escapedPattern, 'i') }).first(),
        root.getByRole('link', { name: new RegExp(escapedPattern, 'i') }).first(),
        root
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
          if (!(await isSafeCreateListingTrigger(locator))) {
            continue;
          }
          return locator;
        }
      }
    }

    for (const selector of CREATE_LISTING_TRIGGER_SELECTORS) {
      const locator = root.locator(selector);
      const count = await locator.count().catch(() => 0);
      if (!count) continue;

      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible) continue;
        if (!(await isSafeCreateListingTrigger(candidate))) {
          continue;
        }
        return candidate;
      }
    }

    return null;
  };

  const waitForSellEntryPoint = async (timeoutMs = 12_000) => {
    const deadline = Date.now() + timeoutMs;
    let homepageSince = null;
    while (Date.now() < deadline) {
      if (await isCreateListingPage()) {
        return 'form';
      }
      const trigger = await findCreateListingTrigger();
      if (trigger) {
        return 'trigger';
      }

      const onHomepage = isTraderaHomepage(page.url());
      if (onHomepage) {
        homepageSince ??= Date.now();
      } else {
        homepageSince = null;
      }
      if (homepageSince && Date.now() - homepageSince >= 1_200) {
        log?.('tradera.quicklist.sell_page.homepage_detected', {
          url: page.url(),
          homepageStableMs: Date.now() - homepageSince,
        });
        return 'homepage';
      }

      await wait(onHomepage ? 250 : 400);
    }

    if (await isCreateListingPage()) {
      return 'form';
    }

    if (await findCreateListingTrigger()) {
      return 'trigger';
    }

    return isTraderaHomepage(page.url()) ? 'homepage' : null;
  };

  const openCreateListingPage = async () => {
    const trigger = await findCreateListingTrigger();
    if (!trigger) {
      return null;
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

    return waitForSellEntryPoint(8_000);
  };

  const confirmStableSellPage = async (minimumStableMs = 1_500, timeoutMs = 6_000) => {
    const deadline = Date.now() + timeoutMs;
    let stableSince = null;
    let homepageSince = null;

    while (Date.now() < deadline) {
      const currentUrl = page.url();
      if (isTraderaHomepage(currentUrl)) {
        homepageSince ??= Date.now();
        if (Date.now() - homepageSince >= minimumStableMs) {
          return 'homepage';
        }
        await wait(250);
        continue;
      }
      homepageSince = null;

      if (await isCreateListingPage()) {
        stableSince ??= Date.now();
        if (Date.now() - stableSince >= minimumStableMs) {
          return 'form';
        }
      } else {
        stableSince = null;
        if (await findCreateListingTrigger()) {
          return 'trigger';
        }

        if (!isTraderaSellingRoute(currentUrl)) {
          return null;
        }
      }

      await wait(250);
    }

    if (isTraderaHomepage(page.url())) {
      return 'homepage';
    }

    if (await isCreateListingPage()) {
      return 'form';
    }

    if (await findCreateListingTrigger()) {
      return 'trigger';
    }

    return isTraderaSellingRoute(page.url()) ? 'selling-route' : null;
  };

  const gotoSellPage = async () => {
    // Auth is already verified before gotoSellPage is called (ensureLoggedIn on ACTIVE_URL).
    // Do NOT call ensureLoggedIn here — on /selling/new the auth detection is unreliable
    // (LOGIN_FORM_SELECTORS like form[action*="login"] can false-positive on listing pages).
    for (const candidate of SELL_URL_CANDIDATES) {
      const maxAttempts = candidate === DIRECT_SELL_URL ? 3 : 1;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        log?.('tradera.quicklist.sell_page.trying', { candidate, attempt });
        await page.goto(candidate, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await acceptCookiesIfPresent();

        let entryPoint = await waitForSellEntryPoint();
        if (entryPoint === 'trigger') {
          entryPoint = await openCreateListingPage();
        }

        if (entryPoint === 'form') {
          entryPoint = await confirmStableSellPage();
        }

        log?.('tradera.quicklist.sell_page.entry_point', {
          candidate,
          attempt,
          entryPoint,
          url: page.url(),
        });
        if (entryPoint === 'form') {
          return candidate;
        }

        if ((entryPoint === 'homepage' || entryPoint === 'trigger') && attempt + 1 < maxAttempts) {
          log?.('tradera.quicklist.sell_page.homepage_retry', {
            candidate,
            attempt,
            entryPoint,
            url: page.url(),
          });
          await wait(1000);
          continue;
        }

        break;
      }
    }

    throw new Error('FAIL_SELL_PAGE_INVALID: Tradera create listing page did not load.');
  };

  const ensureCreateListingPageReady = async (context, recover = false) => {
    if (await isCreateListingPage()) {
      return true;
    }

    const initialUrl = page.url();
    if (isTraderaSellingRoute(initialUrl) && !isTraderaHomepage(initialUrl)) {
      const stableEntryPoint = await confirmStableSellPage(1_000, 8_000);
      if (stableEntryPoint === 'form') {
        return true;
      }
    }

    if (recover) {
      log?.('tradera.quicklist.sell_page.recover', {
        context,
        currentUrl: initialUrl,
      });
      try {
        await gotoSellPage();
      } catch (error) {
        log?.('tradera.quicklist.sell_page.recover_failed', {
          context,
          currentUrl: initialUrl,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      if (await isCreateListingPage()) {
        return true;
      }
    }

    const currentUrl = page.url();
    await captureFailureArtifacts('listing-page-missing', {
      context,
      initialUrl,
      currentUrl,
    }).catch(() => undefined);
    throw new Error(
      'FAIL_SELL_PAGE_INVALID: Tradera listing editor was not active during ' +
        context +
        '. Current URL: ' +
        currentUrl
    );
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

  const setTextFieldDirectly = async (locator, value) => {
    await locator
      .evaluate((element, rawValue) => {
        const normalizedValue = String(rawValue ?? '');
        const dispatch = (type, init = {}) => {
          try {
            if (type === 'input' || type === 'beforeinput') {
              element.dispatchEvent(
                new InputEvent(type, {
                  bubbles: true,
                  cancelable: true,
                  data: normalizedValue,
                  inputType: 'insertFromPaste',
                  ...init,
                })
              );
              return;
            }
          } catch {}

          element.dispatchEvent(
            new Event(type, {
              bubbles: true,
              cancelable: true,
            })
          );
        };

        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.focus();
          element.value = normalizedValue;
          dispatch('input');
          dispatch('change');
          return;
        }

        if (element instanceof HTMLElement && element.isContentEditable) {
          element.focus();
          element.innerHTML = '';
          const lines = normalizedValue.split(/\r?\n/);
          lines.forEach((line) => {
            const paragraph = document.createElement('p');
            if (line.length > 0) {
              paragraph.textContent = line;
            } else {
              paragraph.append(document.createElement('br'));
            }
            element.append(paragraph);
          });
          if (lines.length === 0) {
            element.textContent = '';
          }
          dispatch('beforeinput');
          dispatch('input');
          dispatch('change');
          return;
        }

        if (element instanceof HTMLElement) {
          element.focus();
          element.textContent = normalizedValue;
          dispatch('input');
          dispatch('change');
        }
      }, value)
      .catch(() => undefined);
  };

  const setTextField = async (locator, value, options = {}) => {
    const inputMethod = options?.inputMethod === 'paste' ? 'paste' : 'default';
    const tagName = await locator.evaluate((element) => element.tagName.toLowerCase()).catch(() => '');
    const isContentEditable = await locator.evaluate((element) => element.isContentEditable).catch(() => false);

    if (inputMethod === 'paste') {
      await humanClick(locator, { pauseAfter: false }).catch(() => undefined);
      await setTextFieldDirectly(locator, value);
      return;
    }

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
    inputMethod = 'default',
  }) => {
    const expectedValue = normalize(value);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await setTextField(locator, value, { inputMethod });
      await wait(250);

      const currentValue = normalize(await readFieldValue(locator));
      if (currentValue === expectedValue) {
        log?.('tradera.quicklist.field.verified', { field: fieldKey, attempt });
        return;
      }

      log?.('tradera.quicklist.field.mismatch', {
        field: fieldKey,
        attempt,`;
