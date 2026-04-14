export const STATUS_CHECK_CORE_LOGIC = String.raw`
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

  const titlesExactlyMatch = (left, right) => {
    const normalizedLeft = normalizeListingMatchValue(left);
    const normalizedRight = normalizeListingMatchValue(right);
    return Boolean(normalizedLeft) && normalizedLeft === normalizedRight;
  };

  const stripDescriptionMetadata = (value) => {
    let text = normalizeWhitespace(value);
    if (!text) return '';
    text = text.replace(/\s*\|(?:\s*(?:product\s*id|item\s*reference|sku)\s*:[^|]*)+$/i, '');
    text = text.replace(/\s+(?:product\s*id|item\s*reference)\s*:\s*\S.*$/i, '');
    text = text.replace(/\s+sku\s*:\s*\S.*$/i, '');
    return text.trim();
  };

  const descriptionsMatch = (listingText, productDescription) => {
    const strippedListing = stripDescriptionMetadata(listingText).toLowerCase();
    const strippedProduct = stripDescriptionMetadata(productDescription).toLowerCase();
    if (!strippedListing || !strippedProduct) return false;
    if (strippedListing === strippedProduct) return true;
    if (strippedProduct.length >= 20 && strippedListing.includes(strippedProduct)) return true;
    return false;
  };

  const extractReferencedProductId = (value) => {
    const normalizedValue = normalizeWhitespace(value);
    if (!normalizedValue) {
      return null;
    }
    const match = normalizedValue.match(/(?:item reference|product id)\s*:\s*([^|\n]+)/i);
    if (!match || !match[1]) {
      return null;
    }
    const extracted = normalizeWhitespace(match[1]).replace(/[.,;:]+$/g, '').trim();
    return extracted || null;
  };

  const identifiersMatch = (left, right) =>
    normalizeWhitespace(left).toLowerCase() === normalizeWhitespace(right).toLowerCase();

  const openScopedSearchInput = async () => {
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
        // Use simpler selection logic without regex literals that trigger parser issues
        const mainSelector = 'main button, main a, [role="main"] button, [role="main"] a';
        const candidateLocators = [
          page
            .locator(mainSelector)
            .filter({
              hasText: label,
            }),
          page.getByRole('button', { name: label }),
          page.getByRole('link', { name: label }),
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
      await searchTrigger.click({ timeout: 2_000 }).catch(() => undefined);
      await waitForCondition(async () => Boolean(await findScopedSearchInput()), {
        timeoutMs: 1_200,
        intervalMs: 100,
      });
      searchInput = await findScopedSearchInput();
    }

    return searchInput;
  };

  const readSearchInputValue = async (searchInput) => {
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

  const prepareSearchInput = async (searchInput, term) => {
    const expectedTerm = normalizeWhitespace(term);
    const normalizedExpectedTerm = expectedTerm.toLowerCase();
    if (!searchInput || !expectedTerm) {
      return '';
    }

    const hasExpectedValue = async () =>
      normalizeWhitespace(await readSearchInputValue(searchInput)).toLowerCase() ===
      normalizedExpectedTerm;

    await searchInput.click({ timeout: 2_000 }).catch(() => undefined);
    await searchInput.fill('').catch(() => undefined);
    await searchInput.fill(expectedTerm).catch(() => undefined);
    await waitForCondition(hasExpectedValue, {
      timeoutMs: 1_000,
      intervalMs: 100,
    });

    let appliedValue = await readSearchInputValue(searchInput);
    if (normalizeWhitespace(appliedValue).toLowerCase() !== normalizedExpectedTerm) {
      await searchInput.fill('').catch(() => undefined);
      await searchInput.fill(expectedTerm).catch(() => undefined);
      await waitForCondition(hasExpectedValue, {
        timeoutMs: 1_000,
        intervalMs: 100,
      });
      appliedValue = await readSearchInputValue(searchInput);
    }

    if (normalizeWhitespace(appliedValue).toLowerCase() !== normalizedExpectedTerm) {
      throw new Error(
        'FAIL_STATUS_SEARCH_UNCERTAIN: Tradera section search input did not accept the English title search term.'
      );
    }

    return appliedValue;
  };

  const triggerSearchSubmit = async () => {
    const submitButton = await firstVisible(ACTIVE_SEARCH_SUBMIT_SELECTORS);
    if (submitButton) {
      await submitButton.click({ timeout: 2_000 }).catch(() => undefined);
      await waitForPageIdle(1_000);
      return 'button';
    }

    await page.keyboard.press('Enter').catch(() => undefined);
    await waitForPageIdle(1_000);
    return 'enter';
  };

  const findSectionTrigger = async (section) => {
    for (const label of section.tabLabels) {
      const locators = [
        page.getByRole('tab', { name: label }),
        page.getByRole('link', { name: label }),
        page.getByRole('button', { name: label }),
      ];

      for (const locator of locators) {
        const candidate = locator.first();
        const visible = await candidate.isVisible().catch(() => false);
        if (visible) {
          return candidate;
        }
      }
    }

    return null;
  };

  const ensureSectionContext = async (section) => {
    const isSectionUrl = (url) => {
      if (section.id === 'active') {
        return url.includes('/my/listings') && !url.includes('tab=unsold') && !url.includes('tab=hidden');
      }
      if (section.id === 'unsold') {
        return url.includes('tab=unsold');
      }
      return url.includes('/sold');
    };
    const hasSectionContext = async () =>
      isSectionUrl(page.url().toLowerCase()) || Boolean(await firstVisible(section.stateSelectors));

    if (await hasSectionContext()) {
      return true;
    }

    const trigger = await findSectionTrigger(section);
    if (trigger) {
      await trigger.click({ timeout: 2_000 }).catch(() => undefined);
      if (
        await waitForCondition(hasSectionContext, {
          timeoutMs: 2_500,
          intervalMs: 100,
        })
      ) {
        return true;
      }
    }

    if (section.url) {
      await page.goto(section.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      }).catch(() => undefined);
      if (
        await waitForCondition(hasSectionContext, {
          timeoutMs: 2_500,
          intervalMs: 100,
        })
      ) {
        return true;
      }
    }

    return hasSectionContext();
  };

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
          const normalize = (value) =>
            String(value || '')
              .replace(/\s+/g, ' ')
              .trim();
          const readTextList = (root, selector) =>
            Array.from(root.querySelectorAll(selector))
              .map((node) => normalize(node.textContent || ''))
              .filter(Boolean);

          const candidateContainer =
            element.closest(
              'article, li, tr, [data-testid*="listing"], [data-testid*="item"], [class*="listing"], [class*="Listing"], [class*="result"], [class*="Result"]'
            ) || element;
          const titleElement = candidateContainer.querySelector(
            'h1, h2, h3, h4, [data-testid*="title"], [data-testid*="Title"], [class*="title"], [class*="Title"]'
          );

          const headingTexts = [];
          const contextTexts = [];
          let current = candidateContainer;
          for (let depth = 0; depth < 4 && current; depth += 1) {
            const currentText = normalize(current.textContent || '');
            if (currentText) {
              contextTexts.push(currentText.slice(0, 1_500));
            }

            const directHeading = current.querySelector(
              'h1, h2, h3, h4, [role="heading"], [data-testid*="heading"], [class*="heading"], [class*="Heading"]'
            );
            if (directHeading) {
              const text = normalize(directHeading.textContent || '');
              if (text) {
                headingTexts.push(text);
              }
            }

            const previous = current.previousElementSibling;
            if (previous) {
              const previousText = normalize(previous.textContent || '');
              if (previousText) {
                contextTexts.push(previousText.slice(0, 500));
              }

              const previousHeading =
                previous.matches('h1, h2, h3, h4, [role="heading"]')
                  ? previous
                  : previous.querySelector(
                      'h1, h2, h3, h4, [role="heading"], [data-testid*="heading"], [class*="heading"], [class*="Heading"]'
                    );
              if (previousHeading) {
                const text = normalize(previousHeading.textContent || '');
                if (text) {
                  headingTexts.push(text);
                }
              }
            }

            current = current.parentElement;
          }

          const badgeTexts = readTextList(
            candidateContainer,
            [
              '[role="status"]',
              '[data-testid*="status"]',
              '[data-testid*="badge"]',
              '[data-testid*="tag"]',
              '[class*="status"]',
              '[class*="Status"]',
              '[class*="badge"]',
              '[class*="Badge"]',
              '[class*="tag"]',
              '[class*="Tag"]',
            ].join(', ')
          );

          return {
            href: element.getAttribute('href') || '',
            text: normalize(element.textContent || ''),
            containerText: normalize(candidateContainer.textContent || ''),
            titleText: normalize((titleElement && titleElement.textContent) || ''),
            statusBadgeText: badgeTexts.join(' | '),
            statusContextText: [...headingTexts, ...contextTexts]
              .filter((value, idx, items) => value && items.indexOf(value) === idx)
              .join(' | '),
          };
        })
        .catch(() => null);

      if (!candidateInfo || !candidateInfo.href) continue;

      let resolvedListingUrl = candidateInfo.href;
      try {
        resolvedListingUrl = new URL(candidateInfo.href, page.url()).toString();
      } catch {}

      const inferredTitleFromUrl = inferListingTitleFromUrl(resolvedListingUrl);
      const listingId = extractListingId(resolvedListingUrl);
      const dedupeKey = listingId || resolvedListingUrl;
      if (!dedupeKey || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      collected.push({
        listingUrl: resolvedListingUrl,
        listingId,
        title: normalizeWhitespace(candidateInfo.titleText || '') || inferredTitleFromUrl,
        text: normalizeWhitespace(candidateInfo.containerText || candidateInfo.text || ''),
        statusBadgeText: normalizeWhitespace(candidateInfo.statusBadgeText || ''),
        statusContextText: normalizeWhitespace(candidateInfo.statusContextText || ''),
      });
    }

    return collected;
  };

  const collectListingLinksForTerm = async (term, maxMatches = null) => {
    const normalizedTerm = normalizeListingMatchValue(term);
    if (!normalizedTerm) return [];

    const matchLimit =
      typeof maxMatches === 'number' && Number.isFinite(maxMatches) && maxMatches > 0
        ? Math.max(1, Math.floor(maxMatches))
        : null;
    const candidates = await collectVisibleListingCandidates();
    const matches = [];

    for (const candidate of candidates) {
      const normalizedCandidateTitle = normalizeListingMatchValue(candidate.title || '');
      if (!normalizedCandidateTitle || normalizedCandidateTitle !== normalizedTerm) {
        continue;
      }
      matches.push(candidate);
      if (matchLimit !== null && matches.length >= matchLimit) {
        break;
      }
    }

    return matches;
  };

  const dedupeCandidatesByListing = (candidates) => {
    const deduped = [];
    const seen = new Set();

    for (const candidate of Array.isArray(candidates) ? candidates : []) {
      const dedupeKey = candidate?.listingId || candidate?.listingUrl || null;
      if (!dedupeKey || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      deduped.push(candidate);
    }

    return deduped;
  };

  const isLikelyDuplicateMatchByText = (candidate, normalizedSearchTerm) => {
    if (!normalizedSearchTerm) {
      return false;
    }

    const normalizedCandidateTitle = normalizeListingMatchValue(candidate?.title || '');
    const normalizedCandidateText = normalizeListingMatchValue(
      [candidate?.text || '', candidate?.title || ''].filter(Boolean).join(' ')
    );
    const candidateTitle = normalizedCandidateTitle;
    const candidateText = normalizedCandidateText;

    if (!candidateTitle && !candidateText) {
      return false;
    }

    if (
      candidateTitle === normalizedSearchTerm ||
      candidateText === normalizedSearchTerm ||
      candidateTitle.includes(normalizedSearchTerm) ||
      candidateText.includes(normalizedSearchTerm)
    ) {
      return true;
    }

    if (candidateTitle && normalizedSearchTerm.includes(candidateTitle) && candidateTitle.length >= 12) {
      return true;
    }

    const searchTokens = normalizedSearchTerm
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token.length >= 3);
    if (searchTokens.length < 2) {
      return false;
    }

    const candidateTokens = new Set(
      normalizeWhitespace([candidateTitle, candidateText].filter(Boolean).join(' '))
        .split(' ')
        .map((token) => token.trim())
        .filter((token) => token.length >= 3)
    );
    let matchCount = 0;
    for (const token of searchTokens) {
      if (candidateTokens.has(token)) {
        matchCount += 1;
      }
    }

    return matchCount >= Math.min(2, Math.ceil(searchTokens.length / 2));
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

  const resolveRawStatusTag = (sectionId, candidate) => {
    const haystack = normalizeWhitespace(
      [candidate.text, candidate.statusBadgeText, candidate.statusContextText].filter(Boolean).join(' | ')
    ).toLowerCase();

    if (sectionId === 'active') {
      return 'active';
    }

    if (sectionId === 'unsold') {
      if (
        haystack.includes('closed') ||
        haystack.includes('stängd') ||
        haystack.includes('cancelled') ||
        haystack.includes('canceled')
      ) {
        return 'closed';
      }
      if (
        haystack.includes('ended') ||
        haystack.includes('avslutad') ||
        haystack.includes('avslutades') ||
        haystack.includes('expired') ||
        haystack.includes('utgången')
      ) {
        return 'ended';
      }
      return 'unsold';
    }

    if (
      haystack.includes('not paid') ||
      haystack.includes('unpaid') ||
      haystack.includes('ej betald') ||
      haystack.includes('obetald')
    ) {
      return 'not_paid';
    }
    if (
      haystack.includes('shipped') ||
      haystack.includes('skickad') ||
      haystack.includes('skickat') ||
      haystack.includes('sent')
    ) {
      return 'shipped';
    }
    if (
      haystack.includes('to deliver') ||
      haystack.includes('to ship') ||
      haystack.includes('att leverera') ||
      haystack.includes('paid') ||
      haystack.includes('betald') ||
      haystack.includes('betalad')
    ) {
      return 'paid';
    }
    return 'sold';
  };

  const mapCanonicalStatus = (sectionId, rawStatusTag) => {
    if (sectionId === 'active') {
      return 'active';
    }
    if (sectionId === 'sold') {
      return 'sold';
    }
    if (rawStatusTag === 'closed' || rawStatusTag === 'ended') {
      return 'ended';
    }
    return 'unsold';
  };

  const inspectMatchingCandidate = async (section, candidate) => {
    const rawStatusTag = resolveRawStatusTag(section.id, candidate);
    await page.goto(candidate.listingUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await waitForPageIdle(1_200);
    await acceptCookies();
    await waitForPageIdle(800);

    const finalUrl = page.url();
    const listingText = await readDuplicateCandidateListingText();
    const matchedProductId = extractReferencedProductId(listingText);
    const descriptionMatched = rawDescriptionEn
      ? descriptionsMatch(listingText, rawDescriptionEn)
      : false;
    const productIdMatched = baseProductId
      ? identifiersMatch(baseProductId, matchedProductId || '')
      : false;

    if (!descriptionMatched && !productIdMatched) {
      return null;
    }

    return {
      listingUrl: finalUrl || candidate.listingUrl,
      listingId: extractListingId(finalUrl) || candidate.listingId || null,
      rawStatusTag,
      canonicalStatus: mapCanonicalStatus(section.id, rawStatusTag),
      matchStrategy: descriptionMatched ? 'title+description' : 'title+product-id',
      matchedProductId: matchedProductId || null,
      sectionId: section.id,
      sectionLabel: section.label,
      candidateCount: null,
    };
  };

  const searchSection = async (section) => {
    updateStep(section.searchStepId, 'running', 'Opening ' + section.label + ' and searching for an exact English title match.');

    const sectionReady = await ensureSectionContext(section);
    if (!sectionReady) {
      throw new Error('FAIL_STATUS_SECTION_UNAVAILABLE: ' + section.label + ' could not be opened.');
    }

    await acceptCookies();
    await waitForPageIdle(800);

    const searchInput = await openScopedSearchInput();
    if (!searchInput) {
      throw new Error('FAIL_STATUS_SEARCH_UNAVAILABLE: Search input not found in ' + section.label + '.');
    }

    const preparedSearchValue = await prepareSearchInput(searchInput, resolvedSearchTitle || '');
    const searchTrigger = await triggerSearchSubmit();

    const visibleCandidates = await collectVisibleListingCandidates();
    const normalizedSearchTerm = normalizeListingMatchValue(resolvedSearchTitle || '');
    const exactTitleCandidates = await collectListingLinksForTerm(resolvedSearchTitle || '');
    const fallbackCandidates =
      exactTitleCandidates.length === 0
        ? visibleCandidates.filter((candidate) =>
            isLikelyDuplicateMatchByText(candidate, normalizedSearchTerm)
          )
        : [];
    const inspectionCandidates = dedupeCandidatesByListing([
      ...exactTitleCandidates,
      ...fallbackCandidates,
    ]);
    updateStep(
      section.searchStepId,
      'success',
      inspectionCandidates.length > 0
        ? 'Found ' +
            inspectionCandidates.length +
            ' candidate(s) in ' +
            section.label +
            ' using "' +
            preparedSearchValue +
            '" (' +
            searchTrigger +
            ')' +
            (exactTitleCandidates.length > 0
              ? '.'
              : ' via fallback candidate recovery from visible listing text.')
        : 'No exact-title candidates were found in ' + section.label + ' for "' + preparedSearchValue + '".'
    );

    if (inspectionCandidates.length === 0) {
      updateStep(
        section.inspectStepId,
        'success',
        'No candidate inspection was needed in ' + section.label + ' because no exact-title matches were found.'
      );
      return null;
    }

    updateStep(
      section.inspectStepId,
      'running',
      'Inspecting ' + inspectionCandidates.length + ' candidate(s) from ' + section.label + ' by description and Product ID.'
    );

    for (const candidate of inspectionCandidates) {
      const matchedCandidate = await inspectMatchingCandidate(section, candidate);
      if (!matchedCandidate) {
        continue;
      }

      updateStep(
        section.inspectStepId,
        'success',
        'Matched the listing in ' +
          section.label +
          ' using ' +
          matchedCandidate.matchStrategy +
          ' and resolved raw status tag "' +
          matchedCandidate.rawStatusTag +
          '".'
      );

      return {
        ...matchedCandidate,
        candidateCount: inspectionCandidates.length,
      };
    }

    updateStep(
      section.inspectStepId,
      'success',
      'Exact-title candidates were found in ' +
        section.label +
        ', but none matched the product description or Product ID.'
    );
    return null;
  };
`;
