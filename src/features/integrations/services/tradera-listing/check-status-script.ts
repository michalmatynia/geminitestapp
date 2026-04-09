/**
 * Tradera listing status-check script.
 *
 * Verifies listing state from the authenticated seller overview instead of
 * trusting the public item page. The search order is:
 * 1. Active listings
 * 2. Unsold items
 * 3. Your sold items
 *
 * Candidate matching mirrors the duplicate-link flow:
 * - exact English title search
 * - confirm by description first
 * - fall back to Product ID match
 */
export const TRADERA_CHECK_STATUS_SCRIPT = String.raw`export default async function run({
  page,
  input,
  emit,
  log,
}) {
  const OVERVIEW_URL = 'https://www.tradera.com/en/my/overview';
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
  const DUPLICATE_DESCRIPTION_TEXT_SELECTORS = [
    '[data-testid*="description"]',
    '[id*="description" i]',
    '[class*="description" i]',
    '[class*="Description"]',
    'article',
    'main',
  ];
  const COOKIE_SELECTORS = [
    '#onetrust-accept-btn-handler',
    'button:has-text("Acceptera alla cookies")',
    'button:has-text("Acceptera alla kakor")',
    'button:has-text("Acceptera alla")',
    'button:has-text("Accept all cookies")',
    'button:has-text("Accept all")',
    'button:has-text("Godkänn alla")',
  ];
  const SECTIONS = [
    {
      id: 'active',
      label: 'Active listings',
      url: 'https://www.tradera.com/en/my/listings',
      tabLabels: ['Active listings', 'Active', 'Aktiva annonser', 'Aktiva'],
      stateSelectors: [
        '[aria-current="page"]:has-text("Active")',
        '[aria-current="true"]:has-text("Active")',
        '[role="tab"][aria-selected="true"]:has-text("Active")',
        '[aria-current="page"]:has-text("Aktiva")',
        '[aria-current="true"]:has-text("Aktiva")',
        '[role="tab"][aria-selected="true"]:has-text("Aktiva")',
      ],
      searchStepId: 'search_active',
      inspectStepId: 'inspect_active',
    },
    {
      id: 'unsold',
      label: 'Unsold items',
      url: 'https://www.tradera.com/en/my/listings?tab=unsold',
      tabLabels: ['Unsold items', 'Unsold', 'Osålda objekt', 'Osålda'],
      stateSelectors: [
        '[aria-current="page"]:has-text("Unsold")',
        '[aria-current="true"]:has-text("Unsold")',
        '[role="tab"][aria-selected="true"]:has-text("Unsold")',
        '[aria-current="page"]:has-text("Osålda")',
        '[aria-current="true"]:has-text("Osålda")',
        '[role="tab"][aria-selected="true"]:has-text("Osålda")',
      ],
      searchStepId: 'search_unsold',
      inspectStepId: 'inspect_unsold',
    },
    {
      id: 'sold',
      label: 'Your sold items',
      url: 'https://www.tradera.com/en/my/sold',
      tabLabels: ['Your sold items', 'Sold items', 'Sold', 'Dina sålda', 'Sålda'],
      stateSelectors: [
        '[aria-current="page"]:has-text("Sold")',
        '[aria-current="true"]:has-text("Sold")',
        '[role="tab"][aria-selected="true"]:has-text("Sold")',
        '[aria-current="page"]:has-text("Sålda")',
        '[aria-current="true"]:has-text("Sålda")',
        '[role="tab"][aria-selected="true"]:has-text("Sålda")',
        '[aria-current="page"]:has-text("Dina sålda")',
        '[aria-current="true"]:has-text("Dina sålda")',
        '[role="tab"][aria-selected="true"]:has-text("Dina sålda")',
      ],
      searchStepId: 'search_sold',
      inspectStepId: 'inspect_sold',
    },
  ];

  const toText = (value) =>
    typeof value === 'string' ? value.trim() : '';
  const normalizeWhitespace = (value) =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  const duplicateSearchTerms = Array.isArray(input?.duplicateSearchTerms)
    ? input.duplicateSearchTerms
        .map((value) => normalizeWhitespace(value))
        .filter((value, index, items) => value && items.indexOf(value) === index)
    : [input?.duplicateSearchTitle, input?.title]
        .map((value) => normalizeWhitespace(value))
        .filter((value, index, items) => value && items.indexOf(value) === index);
  const searchTitle = duplicateSearchTerms[0] || null;
  const listingUrl = toText(input?.listingUrl) || null;
  const externalListingId = toText(input?.externalListingId) || null;
  const baseProductId = toText(input?.baseProductId) || toText(input?.productId) || null;
  const rawDescriptionEn = toText(input?.rawDescriptionEn) || null;

  const executionSteps = [
    {
      id: 'open_overview',
      label: 'Open My Overview',
      status: 'pending',
      message: null,
    },
    {
      id: 'accept_cookies',
      label: 'Handle cookie consent',
      status: 'pending',
      message: null,
    },
    {
      id: 'search_active',
      label: 'Search Active listings',
      status: 'pending',
      message: null,
    },
    {
      id: 'inspect_active',
      label: 'Inspect Active listing candidates',
      status: 'pending',
      message: null,
    },
    {
      id: 'search_unsold',
      label: 'Search Unsold items',
      status: 'pending',
      message: null,
    },
    {
      id: 'inspect_unsold',
      label: 'Inspect Unsold item candidates',
      status: 'pending',
      message: null,
    },
    {
      id: 'search_sold',
      label: 'Search Your sold items',
      status: 'pending',
      message: null,
    },
    {
      id: 'inspect_sold',
      label: 'Inspect sold item candidates',
      status: 'pending',
      message: null,
    },
    {
      id: 'resolve_status',
      label: 'Resolve final Tradera status',
      status: 'pending',
      message: null,
    },
  ];

  const updateStep = (id, status, message) => {
    const step = executionSteps.find((candidate) => candidate.id === id);
    if (!step) return;
    step.status = status;
    step.message = typeof message === 'string' && message.trim() ? message.trim() : null;
  };

  const skipStep = (id, message) => {
    const step = executionSteps.find((candidate) => candidate.id === id);
    if (!step || step.status !== 'pending') return;
    step.status = 'skipped';
    step.message = typeof message === 'string' && message.trim() ? message.trim() : null;
  };

  const failActiveStep = (message) => {
    const runningStep = [...executionSteps].reverse().find((step) => step.status === 'running');
    if (runningStep) {
      runningStep.status = 'error';
      runningStep.message = message;
    } else {
      updateStep('resolve_status', 'error', message);
    }

    for (const step of executionSteps) {
      if (step.status === 'pending') {
        step.status = 'skipped';
        step.message = 'Skipped because an earlier verification step failed.';
      }
    }
  };

  const wait = (ms) => page.waitForTimeout(ms).catch(() => undefined);

  const firstVisible = async (selectors) => {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      const visible = await locator.isVisible().catch(() => false);
      if (visible) {
        return locator;
      }
    }
    return null;
  };

  const acceptCookies = async () => {
    let accepted = false;
    for (const selector of COOKIE_SELECTORS) {
      const locator = page.locator(selector).first();
      const visible = await locator.isVisible({ timeout: 800 }).catch(() => false);
      if (!visible) continue;
      await locator.click({ timeout: 2_000 }).catch(() => undefined);
      accepted = true;
      break;
    }

    updateStep(
      'accept_cookies',
      'success',
      accepted
        ? 'Accepted the visible cookie consent prompt.'
        : 'No blocking cookie consent prompt was detected.'
    );

    if (log) {
      log('tradera.check_status.cookies_handled', { accepted });
    }
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

  const titlesExactlyMatch = (left, right) => {
    const normalizedLeft = normalizeWhitespace(left).toLowerCase();
    const normalizedRight = normalizeWhitespace(right).toLowerCase();
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
    const match = normalizedValue.match(/(?:item reference|product id)\s*:\s*([^|\n\r]+)/i);
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
        const escapedLabel = label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\$&');
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
      await searchTrigger.click({ timeout: 2_000 }).catch(() => undefined);
      await wait(500);
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
    if (!searchInput || !expectedTerm) {
      return '';
    }

    await searchInput.click({ timeout: 2_000 }).catch(() => undefined);
    await searchInput.fill('').catch(() => undefined);
    await searchInput.fill(expectedTerm).catch(() => undefined);
    await wait(250);

    let appliedValue = await readSearchInputValue(searchInput);
    if (normalizeWhitespace(appliedValue).toLowerCase() !== expectedTerm.toLowerCase()) {
      await searchInput.fill('').catch(() => undefined);
      await searchInput.fill(expectedTerm).catch(() => undefined);
      await wait(250);
      appliedValue = await readSearchInputValue(searchInput);
    }

    if (normalizeWhitespace(appliedValue).toLowerCase() !== expectedTerm.toLowerCase()) {
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
      await wait(500);
      return 'button';
    }

    await page.keyboard.press('Enter').catch(() => undefined);
    await wait(500);
    return 'enter';
  };

  const findSectionTrigger = async (section) => {
    for (const label of section.tabLabels) {
      const escapedLabel = label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\$&');
      const locators = [
        page.getByRole('tab', { name: new RegExp(escapedLabel, 'i') }),
        page.getByRole('link', { name: new RegExp(escapedLabel, 'i') }),
        page.getByRole('button', { name: new RegExp(escapedLabel, 'i') }),
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
      await wait(1_500);
      if (await hasSectionContext()) {
        return true;
      }
    }

    if (section.url) {
      await page.goto(section.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      }).catch(() => undefined);
      await wait(1_500);
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

      const listingId = extractListingId(resolvedListingUrl);
      const dedupeKey = listingId || resolvedListingUrl;
      if (!dedupeKey || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      collected.push({
        listingUrl: resolvedListingUrl,
        listingId,
        title: normalizeWhitespace(candidateInfo.titleText || ''),
        text: normalizeWhitespace(candidateInfo.containerText || candidateInfo.text || ''),
        statusBadgeText: normalizeWhitespace(candidateInfo.statusBadgeText || ''),
        statusContextText: normalizeWhitespace(candidateInfo.statusContextText || ''),
      });
    }

    return collected;
  };

  const collectListingLinksForTerm = async (term, maxMatches = null) => {
    const normalizedTerm = normalizeWhitespace(term).toLowerCase();
    if (!normalizedTerm) return [];

    const matchLimit =
      typeof maxMatches === 'number' && Number.isFinite(maxMatches) && maxMatches > 0
        ? Math.max(1, Math.floor(maxMatches))
        : null;
    const candidates = await collectVisibleListingCandidates();
    const matches = [];

    for (const candidate of candidates) {
      const normalizedCandidateTitle = normalizeWhitespace(candidate.title || '').toLowerCase();
      if (!normalizedCandidateTitle || !titlesExactlyMatch(normalizedCandidateTitle, normalizedTerm)) {
        continue;
      }
      matches.push(candidate);
      if (matchLimit !== null && matches.length >= matchLimit) {
        break;
      }
    }

    return matches;
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
    await wait(900);
    await acceptCookies();
    await wait(500);

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
    await wait(600);

    const searchInput = await openScopedSearchInput();
    if (!searchInput) {
      throw new Error('FAIL_STATUS_SEARCH_UNAVAILABLE: Search input not found in ' + section.label + '.');
    }

    const preparedSearchValue = await prepareSearchInput(searchInput, searchTitle || '');
    const searchTrigger = await triggerSearchSubmit();
    await wait(1_200);

    const exactTitleCandidates = await collectListingLinksForTerm(searchTitle || '');
    updateStep(
      section.searchStepId,
      'success',
      exactTitleCandidates.length > 0
        ? 'Found ' +
            exactTitleCandidates.length +
            ' exact-title candidate(s) in ' +
            section.label +
            ' using "' +
            preparedSearchValue +
            '" (' +
            searchTrigger +
            ').'
        : 'No exact-title candidates were found in ' + section.label + ' for "' + preparedSearchValue + '".'
    );

    if (exactTitleCandidates.length === 0) {
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
      'Inspecting ' + exactTitleCandidates.length + ' candidate(s) from ' + section.label + ' by description and Product ID.'
    );

    for (const candidate of exactTitleCandidates) {
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
        candidateCount: exactTitleCandidates.length,
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

  if (!searchTitle) {
    updateStep('open_overview', 'error', 'No English title was available for Tradera section search.');
    skipStep('accept_cookies', 'Skipped because no searchable English title was available.');
    skipStep('search_active', 'Skipped because no searchable English title was available.');
    skipStep('inspect_active', 'Skipped because no searchable English title was available.');
    skipStep('search_unsold', 'Skipped because no searchable English title was available.');
    skipStep('inspect_unsold', 'Skipped because no searchable English title was available.');
    skipStep('search_sold', 'Skipped because no searchable English title was available.');
    skipStep('inspect_sold', 'Skipped because no searchable English title was available.');
    skipStep('resolve_status', 'Skipped because no searchable English title was available.');
    emit('result', {
      publishVerified: false,
      listingUrl,
      externalListingId,
      status: 'unknown',
      error: 'No English title available to search Tradera overview sections.',
      executionSteps,
    });
    return;
  }

  try {
    if (log) {
      log('tradera.check_status.start', {
        listingUrl,
        externalListingId,
        searchTitle,
        baseProductId,
      });
    }

    updateStep('open_overview', 'running', 'Opening Tradera My Overview.');
    await page.goto(OVERVIEW_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    updateStep('open_overview', 'success', 'Tradera My Overview opened successfully.');

    await acceptCookies();
    await wait(800);

    let matchedResult = null;
    for (const section of SECTIONS) {
      if (matchedResult) {
        skipStep(section.searchStepId, 'Skipped because the listing was already matched in ' + matchedResult.sectionLabel + '.');
        skipStep(section.inspectStepId, 'Skipped because the listing was already matched in ' + matchedResult.sectionLabel + '.');
        continue;
      }

      matchedResult = await searchSection(section);
    }

    updateStep('resolve_status', 'running', 'Resolving the final Tradera status from the verified section match.');

    if (matchedResult) {
      updateStep(
        'resolve_status',
        'success',
        'Resolved Tradera status as ' +
          matchedResult.canonicalStatus +
          ' from ' +
          matchedResult.sectionLabel +
          ' with raw tag "' +
          matchedResult.rawStatusTag +
          '".'
      );

      if (log) {
        log('tradera.check_status.status_detected', {
          status: matchedResult.canonicalStatus,
          rawStatusTag: matchedResult.rawStatusTag,
          verificationSection: matchedResult.sectionId,
          verificationMatchStrategy: matchedResult.matchStrategy,
          finalUrl: matchedResult.listingUrl,
          matchedProductId: matchedResult.matchedProductId,
        });
      }

      emit('result', {
        publishVerified: false,
        listingUrl: matchedResult.listingUrl || listingUrl,
        externalListingId: matchedResult.listingId || externalListingId,
        status: matchedResult.canonicalStatus,
        verificationSection: matchedResult.sectionId,
        verificationMatchStrategy: matchedResult.matchStrategy,
        verificationRawStatusTag: matchedResult.rawStatusTag,
        verificationMatchedProductId: matchedResult.matchedProductId,
        verificationSearchTitle: searchTitle,
        verificationCandidateCount: matchedResult.candidateCount,
        executionSteps,
      });
      return;
    }

    updateStep(
      'resolve_status',
      'success',
      'The listing was not found in Active listings, Unsold items, or Your sold items, so it was treated as removed.'
    );

    if (log) {
      log('tradera.check_status.status_detected', {
        status: 'removed',
        rawStatusTag: 'removed',
        verificationSection: null,
        verificationMatchStrategy: null,
        finalUrl: listingUrl,
      });
    }

    emit('result', {
      publishVerified: false,
      listingUrl,
      externalListingId,
      status: 'removed',
      verificationSection: null,
      verificationMatchStrategy: null,
      verificationRawStatusTag: 'removed',
      verificationMatchedProductId: null,
      verificationSearchTitle: searchTitle,
      verificationCandidateCount: 0,
      executionSteps,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    failActiveStep(msg);
    if (log) {
      log('tradera.check_status.failed', { error: msg });
      log('error', '[check-status] error: ' + msg);
    }
    emit('result', {
      publishVerified: false,
      listingUrl,
      externalListingId,
      status: 'unknown',
      error: msg,
      executionSteps,
    });
  }
}`;
