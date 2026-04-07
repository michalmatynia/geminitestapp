export const PART_3 = String.raw`        expectedValue,
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

    const findScopedSearchTrigger = async () => {
      for (const label of ACTIVE_SEARCH_TRIGGER_LABELS) {
        const escapedLabel = label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&');
        const candidateLocators = [
          page
            .locator('main button, main a, [role="main"] button, [role="main"] a')
            .filter({
              hasText: new RegExp(escapedLabel, 'i'),
            }),
          page.getByRole('button', { name: new RegExp(escapedLabel, 'i') }),
          page.getByRole('link', { name: new RegExp(escapedLabel, 'i') }),
        ];

        for (const locator of candidateLocators) {
          const count = await locator.count().catch(() => 0);
          for (let index = 0; index < count; index += 1) {
            const candidate = locator.nth(index);
            const visible = await candidate.isVisible().catch(() => false);
            if (!visible) continue;

            const insideHeader = await candidate
              .evaluate((element) => Boolean(element.closest('header, #site-header, [role="banner"]')))
              .catch(() => false);
            if (insideHeader) continue;

            return candidate;
          }
        }
      }

      return null;
    };

    let searchInput = await findScopedSearchInput();
    if (searchInput) return searchInput;

    const searchTrigger = await findScopedSearchTrigger();
    if (searchTrigger) {
      await humanClick(searchTrigger);
      await wait(500);
      searchInput = await findScopedSearchInput();
    }

    return searchInput;
  };

  const readActiveSearchInputValue = async (searchInput) => {
    if (!searchInput) return '';

    return normalizeWhitespace(
      await searchInput
        .evaluate((element) => {
          if ('value' in element && typeof element.value === 'string') {
            return element.value;
          }
          return element.textContent || '';
        })
        .catch(() => '')
    );
  };

  const prepareActiveListingsSearchInput = async (searchInput, term) => {
    const expectedTerm = normalizeWhitespace(term);
    if (!searchInput || !expectedTerm) {
      return '';
    }

    await humanClick(searchInput).catch(() => undefined);
    await humanFill(searchInput, '', { pauseAfter: false });
    let currentValue = await readActiveSearchInputValue(searchInput);
    if (currentValue) {
      await humanClick(searchInput).catch(() => undefined);
      await clearFocusedEditableField().catch(() => undefined);
      await humanFill(searchInput, '', { pauseAfter: false });
      currentValue = await readActiveSearchInputValue(searchInput);
    }

    await humanFill(searchInput, expectedTerm, { pauseAfter: false });
    await wait(250);

    let appliedValue = await readActiveSearchInputValue(searchInput);
    if (normalizeWhitespace(appliedValue).toLowerCase() !== expectedTerm.toLowerCase()) {
      await humanClick(searchInput).catch(() => undefined);
      await clearFocusedEditableField().catch(() => undefined);
      await humanFill(searchInput, expectedTerm, { pauseAfter: false });
      await wait(250);
      appliedValue = await readActiveSearchInputValue(searchInput);
    }

    if (normalizeWhitespace(appliedValue).toLowerCase() !== expectedTerm.toLowerCase()) {
      throw new Error(
        'FAIL_DUPLICATE_UNCERTAIN: Active listings search input did not accept the English title search term.'
      );
    }

    return appliedValue;
  };

  const triggerActiveSearchSubmit = async () => {
    const submitButton = await firstVisible(ACTIVE_SEARCH_SUBMIT_SELECTORS);
    if (submitButton) {
      await humanClick(submitButton).catch(() => undefined);
      await wait(500);
      return 'button';
    }

    await humanPress('Enter', { pauseBefore: false, pauseAfter: false }).catch(() => undefined);
    await wait(500);
    return 'enter';
  };

  const findActiveTabTrigger = async () => {
    for (const label of ACTIVE_TAB_LABELS) {
      const tabCandidate = page.getByRole('tab', { name: new RegExp('^' + label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&') + '\$', 'i') }).first();
      const tabVisible = await tabCandidate.isVisible().catch(() => false);
      if (tabVisible) return tabCandidate;

      const partialTabCandidate = page
        .getByRole('tab', {
          name: new RegExp(label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&'), 'i'),
        })
        .first();
      const partialTabVisible = await partialTabCandidate.isVisible().catch(() => false);
      if (partialTabVisible) return partialTabCandidate;

      const linkCandidate = page.getByRole('link', { name: new RegExp('^' + label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&') + '\$', 'i') }).first();
      const linkVisible = await linkCandidate.isVisible().catch(() => false);
      if (linkVisible) return linkCandidate;

      const partialLinkCandidate = page
        .getByRole('link', {
          name: new RegExp(label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&'), 'i'),
        })
        .first();
      const partialLinkVisible = await partialLinkCandidate.isVisible().catch(() => false);
      if (partialLinkVisible) return partialLinkCandidate;

      const buttonCandidate = page.getByRole('button', { name: new RegExp('^' + label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&') + '\$', 'i') }).first();
      const buttonVisible = await buttonCandidate.isVisible().catch(() => false);
      if (buttonVisible) return buttonCandidate;

      const partialButtonCandidate = page
        .getByRole('button', {
          name: new RegExp(label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&'), 'i'),
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
      await page
        .goto(ACTIVE_URL, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        })
        .catch(() => undefined);
      await wait(700);
      const afterReloadUrl = page.url().toLowerCase();
      const hasActiveStateAfterReload = Boolean(await firstVisible(ACTIVE_TAB_STATE_SELECTORS));
      return afterReloadUrl.includes('tab=active') || hasActiveStateAfterReload;
    }

    await humanClick(activeTabTrigger).catch(() => undefined);
    await wait(700);

    const afterClickUrl = page.url().toLowerCase();
    const hasActiveStateAfterClick = Boolean(await firstVisible(ACTIVE_TAB_STATE_SELECTORS));
    return afterClickUrl.includes('tab=active') || hasActiveStateAfterClick;
  };

  const findActiveListingCandidateForSync = async () => {
    const preferredListingId = normalizeWhitespace(existingExternalListingId || '');
    const candidateSearchTerms = Array.from(
      new Set(
        [duplicateSearchTitle, title]
          .map((value) => normalizeWhitespace(value || ''))
          .filter((value) => Boolean(value))
      )
    );

    const scanVisibleCandidates = async (searchTerm = null) => {
      const normalizedSearchTerm = normalizeWhitespace(searchTerm || '').toLowerCase();
      const candidates = page.locator('a[href*="/item/"], a[href*="/listing/"]');
      const count = await candidates.count().catch(() => 0);
      let firstTermMatch = null;

      for (let index = 0; index < count; index += 1) {
        const candidateLink = candidates.nth(index);
        const visible = await candidateLink.isVisible().catch(() => false);
        if (!visible) continue;

        const candidateInfo = await candidateLink
          .evaluate((element) => {
            const candidateContainer =
              element.closest(
                'article, li, tr, [data-testid*="listing"], [data-testid*="item"], [class*="listing"], [class*="Listing"], [class*="result"], [class*="Result"]'
              ) || element;

            return {
              href: element.getAttribute('href') || '',
              text: (element.textContent || '').replace(/\s+/g, ' ').trim(),
              containerText: (candidateContainer.textContent || '').replace(/\s+/g, ' ').trim(),
            };
          })
          .catch(() => null);
        if (!candidateInfo?.href) continue;

        let listingUrl = candidateInfo.href;
        try {
          listingUrl = new URL(candidateInfo.href, page.url()).toString();
        } catch {}

        const listingId = extractListingId(listingUrl);
        const normalizedCandidateTitle = normalizeWhitespace(candidateInfo.text || '').toLowerCase();
        const haystack = normalizeWhitespace(
          candidateInfo.containerText || candidateInfo.text || ''
        ).toLowerCase();

        if (preferredListingId && listingId === preferredListingId) {
          return {
            matchedBy: 'external_listing_id',
            link: candidateLink,
            listingId,
            listingUrl,
            text: candidateInfo.containerText || candidateInfo.text || '',
          };
        }

        if (
          !firstTermMatch &&
          normalizedSearchTerm &&
          normalizedCandidateTitle &&
          normalizedCandidateTitle === normalizedSearchTerm
        ) {
          firstTermMatch = {
            matchedBy: 'exact_title',
            link: candidateLink,
            listingId,
            listingUrl,
            text: candidateInfo.containerText || candidateInfo.text || '',
          };
        }
      }

      return firstTermMatch;
    };

    const searchInput = await openActiveSearchInput();
    for (const searchTerm of candidateSearchTerms) {
      if (searchInput) {
        await prepareActiveListingsSearchInput(searchInput, searchTerm);
        await triggerActiveSearchSubmit();
        await wait(1200);
      }

      const matchedCandidate = await scanVisibleCandidates(searchTerm);
      if (matchedCandidate) {
        log?.('tradera.quicklist.sync.candidate_found', {
          searchTerm,
          matchedBy: matchedCandidate.matchedBy,
          listingId: matchedCandidate.listingId,
          listingUrl: matchedCandidate.listingUrl,
          text: normalizeWhitespace(matchedCandidate.text).slice(0, 200),
        });
        return matchedCandidate;
      }
    }

    return scanVisibleCandidates();
  };

  const resolveSyncListingCandidateContainer = async (candidateLink) => {
    if (!candidateLink) return null;

    const containerCandidates = [
      candidateLink.locator('xpath=ancestor::*[self::article or self::li or self::tr][1]'),
      candidateLink.locator(
        'xpath=ancestor::*[contains(@data-testid, "listing") or contains(@data-testid, "item")][1]'
      ),
      candidateLink.locator(
        'xpath=ancestor::*[contains(@class, "listing") or contains(@class, "Listing") or contains(@class, "result") or contains(@class, "Result")][1]'
      ),
      candidateLink,
    ];

    for (const container of containerCandidates) {
      const visible = await container.first().isVisible().catch(() => false);
      if (visible) return container.first();
    }

    return candidateLink;
  };

  const isSafeScopedEditTarget = async (locator) => {
    if (!locator) return false;

    const metadata = await readClickTargetMetadata(locator);
    if (!metadata || resolveExternalClickTargetUrl(metadata)) {
      return false;
    }

    const hrefCandidate = normalizeWhitespace(metadata.href || metadata.hrefAttribute || '');
    if (!hrefCandidate || hrefCandidate === '#' || hrefCandidate.startsWith('#')) {
      return true;
    }
    if (/^(javascript|mailto|tel):/i.test(hrefCandidate)) {
      return false;
    }

    try {
      const parsed = new URL(hrefCandidate, page.url());
      const pathname = parsed.pathname.toLowerCase();
      return pathname.includes('/selling/') || pathname.includes('/edit');
    } catch {
      return false;
    }
  };

  const findScopedEditTarget = async (scope) => {
    if (!scope) return null;

    for (const selector of EDIT_LISTING_TRIGGER_SELECTORS) {
      const locator = scope.locator(selector);
      const count = await locator.count().catch(() => 0);
      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible || !(await isSafeScopedEditTarget(candidate))) continue;
        return candidate;
      }
    }

    for (const label of EDIT_LISTING_LABELS) {
      const escapedPattern = label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&');
      const candidateLocators = [
        scope.getByRole('button', { name: new RegExp('^' + escapedPattern + '\$', 'i') }).first(),
        scope.getByRole('link', { name: new RegExp('^' + escapedPattern + '\$', 'i') }).first(),
        scope.getByRole('button', { name: new RegExp(escapedPattern, 'i') }).first(),
        scope.getByRole('link', { name: new RegExp(escapedPattern, 'i') }).first(),
      ];

      for (const candidate of candidateLocators) {
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible || !(await isSafeScopedEditTarget(candidate))) continue;
        return candidate;
      }
    }

    return null;
  };

  const tryOpenExistingListingEditorFromActiveListings = async () => {
    await page.goto(ACTIVE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => undefined);
    await assertAllowedTraderaPage('sync active listings fallback');
    await dismissVisibleWishlistFavoritesModalIfPresent({
      context: 'sync-active-listings-fallback',
      required: true,
    });

    const activeContextReady = await ensureActiveListingsContext();
    if (!activeContextReady) {
      log?.('tradera.quicklist.sync.active_fallback', {
        status: 'active-context-missing',
        currentUrl: page.url(),
      });
      return null;
    }

    const matchedCandidate = await findActiveListingCandidateForSync();
    if (!matchedCandidate?.link) {
      log?.('tradera.quicklist.sync.active_fallback', {
        status: 'candidate-missing',
        currentUrl: page.url(),
      });
      return null;
    }

    const candidateContainer = await resolveSyncListingCandidateContainer(matchedCandidate.link);
    const openedFromCandidate = await clickSyncEditTargetWithinScope(
      candidateContainer,
      'sync-active-fallback'
    );
    if (!openedFromCandidate) {
      log?.('tradera.quicklist.sync.active_fallback', {
        status: 'edit-action-missing',
        matchedBy: matchedCandidate.matchedBy,
        listingId: matchedCandidate.listingId,
        listingUrl: matchedCandidate.listingUrl,
        currentUrl: page.url(),
      });
      return null;
    }

    const editorReady = await waitForExistingListingEditor();
    if (!editorReady) {
      log?.('tradera.quicklist.sync.active_fallback', {
        status: 'editor-not-ready',
        matchedBy: matchedCandidate.matchedBy,
        listingId: matchedCandidate.listingId,
        listingUrl: matchedCandidate.listingUrl,
        currentUrl: page.url(),
      });
      return null;
    }

    log?.('tradera.quicklist.sync.editor_opened', {
      listingId: matchedCandidate.listingId || null,
      listingUrl: matchedCandidate.listingUrl || null,
      matchedBy: 'active_listings_' + matchedCandidate.matchedBy,
      currentUrl: page.url(),
    });
    return {
      matchedBy: 'active_listings_' + matchedCandidate.matchedBy,
      listingId: matchedCandidate.listingId || null,
      listingUrl: matchedCandidate.listingUrl || null,
    };
  };

  const findScopedListingActionMenuTrigger = async (scope) => {
    if (!scope) return null;

    for (const selector of LISTING_ACTION_MENU_TRIGGER_SELECTORS) {
      const locator = scope.locator(selector);
      const count = await locator.count().catch(() => 0);
      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible) continue;
        const metadata = await readClickTargetMetadata(candidate);
        if (metadata && resolveExternalClickTargetUrl(metadata)) {
          continue;
        }
        return candidate;
      }
    }

    return null;
  };

  const waitForExistingListingEditor = async (timeoutMs = 15_000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await isCreateListingPage()) {
        return true;
      }

      const stableEntryPoint = await confirmStableSellPage(700, 1_800);
      if (stableEntryPoint === 'form') {
        return true;
      }

      await wait(250);
    }

    return isCreateListingPage();
  };

  const resolvePreferredSyncListingUrl = () => {
    const directListingUrl = normalizeWhitespace(existingListingUrl || '');
    if (directListingUrl) {
      return directListingUrl;
    }

    const preferredListingId = normalizeWhitespace(existingExternalListingId || '');
    return preferredListingId ? 'https://www.tradera.com/item/' + preferredListingId : null;
  };

  // Click a visible button or link whose text matches the label anywhere on the page,
  // without the selection-UI container restriction of clickMenuItemByName.
  // Used in the sync edit flow where Tradera's dropdown may not use ARIA containers.
  const clickVisibleTextElement = async (label, context) => {
    const escaped = label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&');
    const pattern = new RegExp(escaped, 'i');
    const exactPattern = new RegExp('^' + escaped + '$', 'i');

    const candidateLocators = [
      page.getByRole('menuitem', { name: exactPattern }).first(),
      page.getByRole('button', { name: exactPattern }).first(),
      page.getByRole('link', { name: exactPattern }).first(),
      page.getByRole('menuitem', { name: pattern }).first(),
      page.getByRole('button', { name: pattern }).first(),
      page.getByRole('link', { name: pattern }).first(),
      page.locator('xpath=//*[normalize-space(text())="' + label.replace(/"/g, '\\"') + '"]/ancestor-or-self::*[self::button or self::a or @role="button" or @role="link" or @role="menuitem"][1]').first(),
      page.locator('xpath=//*[contains(normalize-space(text()),"' + label.replace(/"/g, '\\"') + '")]/ancestor-or-self::*[self::button or self::a or @role="button" or @role="link" or @role="menuitem"][1]').first(),
    ];

    for (const locator of candidateLocators) {
      const visible = await locator.isVisible().catch(() => false);
      if (!visible) continue;

      // Skip elements that would navigate away from the page (e.g. /item/, /category/ links)
      const href = await locator.getAttribute('href').catch(() => null);
      if (href && /\/(item|category|selling)\//i.test(href) && !/\/selling\/(draft|edit)/i.test(href)) {
        continue;
      }

      await logClickTarget(context + ':' + label, locator).catch(() => undefined);
      await humanClick(locator);
      await wait(400);
      return true;
    }

    return false;
  };

  const clickSyncEditTargetWithinScope = async (scope, context) => {
    if (!scope) return false;

    await dismissVisibleWishlistFavoritesModalIfPresent({
      context: context + ':pre-edit',
      required: true,
    });

    const directEditTarget = await findScopedEditTarget(scope);
    if (directEditTarget) {
      await logClickTarget(context + ':edit-target', directEditTarget).catch(() => undefined);
      await Promise.allSettled([
        page.waitForLoadState('domcontentloaded', { timeout: 20_000 }),
        humanClick(directEditTarget, { pauseAfter: false }),
      ]);
      await wait(1200);
      return true;
    }

    const menuTrigger = await findScopedListingActionMenuTrigger(scope);
    if (!menuTrigger) {
      return false;
    }

    await logClickTarget(context + ':actions-menu', menuTrigger).catch(() => undefined);
    await humanClick(menuTrigger);
    await wait(500);

    // Try edit labels directly (standard menus with ARIA roles).
    for (const label of EDIT_LISTING_LABELS) {
      if (await clickMenuItemByName(label)) {
        await wait(1200);
        return true;
      }
    }

    // Tradera's dropdown may not use ARIA role="menu" containers, so
    // clickMenuItemByName silently skips all items. Try a permissive text search.
    for (const label of EDIT_LISTING_LABELS) {
      if (await clickVisibleTextElement(label, context + ':direct')) {
        await wait(1200);
        return true;
      }
    }

    // The menu may show an intermediate "Show Options" item that opens a second
    // level containing the actual Edit action. Try clicking it first.
    for (const intermediateLabel of EDIT_INTERMEDIATE_MENU_LABELS) {
      const clickedIntermediate =
        (await clickMenuItemByName(intermediateLabel)) ||
        (await clickVisibleTextElement(intermediateLabel, context + ':intermediate'));

      if (clickedIntermediate) {
        log?.('tradera.quicklist.sync.intermediate_menu_clicked', { label: intermediateLabel });
        await wait(600);

        for (const label of EDIT_LISTING_LABELS) {
          if (
            (await clickMenuItemByName(label)) ||
            (await clickVisibleTextElement(label, context + ':after-intermediate'))
          ) {
            await wait(1200);
            return true;
          }
        }

        break;
      }
    }

    return false;
  };

  const openExistingListingEditorForSync = async () => {
    if (!existingListingUrl && !existingExternalListingId) {
      throw new Error(
        'FAIL_SYNC_TARGET_NOT_FOUND: Tradera sync requires an existing listing url or existing listing id.'
      );
    }

    const preferredListingId = normalizeWhitespace(existingExternalListingId || '');
    const directSyncTargetUrl = resolvePreferredSyncListingUrl();
    if (directSyncTargetUrl) {
      const tryActiveFallback = async () => {
        const fallbackResult = await tryOpenExistingListingEditorFromActiveListings();
        if (fallbackResult) {
          return fallbackResult;
        }
        return null;
      };

      await page.goto(directSyncTargetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      // CSR page — wait for full hydration so the seller toolbar ("Show options") appears.
      await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => undefined);
      await assertAllowedTraderaPage('sync listing target open');
      await dismissVisibleWishlistFavoritesModalIfPresent({
        context: 'sync-direct-target',
        required: true,
      });

      // Wait for the seller edit button to become visible before trying to interact.
      // The "Show options" / data-open-edit-item button only appears after auth-state
      // hydration on the CSR listing page and may take several seconds.
      const editButtonSelectors = [
        '[data-open-edit-item="true"]',
        '[data-open-edit-item]',
        'button:has-text("Show options")',
        ...EDIT_LISTING_TRIGGER_SELECTORS,
      ];
      const editButtonDeadline = Date.now() + 12_000;
      let editButtonReady = false;
      while (Date.now() < editButtonDeadline) {
        for (const sel of editButtonSelectors) {
          const visible = await page.locator(sel).first().isVisible().catch(() => false);
          if (visible) {
            editButtonReady = true;
            break;
          }
        }
        if (editButtonReady) break;
        await wait(500);
      }
      log?.('tradera.quicklist.sync.edit_button_wait', {
        ready: editButtonReady,
        elapsed: 12_000 - Math.max(0, editButtonDeadline - Date.now()),
        url: page.url(),
      });

      const resolvedDirectListingId =
        extractListingId(page.url()) || extractListingId(directSyncTargetUrl) || null;
`;
