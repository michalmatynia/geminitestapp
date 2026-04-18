export const PART_2 = String.raw`      /(delivery|shipping|ship|leverans|frakt)/i.test(String(message || ''))
    );
  };

  const acceptCookiesIfPresent = async ({ context = 'unknown', attempts = 2 } = {}) => {
    let acceptedAny = false;
    const roleNamePatterns = [
      /accept all cookies/i,
      /allow all cookies/i,
      /allow all/i,
      /accept all/i,
      /^accept$/i,
      /acceptera alla cookies/i,
      /acceptera alla kakor/i,
      /acceptera alla/i,
      /^acceptera$/i,
      /godkänn alla cookies/i,
      /godkänn alla/i,
      /^godkänn$/i,
      /tillåt alla cookies/i,
      /tillåt alla/i,
    ];

    const directClick = async (locator) => {
      await locator.scrollIntoViewIfNeeded().catch(() => undefined);
      try {
        await locator.click({ timeout: 2_000 });
        return true;
      } catch {
        return locator
          .evaluate((element) => {
            if (element instanceof HTMLElement) {
              element.click();
              return true;
            }
            return false;
          })
          .catch(() => false);
      }
    };

    const tryVisibleCandidates = async (locator, selector) => {
      const count = await locator.count().catch(() => 0);
      const candidateCount = Math.min(count, 8);
      for (let index = 0; index < candidateCount; index += 1) {
        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible) continue;
        const clicked = await directClick(candidate);
        if (!clicked) continue;
        return String(selector) + '[' + String(index) + ']';
      }
      return null;
    };

    for (let attempt = 0; attempt < Math.max(1, attempts); attempt += 1) {
      let acceptedInAttempt = false;

      for (const selector of COOKIE_ACCEPT_SELECTORS) {
        const matchedSelector = await tryVisibleCandidates(page.locator(selector), selector);
        if (!matchedSelector) continue;

        acceptedAny = true;
        acceptedInAttempt = true;
        log?.('tradera.quicklist.cookie.accepted', {
          context,
          attempt,
          selector: matchedSelector,
          currentUrl: page.url(),
        });
        await page.waitForTimeout(700);
        break;
      }

      if (!acceptedInAttempt) {
        for (const roleNamePattern of roleNamePatterns) {
          const matchedSelector = await tryVisibleCandidates(
            page.getByRole('button', { name: roleNamePattern }),
            'role=button:' + String(roleNamePattern)
          );
          if (!matchedSelector) continue;

          acceptedAny = true;
          acceptedInAttempt = true;
          log?.('tradera.quicklist.cookie.accepted', {
            context,
            attempt,
            selector: matchedSelector,
            currentUrl: page.url(),
          });
          await page.waitForTimeout(700);
          break;
        }
      }

      if (!acceptedInAttempt) {
        break;
      }
    }

    return acceptedAny;
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

  const inferListingTitleFromUrl = (value) => {
    if (typeof value !== 'string' || !value.trim()) {
      return '';
    }

    try {
      const pathname = new URL(value, 'https://www.tradera.com').pathname || '';
      const segments = pathname
        .split('/')
        .map((segment) => {
          try {
            return decodeURIComponent(segment);
          } catch {
            return segment;
          }
        })
        .filter((segment) => typeof segment === 'string' && segment.trim().length > 0);
      const lastSegment = segments[segments.length - 1] || '';
      if (!lastSegment || /^\d{6,}$/.test(lastSegment)) {
        return '';
      }

      return normalizeWhitespace(
        lastSegment
          .replace(/\.[a-z0-9]{2,5}$/i, '')
          .replace(/[-_]+/g, ' ')
      );
    } catch {
      return '';
    }
  };

  const normalizeListingMatchValue = (value) =>
    normalizeWhitespace(value)
      .toLowerCase()
      .replace(/[\u0060'’"]/g, '')
      .replace(/[^0-9a-z\u00c0-\u024f]+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const collectVisibleListingCandidates = async (limit = null) => {
    const candidates = page.locator('a[href*="/item/"], a[href*="/listing/"]');
    const count = await candidates.count().catch(() => 0);
    const candidateLimit =
      typeof limit === 'number' && Number.isFinite(limit) && limit > 0
        ? Math.max(1, Math.floor(limit))
        : null;
    const collected = [];
    const seen = new Set();

    for (let index = 0; index < count; index += 1) {
      if (candidateLimit !== null && collected.length >= candidateLimit) {
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
          const titleElement = candidateContainer.querySelector(
            'h1, h2, h3, h4, [data-testid*="title"], [data-testid*="Title"], [class*="title"], [class*="Title"]'
          );

          return {
            href: element.getAttribute('href') || '',
            text: (element.textContent || '').replace(/\s+/g, ' ').trim(),
            containerText: (candidateContainer.textContent || '').replace(/\s+/g, ' ').trim(),
            titleText: ((titleElement && titleElement.textContent) || '').replace(/\s+/g, ' ').trim(),
          };
        })
        .catch(() => null);

      if (!candidateInfo || !candidateInfo.href) continue;

      let listingUrl = candidateInfo.href;
      try {
        listingUrl = new URL(candidateInfo.href, page.url()).toString();
      } catch {}

      const inferredTitleFromUrl = inferListingTitleFromUrl(listingUrl);
      const listingId = extractListingId(listingUrl);
      const dedupeKey = listingId || listingUrl;
      if (!dedupeKey || seen.has(dedupeKey)) continue;

      seen.add(dedupeKey);
      collected.push({
        listingUrl,
        listingId,
        title: normalizeWhitespace(candidateInfo.titleText || '') || inferredTitleFromUrl,
        text:
          normalizeWhitespace(candidateInfo.containerText || candidateInfo.text || '') ||
          inferredTitleFromUrl,
      });
    }

    return collected;
  };

  const buildVisibleListingCandidatesPageSignature = (candidates = []) =>
    JSON.stringify({
      url: normalizeWhitespace(page.url()),
      listings: (Array.isArray(candidates) ? candidates : []).map((candidate) =>
        normalizeWhitespace(
          candidate?.listingId || candidate?.listingUrl || candidate?.title || ''
        )
      ),
    });

  const resolveNextVisibleListingResultsPageUrl = async () =>
    page
      .evaluate(
        ({ currentUrl, nextLabelHints, pageParamNames }) => {
          const normalize = (value) =>
            String(value || '')
              .replace(/\s+/g, ' ')
              .trim();

          const parsePageNumber = (value) => {
            const normalizedValue = normalize(value);
            if (!normalizedValue) {
              return null;
            }

            try {
              const url = new URL(normalizedValue, currentUrl);
              for (const paramName of pageParamNames) {
                const rawValue = normalize(url.searchParams.get(paramName) || '');
                if (/^\d+$/.test(rawValue)) {
                  const parsed = Number.parseInt(rawValue, 10);
                  if (Number.isFinite(parsed) && parsed > 0) {
                    return parsed;
                  }
                }
              }
            } catch {}

            if (/^\d+$/.test(normalizedValue)) {
              const parsed = Number.parseInt(normalizedValue, 10);
              return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
            }

            return null;
          };

          const isVisible = (element) => {
            if (!(element instanceof HTMLElement)) {
              return false;
            }

            const style = window.getComputedStyle(element);
            if (!style || style.visibility === 'hidden' || style.display === 'none') {
              return false;
            }

            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          };

          const hasPaginationContext = (element) => {
            let current = element;
            for (let depth = 0; depth < 6 && current; depth += 1) {
              if (!(current instanceof HTMLElement)) {
                current = current.parentElement;
                continue;
              }

              const tagName = String(current.tagName || '').toLowerCase();
              const role = normalize(current.getAttribute('role')).toLowerCase();
              const combinedHints = [
                normalize(current.getAttribute('aria-label')).toLowerCase(),
                normalize(current.getAttribute('data-testid')).toLowerCase(),
                normalize(current.className).toLowerCase(),
              ]
                .filter(Boolean)
                .join(' ');

              if (tagName === 'nav' || role === 'navigation') {
                return true;
              }

              if (combinedHints.includes('pagination') || combinedHints.includes('pager')) {
                return true;
              }

              current = current.parentElement;
            }

            return false;
          };

          const toAbsoluteUrl = (value) => {
            const normalizedValue = normalize(value);
            if (!normalizedValue) {
              return '';
            }

            try {
              return new URL(normalizedValue, currentUrl).toString();
            } catch {
              return '';
            }
          };

          const selectors = [
            'main a[href]',
            'main button',
            '[role="main"] a[href]',
            '[role="main"] button',
            'a[rel="next"]',
            'button[rel="next"]',
          ];

          const paginationCandidates = [];
          const seen = new Set();

          for (const selector of selectors) {
            for (const element of document.querySelectorAll(selector)) {
              if (!(element instanceof HTMLElement) || !isVisible(element)) {
                continue;
              }

              const rel = normalize(element.getAttribute('rel')).toLowerCase();
              const absoluteUrl = toAbsoluteUrl(
                element.getAttribute('href') ||
                  ('href' in element && typeof element.href === 'string' ? element.href : '')
              );

              if (!hasPaginationContext(element) && rel !== 'next') {
                continue;
              }

              const labelText = normalize(
                [
                  element.getAttribute('aria-label'),
                  element.getAttribute('title'),
                  element.textContent,
                ]
                  .filter(Boolean)
                  .join(' ')
              );
              const normalizedLabelText = labelText.toLowerCase();
              const pageNumber =
                parsePageNumber(absoluteUrl) || parsePageNumber(labelText) || null;
              const isCurrent =
                ['page', 'true'].includes(
                  normalize(element.getAttribute('aria-current')).toLowerCase()
                ) ||
                normalize(element.getAttribute('aria-selected')).toLowerCase() === 'true';
              const disabled =
                element.matches(':disabled') ||
                normalize(element.getAttribute('aria-disabled')).toLowerCase() === 'true';
              const isNextHint =
                rel === 'next' ||
                nextLabelHints.some((hint) => normalizedLabelText.includes(hint)) ||
                ['>', '>>', '›', '»', '→'].includes(normalizedLabelText);
              const dedupeKey = [
                absoluteUrl,
                labelText,
                rel,
                pageNumber === null ? '' : String(pageNumber),
              ].join('::');

              if (seen.has(dedupeKey)) {
                continue;
              }

              seen.add(dedupeKey);
              paginationCandidates.push({
                absoluteUrl,
                labelText,
                pageNumber,
                isCurrent,
                disabled,
                isNextHint,
              });
            }
          }

          let currentPage = parsePageNumber(currentUrl) || 1;
          for (const candidate of paginationCandidates) {
            if (!candidate.isCurrent || candidate.pageNumber === null) {
              continue;
            }
            currentPage = candidate.pageNumber;
            break;
          }

          let bestCandidate = null;

          for (const candidate of paginationCandidates) {
            if (candidate.disabled || !candidate.absoluteUrl || candidate.absoluteUrl === currentUrl) {
              continue;
            }

            const priority = candidate.isNextHint
              ? 0
              : candidate.pageNumber !== null && candidate.pageNumber > currentPage
                ? 1
                : Number.POSITIVE_INFINITY;

            if (!Number.isFinite(priority)) {
              continue;
            }

            if (
              !bestCandidate ||
              priority < bestCandidate.priority ||
              (priority === bestCandidate.priority &&
                (candidate.pageNumber ?? Number.POSITIVE_INFINITY) <
                  (bestCandidate.pageNumber ?? Number.POSITIVE_INFINITY))
            ) {
              bestCandidate = {
                absoluteUrl: candidate.absoluteUrl,
                pageNumber: candidate.pageNumber,
                priority,
              };
            }
          }

          return bestCandidate ? bestCandidate.absoluteUrl : null;
        },
        {
          currentUrl: page.url(),
          nextLabelHints: ['next', 'next page', 'nästa', 'nästa sida'],
          pageParamNames: ['page', 'p', 'paged', 'pageindex', 'pageno', 'sid'],
        }
      )
      .catch(() => null);

  const collectVisibleListingCandidatesAcrossPages = async ({
    context = 'listing-results',
    searchTerm = null,
  } = {}) => {
    const collected = [];
    const seenCandidates = new Set();
    const seenPageSignatures = new Set();

    while (true) {
      const pageCandidates = await collectVisibleListingCandidates();
      const pageSignature = buildVisibleListingCandidatesPageSignature(pageCandidates);

      if (seenPageSignatures.has(pageSignature)) {
        break;
      }

      seenPageSignatures.add(pageSignature);

      for (const candidate of pageCandidates) {
        const dedupeKey = candidate?.listingId || candidate?.listingUrl || null;
        if (!dedupeKey || seenCandidates.has(dedupeKey)) {
          continue;
        }

        seenCandidates.add(dedupeKey);
        collected.push(candidate);
      }

      const currentUrl = normalizeWhitespace(page.url());
      const nextPageUrl = normalizeWhitespace(
        await resolveNextVisibleListingResultsPageUrl()
      );

      log?.('tradera.quicklist.listing_pagination.page', {
        context,
        searchTerm: normalizeWhitespace(searchTerm || '') || null,
        currentUrl,
        pageCandidateCount: pageCandidates.length,
        collectedCandidateCount: collected.length,
        nextPageUrl: nextPageUrl || null,
      });

      if (!nextPageUrl || nextPageUrl === currentUrl) {
        break;
      }

      await page.goto(nextPageUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await assertAllowedTraderaPage(context + ' pagination');
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
      await wait(700);
      await acceptCookiesIfPresent({
        context: context + '-pagination',
        attempts: 1,
      }).catch(() => false);
    }

    return collected;
  };

  const collectVisibleListingCandidatePreview = async (limit = null) => {
    const previewCandidates = await collectVisibleListingCandidates(limit);
    return previewCandidates.map((candidate) => ({
      listingUrl: candidate.listingUrl,
      listingId: candidate.listingId,
      title: normalizeWhitespace(candidate.title || '').slice(0, 120),
      text: normalizeWhitespace(candidate.text || '').slice(0, 160),
    }));
  };

  const titlesExactlyMatch = (left, right) => {
    const normalizedLeft = normalizeListingMatchValue(left);
    const normalizedRight = normalizeListingMatchValue(right);
    return Boolean(normalizedLeft) && normalizedLeft === normalizedRight;
  };

  const collectListingLinksForTerm = async (term, maxMatches = null, sourceCandidates = null) => {
    const normalizedTerm = normalizeListingMatchValue(term);
    if (!normalizedTerm) return [];

    const matchLimit =
      typeof maxMatches === 'number' && Number.isFinite(maxMatches) && maxMatches > 0
        ? Math.max(1, Math.floor(maxMatches))
        : null;
    const candidates =
      Array.isArray(sourceCandidates) && sourceCandidates.length > 0
        ? sourceCandidates
        : await collectVisibleListingCandidates();
    const matches = [];

    for (const candidate of candidates) {
      const normalizedCandidateTitle = normalizeListingMatchValue(candidate.title || '');
      if (!normalizedCandidateTitle || normalizedCandidateTitle !== normalizedTerm) continue;
      matches.push(candidate);
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

  const stripDescriptionMetadata = (value) => {
    let text = normalizeWhitespace(value);
    if (!text) return '';
    // Strip trailing pipe-separated metadata: " | Product ID: xxx | SKU: yyy"
    text = text.replace(/\s*\|(?:\s*(?:product\s*id|item\s*reference|sku)\s*:[^|]*)+$/i, '');
    // Strip standalone trailing metadata: "Product ID: xxx" / "Item reference: xxx"
    text = text.replace(/\s+(?:product\s*id|item\s*reference)\s*:\s*\S.*$/i, '');
    // Strip standalone trailing SKU: "SKU: xxx"
    text = text.replace(/\s+sku\s*:\s*\S.*$/i, '');
    return text.trim();
  };

  const descriptionsMatch = (listingText, productDescription) => {
    const strippedListing = stripDescriptionMetadata(listingText).toLowerCase();
    const strippedProduct = stripDescriptionMetadata(productDescription).toLowerCase();
    if (!strippedListing || !strippedProduct) return false;
    // Exact match (when the selector captured only the description text)
    if (strippedListing === strippedProduct) return true;
    // Contains match (when the selector captured a broader page section
    // that includes the description alongside price, seller, shipping, etc.)
    if (strippedProduct.length >= 20 && strippedListing.includes(strippedProduct)) return true;
    return false;
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
      listingDescription: listingText || '',
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

  const isKnownAuthenticatedTraderaUrl = (url) =>
    typeof url === 'string' &&
    (url.includes('/my/listings') ||
      url.includes('/selling/new') ||
      url.includes('/selling/edit'));

  const ensureLoggedIn = async () => {
    const readAuthState = async () => {
      const successVisible = Boolean(await firstVisible(LOGIN_SUCCESS_SELECTORS));
      const loginFormVisible = Boolean(await firstVisible(LOGIN_FORM_SELECTORS));
      const currentUrl = page.url().trim().toLowerCase();
      const loggedIn = successVisible || (!loginFormVisible && isKnownAuthenticatedTraderaUrl(currentUrl));

      return {
        successVisible,
        loginFormVisible,
        currentUrl,
        loggedIn,
      };
    };

    updateStep('cookie_accept', 'running');
    await acceptCookiesIfPresent();
    updateStep('cookie_accept', 'completed');

    updateStep('auth_check', 'running');
    const initialAuthState = await readAuthState();
    log?.('tradera.quicklist.auth.initial', initialAuthState);
    if (initialAuthState.loggedIn) {
      updateStep('auth_check', 'completed', { method: 'session' });
      skipStep('auth_login', 'already authenticated');
      skipStep('auth_manual', 'already authenticated');
      return;
    }

    if (!username || !password) {
      updateStep('auth_check', 'completed', { method: 'none', loggedIn: false });
      updateStep('auth_manual', 'running');
      await captureFailureArtifacts('auth-required', {
        phase: 'credentials-missing',
        authState: initialAuthState,
      });
      throw new Error('AUTH_REQUIRED: Tradera login requires manual verification.');
    }

    updateStep('auth_check', 'completed', { method: 'credentials', loggedIn: false });
    skipStep('auth_manual', 'automated login will be attempted');

    if (!initialAuthState.currentUrl.includes('/login')) {
      await page.goto('https://www.tradera.com/en/login', {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await acceptCookiesIfPresent({ context: 'login-navigation' });
    }

    const usernameInput = await firstVisible(USERNAME_SELECTORS);
    const passwordInput = await firstVisible(PASSWORD_SELECTORS);
    const loginButton = await firstVisible(LOGIN_BUTTON_SELECTORS);

    if (!usernameInput || !passwordInput || !loginButton) {
      updateStep('auth_login', 'failed', { reason: 'login-controls-missing' });
      await captureFailureArtifacts('auth-required', {
        phase: 'login-controls-missing',
        authState: await readAuthState(),
      });
      throw new Error('AUTH_REQUIRED: Tradera login requires manual verification.');
    }

    updateStep('auth_login', 'running');
    await humanFill(usernameInput, username);
    await humanFill(passwordInput, password);
    await Promise.allSettled([
      page.waitForLoadState('domcontentloaded', { timeout: 20_000 }),
      humanClick(loginButton, { pauseAfter: false }),
    ]);
    await wait(1500);
    await acceptCookiesIfPresent({ context: 'post-login' });

    const finalAuthState = await readAuthState();
    log?.('tradera.quicklist.auth.final', finalAuthState);

    if (!finalAuthState.loggedIn) {
      updateStep('auth_login', 'failed', { reason: 'post-login-not-authenticated' });
      await captureFailureArtifacts('auth-required', {
        phase: 'post-login-not-authenticated',
        authState: finalAuthState,
      });
      throw new Error('AUTH_REQUIRED: Tradera login requires manual verification.');
    }

    updateStep('auth_login', 'completed', { method: 'automated' });
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
      const hasImageInput = Boolean(await firstUploadInput(IMAGE_INPUT_SELECTORS));
      const hasContinue = Boolean(await firstActionTarget(CONTINUE_SELECTORS, 'sell-page-continue'));
      const hasTitleInput = Boolean(await firstListingInput(TITLE_SELECTORS, 'title'));
      const hasPublishButton = Boolean(await firstActionTarget(PUBLISH_SELECTORS, 'publish-button'));
      if (hasImageInput || hasContinue || hasTitleInput || hasPublishButton) {
        log?.('tradera.quicklist.page_detection', { method: 'url_selling_with_dom', currentUrl, hasImageInput, hasContinue, hasTitleInput, hasPublishButton });
        return true;
      }
    }

    // Original checks: title+publish or heading
    const titleInput = await firstListingInput(TITLE_SELECTORS, 'title');
    const publishButton = await firstActionTarget(PUBLISH_SELECTORS, 'publish-button');
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

    // When a mapped category external ID is available, try navigating to the sell page
    // with the categoryId query parameter so Tradera pre-selects it — bypassing the
    // picker interaction entirely.
    const categoryPreselectionUrl =
      mappedCategoryExternalId && mappedCategoryExternalId.length > 0
        ? DIRECT_SELL_URL + '?categoryId=' + encodeURIComponent(mappedCategoryExternalId)
        : null;
    const candidatesToTry = categoryPreselectionUrl
      ? [categoryPreselectionUrl, ...SELL_URL_CANDIDATES]
      : SELL_URL_CANDIDATES;

    for (const candidate of candidatesToTry) {
      const maxAttempts = candidate === DIRECT_SELL_URL || candidate === categoryPreselectionUrl ? 3 : 1;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        log?.('tradera.quicklist.sell_page.trying', { candidate, attempt });
        await page.goto(candidate, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await acceptCookiesIfPresent({ context: 'sell-page-navigation' });

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
    await acceptCookiesIfPresent({ context: 'ensure-create-listing-page-ready' }).catch(
      () => false
    );
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
    const inputMethod =
      options?.inputMethod === 'paste'
        ? 'paste'
        : options?.inputMethod === 'type'
          ? 'type'
          : 'default';
    const tagName = await locator.evaluate((element) => element.tagName.toLowerCase()).catch(() => '');
    const isContentEditable = await locator.evaluate((element) => element.isContentEditable).catch(() => false);

    if (inputMethod === 'paste') {
      await humanClick(locator, { pauseAfter: false }).catch(() => undefined);
      await setTextFieldDirectly(locator, value);
      return;
    }

    if (inputMethod === 'type') {
      await humanClick(locator, { pauseAfter: false }).catch(() => undefined);

      if (tagName === 'input' || tagName === 'textarea' || isContentEditable) {
        await clearFocusedEditableField();
        await humanType(value, { pauseBefore: false, pauseAfter: false });
        return;
      }

      await clearFocusedEditableField();
      await humanType(value, { pauseBefore: false, pauseAfter: false });
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
