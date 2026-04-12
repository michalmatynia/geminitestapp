export const AMAZON_REVERSE_IMAGE_SCAN_SCRIPT_PART_2 = String.raw`    };
  };

  const dismissAmazonOverlaysIfPresent = async () => {
    const cookieAcceptSelectors = [
      '#sp-cc-accept',
      'input#sp-cc-accept',
      'button:has-text("Accept")',
      'input[aria-labelledby*="accept"]',
      'input[name="accept"]',
    ];
    const cookieDismissSelectors = [
      '#sp-cc-rejectall-link',
      '#sp-cc-customize-link',
      'button:has-text("Decline")',
      'button:has-text("Dismiss")',
      '[aria-label="Close"]',
      '[data-action="a-popover-close"]',
    ];
    const addressDismissSelectors = [
      '#glow-toaster button:has-text("Dismiss")',
      'button:has-text("Dismiss")',
      'button[aria-label="Dismiss"]',
      'input[data-action-type="DISMISS"]',
      '[data-action="GLUXPostalUpdateAction"] [aria-label="Close"]',
    ];

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const state = await detectAmazonOverlayState();
      if (
        !state.cookieVisible &&
        (!state.addressVisible || state.productContentReady)
      ) {
        return {
          cleared: true,
          blocked: false,
          message: null,
        };
      }

      let changed = false;
      if (state.cookieVisible) {
        changed =
          (await clickFirstVisible(cookieAcceptSelectors)) ||
          (await clickFirstVisible(cookieDismissSelectors)) ||
          changed;
      }
      if (state.addressVisible) {
        changed = (await clickFirstVisible(addressDismissSelectors)) || changed;
      }

      if (changed) {
        log('amazon.scan.amazon_overlay_dismissed', {
          attempt: attempt + 1,
          currentUrl: page.url(),
        });
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
        await wait(1200);
        continue;
      }

      await wait(1000);
    }

    const finalState = await detectAmazonOverlayState();
    if (
      !finalState.cookieVisible &&
      (!finalState.addressVisible || finalState.productContentReady)
    ) {
      return {
        cleared: true,
        blocked: false,
        message: null,
      };
    }

    const blockedMessages = [
      finalState.cookieVisible ? 'Amazon cookie preferences dialog remained open.' : null,
      finalState.addressVisible && !finalState.productContentReady
        ? 'Amazon delivery destination banner remained open.'
        : null,
    ].filter(Boolean);

    return {
      cleared: false,
      blocked: true,
      message:
        blockedMessages.join(' ') || 'Amazon page remained blocked before product content became available.',
    };
  };

  const waitForAmazonProductContent = async () => {
    const visibleSelector = await Promise.any(
      AMAZON_PRODUCT_CONTENT_SELECTORS.map(async (selector) => {
        const locator = page.locator(selector).first();
        await locator.waitFor({ state: 'visible', timeout: 10000 });
        return selector;
      })
    ).catch(() => null);

    return Boolean(visibleSelector);
  };

  const getMetaContent = async (selector) =>
    await page
      .locator(selector)
      .first()
      .getAttribute('content')
      .catch(() => null);

  const readFirstText = async (selectors) => {
    for (const selector of selectors) {
      const text = await page
        .locator(selector)
        .first()
        .textContent()
        .catch(() => null);
      const normalized = toText(text);
      if (normalized) {
        return normalized;
      }
    }
    return null;
  };

  const dedupeTextList = (values, limit = 30) => {
    const result = [];
    const seen = new Set();

    for (const value of Array.isArray(values) ? values : []) {
      const normalized = toText(value);
      if (!normalized) {
        continue;
      }
      const dedupeKey = normalized.toLowerCase();
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      result.push(normalized);
      if (result.length >= limit) {
        break;
      }
    }

    return result;
  };

  const normalizeAmazonAttributeLabel = (value) => {
    const normalized = toText(value);
    if (!normalized) {
      return null;
    }
    return normalized.replace(/\s+/g, ' ').replace(/[:\u200e\u200f]+$/g, '').trim();
  };

  const normalizeAmazonAttributeKey = (value) => {
    const normalizedLabel = normalizeAmazonAttributeLabel(value);
    if (!normalizedLabel) {
      return null;
    }
    return normalizedLabel.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  };

  const dedupeAmazonAttributes = (attributes) => {
    const result = [];
    const seen = new Set();

    for (const entry of Array.isArray(attributes) ? attributes : []) {
      const key = normalizeAmazonAttributeKey(entry?.key || entry?.label);
      const label = normalizeAmazonAttributeLabel(entry?.label || entry?.key);
      const value = toText(entry?.value);
      const source = toText(entry?.source);
      if (!key || !label || !value) {
        continue;
      }

      const dedupeKey = [key, value.toLowerCase(), source || ''].join('::');
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      result.push({
        key,
        label,
        value,
        source,
      });

      if (result.length >= 100) {
        break;
      }
    }

    return result;
  };

  const readAmazonBulletPoints = async () =>
    dedupeTextList(
      await page
        .locator('#feature-bullets li span, #feature-bullets li')
        .evaluateAll((nodes) =>
          nodes
            .map((node) => (node instanceof HTMLElement ? node.innerText : node.textContent || ''))
            .filter(Boolean)
        )
        .catch(() => []),
      30
    );

  const readAmazonAttributePairs = async () =>
    dedupeAmazonAttributes(
      await page
        .evaluate(() => {
          const normalizeText = (value) =>
            typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
          const pairs = [];
          const seen = new Set();

          const pushPair = (label, value, source) => {
            const normalizedLabel = normalizeText(label).replace(/[:\u200e\u200f]+$/g, '').trim();
            const normalizedValue = normalizeText(value);
            const normalizedSource = normalizeText(source);
            if (!normalizedLabel || !normalizedValue) {
              return;
            }

            const dedupeKey = [normalizedLabel.toLowerCase(), normalizedValue.toLowerCase(), normalizedSource].join('::');
            if (seen.has(dedupeKey)) {
              return;
            }
            seen.add(dedupeKey);
            pairs.push({
              label: normalizedLabel,
              value: normalizedValue,
              source: normalizedSource || null,
            });
          };

          const collectTableRows = (selector, source) => {
            document.querySelectorAll(selector).forEach((row) => {
              const label =
                normalizeText(
                  row.querySelector('th')?.textContent ||
                    row.querySelector('td.a-span3 span.a-text-bold')?.textContent ||
                    row.querySelector('td:first-child span.a-text-bold')?.textContent ||
                    row.querySelector('td:first-child')?.textContent
                ) || '';
              const value =
                normalizeText(
                  row.querySelector('td.a-span9 span.po-break-word')?.textContent ||
                    row.querySelector('td.a-span9')?.textContent ||
                    row.querySelector('td:last-child span.po-break-word')?.textContent ||
                    row.querySelector('td:last-child')?.textContent
                ) || '';
              pushPair(label, value, source);
            });
          };

          const collectDetailBulletPairs = (selector, source) => {
            document.querySelectorAll(selector).forEach((item) => {
              const boldLabel = normalizeText(
                item.querySelector('.a-text-bold')?.textContent ||
                  item.querySelector('span.a-text-bold')?.textContent
              );
              const text = normalizeText(
                item instanceof HTMLElement ? item.innerText : item.textContent || ''
              );
              if (!text) {
                return;
              }
              if (boldLabel) {
                const suffix = normalizeText(text.slice(boldLabel.length).replace(/^[:\s]+/, ''));
                pushPair(boldLabel, suffix, source);
                return;
              }

              const colonIndex = text.indexOf(':');
              if (colonIndex <= 0) {
                return;
              }

              pushPair(text.slice(0, colonIndex), text.slice(colonIndex + 1), source);
            });
          };

          collectDetailBulletPairs('#detailBullets_feature_div li', 'detail_bullets');
          collectDetailBulletPairs('#detailBulletsWrapper_feature_div li', 'detail_bullets');
          collectTableRows('#productDetails_techSpec_section_1 tr', 'technical_details');
          collectTableRows('#productDetails_detailBullets_sections1 tr', 'product_details');
          collectTableRows('#technicalSpecifications_section_1 tr', 'technical_specifications');
          collectTableRows('#productOverview_feature_div tr', 'product_overview');
          collectTableRows('#poExpander tr', 'product_overview');

          return pairs;
        })
        .catch(() => [])
    );

  const findAmazonAttributeValue = (attributes, labels) => {
    const keys = labels
      .map((label) => normalizeAmazonAttributeKey(label))
      .filter(Boolean);
    for (const key of keys) {
      const match = attributes.find((entry) => entry.key === key);
      if (match?.value) {
        return match.value;
      }
    }
    return null;
  };

  const parseAmazonRankings = (value) => {
    const normalized = toText(value);
    if (!normalized) {
      return [];
    }

    const entries = [];
    const seen = new Set();
    const parts = normalized
      .replace(/\u00a0/g, ' ')
      .split(/(?=#\s*\d)/g)
      .map((part) => part.trim())
      .filter(Boolean);

    for (const part of parts) {
      const match = part.match(/(#[\d,.\s]+)\s+in\s+(.+)/i);
      if (!match) {
        continue;
      }

      const rank = toText(match[1]?.replace(/\s+/g, ' '));
      const category = toText(match[2]?.replace(/\(.*?\)/g, '').replace(/\s+/g, ' '));
      if (!rank) {
        continue;
      }

      const dedupeKey = [rank, category || ''].join('::').toLowerCase();
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      entries.push({
        rank,
        category,
        source: 'best_sellers_rank',
      });

      if (entries.length >= 20) {
        break;
      }
    }

    return entries;
  };

  const buildAmazonDetails = async () => {
    const attributes = await readAmazonAttributePairs();
    const bulletPoints = await readAmazonBulletPoints();
    const bestSellersRank = findAmazonAttributeValue(attributes, [
      'Best Sellers Rank',
      'Amazon Best Sellers Rank',
      'Bestsellers Rank',
    ]);
    const sharedEanGtin = findAmazonAttributeValue(attributes, ['EAN / GTIN', 'EAN/GTIN']);

    const amazonDetails = {
      brand: findAmazonAttributeValue(attributes, ['Brand']),
      manufacturer: findAmazonAttributeValue(attributes, ['Manufacturer']),
      modelNumber: findAmazonAttributeValue(attributes, [
        'Item model number',
        'Model number',
        'Model',
      ]),
      partNumber: findAmazonAttributeValue(attributes, [
        'Manufacturer Part Number',
        'Part Number',
        'MPN',
      ]),
      color: findAmazonAttributeValue(attributes, ['Color']),
      style: findAmazonAttributeValue(attributes, ['Style']),
      material: findAmazonAttributeValue(attributes, ['Material', 'Material Type']),
      size: findAmazonAttributeValue(attributes, ['Size']),
      pattern: findAmazonAttributeValue(attributes, ['Pattern']),
      finish: findAmazonAttributeValue(attributes, ['Finish', 'Finish Type']),
      itemDimensions: findAmazonAttributeValue(attributes, [
        'Product Dimensions',
        'Item Dimensions LxWxH',
        'Item Dimensions',
      ]),
      packageDimensions: findAmazonAttributeValue(attributes, ['Package Dimensions']),
      itemWeight: findAmazonAttributeValue(attributes, ['Item Weight', 'Product Weight']),
      packageWeight: findAmazonAttributeValue(attributes, ['Shipping Weight', 'Package Weight']),
      bestSellersRank,
      ean: findAmazonAttributeValue(attributes, ['EAN']) || sharedEanGtin,
      gtin: findAmazonAttributeValue(attributes, ['GTIN', 'GTIN-14']) || sharedEanGtin,
      upc: findAmazonAttributeValue(attributes, ['UPC']),
      isbn: findAmazonAttributeValue(attributes, ['ISBN-13', 'ISBN-10', 'ISBN']),
      bulletPoints,
      attributes,
      rankings: parseAmazonRankings(bestSellersRank),
    };

    const hasStructuredDetails = [
      amazonDetails.brand,
      amazonDetails.manufacturer,
      amazonDetails.modelNumber,
      amazonDetails.partNumber,
      amazonDetails.color,
      amazonDetails.style,
      amazonDetails.material,
      amazonDetails.size,
      amazonDetails.pattern,
      amazonDetails.finish,
      amazonDetails.itemDimensions,
      amazonDetails.packageDimensions,
      amazonDetails.itemWeight,
      amazonDetails.packageWeight,
      amazonDetails.bestSellersRank,
      amazonDetails.ean,
      amazonDetails.gtin,
      amazonDetails.upc,
      amazonDetails.isbn,
    ].some(Boolean);

    return hasStructuredDetails ||
      amazonDetails.bulletPoints.length > 0 ||
      amazonDetails.attributes.length > 0 ||
      amazonDetails.rankings.length > 0
      ? amazonDetails
      : null;
  };

  const scoreAmazonPageData = (result) =>
    [
      result?.title,
      result?.price,
      result?.url,
      result?.description,
      result?.amazonDetails?.brand,
      result?.amazonDetails?.manufacturer,
      result?.amazonDetails?.bestSellersRank,
      Array.isArray(result?.amazonDetails?.attributes) && result.amazonDetails.attributes.length > 0
        ? 'attributes'
        : null,
      Array.isArray(result?.amazonDetails?.bulletPoints) && result.amazonDetails.bulletPoints.length > 0
        ? 'bulletPoints'
        : null,
    ].filter(Boolean).length;

  const scoreAmazonMatchResult = (result) => {
    if (!result || typeof result !== 'object') {
      return -1;
    }

    let score = 0;
    if (result.asin) score += 100;
    if (result.title) score += 30;
    if (result.price) score += 18;
    if (result.description) score += 10;
    if (result.url) score += 8;
    if (result.amazonDetails?.brand) score += 6;
    if (result.amazonDetails?.manufacturer) score += 6;
    if (result.amazonDetails?.bestSellersRank) score += 4;
    if (Array.isArray(result.amazonDetails?.attributes)) {
      score += Math.min(20, result.amazonDetails.attributes.length);
    }
    if (Array.isArray(result.amazonDetails?.bulletPoints)) {
      score += Math.min(12, result.amazonDetails.bulletPoints.length);
    }

    return score;
  };

  const isStrongAmazonMatch = (result) =>
    Boolean(
      result?.asin &&
        result?.title &&
        (result?.price ||
          result?.amazonDetails?.brand ||
          result?.amazonDetails?.manufacturer ||
          (Array.isArray(result?.amazonDetails?.attributes) && result.amazonDetails.attributes.length >= 3))
    );

  const buildAmazonCandidateOutcome = (input = {}) => ({
    status:
      input.status === 'matched' ||
      input.status === 'probe_ready' ||
      input.status === 'no_match' ||
      input.status === 'failed'
        ? input.status
        : 'failed',
    asin: toText(input.asin),
    title: toText(input.title),
    price: toText(input.price),
    url: toText(input.url),
    description: toText(input.description),
    amazonDetails:
      input.amazonDetails && typeof input.amazonDetails === 'object' ? input.amazonDetails : null,
    amazonProbe:
      input.amazonProbe && typeof input.amazonProbe === 'object' ? input.amazonProbe : null,
    candidateUrls: Array.isArray(input.candidateUrls)
      ? input.candidateUrls
          .map((value) => toText(value))
          .filter(Boolean)
      : [],
    matchedImageId: toText(input.matchedImageId),
    currentUrl: toText(input.currentUrl) || page.url(),
    message: toText(input.message),
    stage: toText(input.stage) || 'amazon_extract',
  });

  const buildAmazonPhaseResult = (input = {}) => ({
    success: input.success === true,
    message: toText(input.message),
    currentUrl: toText(input.currentUrl) || page.url(),
    stage: toText(input.stage) || 'amazon_extract',
  });

  const resolveDirectCandidateUrl = (url) => {
    const href = toText(url);
    if (!href) return url;
    try {
      const parsed = new URL(href);
      if (isGoogleRedirectHost(parsed.hostname.toLowerCase()) && parsed.pathname === '/url') {
        const direct = parsed.searchParams.get('q') || parsed.searchParams.get('url');
        if (direct && direct.startsWith('http')) return direct;
      }
    } catch {}
    return url;
  };

  const dismissGoogleRedirectInterstitialIfPresent = async () => {
    const currentUrl = page.url();
    let host = '';
    try { host = new URL(currentUrl).hostname.toLowerCase(); } catch {}
    if (!isGoogleRedirectHost(host)) return false;

    const continueSelectors = [
      'a:has-text("Przejdź do witryny")',
      'a:has-text("Przejdź mimo to")',
      'a:has-text("Kontynuuj")',
      'button:has-text("Kontynuuj")',
      'a:has-text("Continue")',
      'a:has-text("Proceed")',
      '#proceed-link',
      'a[id*="proceed"]',
    ];

    for (const selector of continueSelectors) {
      const locator = page.locator(selector).first();
      if ((await locator.count().catch(() => 0)) === 0) continue;
      const visible = await locator.isVisible().catch(() => false);
      if (!visible) continue;
      const href = await locator.getAttribute('href').catch(() => null);
      log('amazon.scan.google_interstitial_dismissed', { currentUrl, selector, targetHref: href });
      await locator.click({ timeout: 5000 }).catch(() => undefined);
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => undefined);
      await wait(500);
      return true;
    }

    // Fallback: extract destination from current URL and navigate directly
    try {
      const parsed = new URL(currentUrl);
      const destUrl = parsed.searchParams.get('q') || parsed.searchParams.get('url');
      if (destUrl && destUrl.startsWith('http')) {
        log('amazon.scan.google_interstitial_direct_navigate', { currentUrl, destUrl });
        await page.goto(destUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await wait(500);
        return true;
      }
    } catch {}

    return false;
  };

  const openAmazonCandidatePage = async ({
    candidateUrl,
    matchedImageId,
    amazonCandidateAttempt,
    candidateRank = null,
  }) => {
    const resolvedCandidateUrl = resolveDirectCandidateUrl(candidateUrl);
    upsertScanStep({
      key: 'amazon_open',
      label: 'Open Amazon candidate',
      attempt: amazonCandidateAttempt,
      candidateId: toText(matchedImageId),
      candidateRank,
      status: 'running',
      resultCode: 'candidate_open_start',
      message: 'Opening Amazon candidate page.',
      url: resolvedCandidateUrl,
      details: [
        { label: 'Candidate URL', value: candidateUrl },
        ...(resolvedCandidateUrl !== candidateUrl ? [{ label: 'Resolved URL', value: resolvedCandidateUrl }] : []),
      ],
    });

    try {
      await page.goto(resolvedCandidateUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await dismissGoogleRedirectInterstitialIfPresent();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      upsertScanStep({
        key: 'amazon_open',
        label: 'Open Amazon candidate',
        attempt: amazonCandidateAttempt,
        candidateId: toText(matchedImageId),
        candidateRank,
        status: 'failed',
        resultCode: 'candidate_open_failed',
        message: 'Failed to open Amazon candidate page: ' + message,
        url: candidateUrl,
        details: [
          { label: 'Candidate URL', value: candidateUrl },
          { label: 'Error', value: message },
        ],
      });
      return buildAmazonPhaseResult({
        success: false,
        message: 'Failed to open Amazon candidate page: ' + message,
        currentUrl: candidateUrl,
        stage: 'amazon_open_failed',
      });
    }

    upsertScanStep({
      key: 'amazon_open',
      label: 'Open Amazon candidate',
      attempt: amazonCandidateAttempt,
      candidateId: toText(matchedImageId),
      candidateRank,
      status: 'completed',
      resultCode: 'candidate_opened',
      message: 'Amazon candidate page opened.',
      url: page.url(),
      details: [
        { label: 'Candidate URL', value: candidateUrl },
        { label: 'Opened URL', value: page.url() },
      ],
    });
    await emitProgress({
      stage: 'amazon_open',
      message: 'Amazon candidate page opened.',
    });

    return buildAmazonPhaseResult({
      success: true,
      currentUrl: page.url(),
      stage: 'amazon_open',
    });
  };

  const clearAmazonCandidateOverlays = async ({
    matchedImageId,
    amazonCandidateAttempt,
    candidateRank = null,
  }) => {
    upsertScanStep({
      key: 'amazon_overlays',
      label: 'Dismiss Amazon overlays',
      attempt: amazonCandidateAttempt,
      candidateId: toText(matchedImageId),
      candidateRank,
      status: 'running',
      resultCode: 'overlay_clear_start',
      message: 'Checking Amazon cookie and delivery overlays.',
      url: page.url(),
    });

    const firstPass = await dismissAmazonOverlaysIfPresent();
    if (!firstPass.cleared) {
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);
    }
    const secondPass = firstPass.cleared ? firstPass : await dismissAmazonOverlaysIfPresent();
    const overlayState = secondPass.cleared ? secondPass : await dismissAmazonOverlaysIfPresent();

    if (overlayState.blocked) {
      upsertScanStep({
        key: 'amazon_overlays',
        label: 'Dismiss Amazon overlays',
        attempt: amazonCandidateAttempt,
        candidateId: toText(matchedImageId),
        candidateRank,
        status: 'failed',
        resultCode: 'overlay_blocked',
        message: overlayState.message || 'Amazon page remained blocked by overlays.',
        url: page.url(),
      });
      return buildAmazonPhaseResult({
        success: false,
        message: overlayState.message || 'Amazon page remained blocked by overlays.',
        currentUrl: page.url(),
        stage: 'amazon_overlay_blocked',
      });
    }

    upsertScanStep({
      key: 'amazon_overlays',
      label: 'Dismiss Amazon overlays',
      attempt: amazonCandidateAttempt,
      candidateId: toText(matchedImageId),
      candidateRank,
      status: 'completed',
      resultCode: 'overlay_cleared',
      message: 'Amazon cookie and delivery overlays cleared.',
      url: page.url(),
    });
    await emitProgress({
      stage: 'amazon_overlays',
      message: 'Amazon cookie and delivery overlays cleared.',
    });

    return buildAmazonPhaseResult({
      success: true,
      currentUrl: page.url(),
      stage: 'amazon_overlays',
    });
  };

  const ensureAmazonCandidateContentReady = async ({
    matchedImageId,
    amazonCandidateAttempt,
    candidateRank = null,
  }) => {
    upsertScanStep({
      key: 'amazon_content_ready',
      label: 'Wait for Amazon product content',
      attempt: amazonCandidateAttempt,
      candidateId: toText(matchedImageId),
      candidateRank,
      status: 'running',
      resultCode: 'content_wait_start',
      message: 'Waiting for Amazon product content to become visible.',
      url: page.url(),
    });
    const productContentReady = await waitForAmazonProductContent();
    if (!productContentReady) {
      upsertScanStep({
        key: 'amazon_content_ready',
        label: 'Wait for Amazon product content',
        attempt: amazonCandidateAttempt,
        candidateId: toText(matchedImageId),
        candidateRank,
        status: 'failed',
        resultCode: 'content_unavailable',
        message: 'Amazon product content did not become available after overlays were cleared.',
        url: page.url(),
      });
      return buildAmazonPhaseResult({
        success: false,
        message: 'Amazon product content did not become available after overlays were cleared.',
        currentUrl: page.url(),
        stage: 'amazon_content_unavailable',
      });
    }

    upsertScanStep({
      key: 'amazon_content_ready',
      label: 'Wait for Amazon product content',
      attempt: amazonCandidateAttempt,
      candidateId: toText(matchedImageId),
      candidateRank,
      status: 'completed',
      resultCode: 'content_ready',
      message: 'Amazon product content became visible.',
      url: page.url(),
    });
    await emitProgress({
      stage: 'amazon_content_ready',
      message: 'Amazon product content became visible.',
    });

    return buildAmazonPhaseResult({
      success: true,
      currentUrl: page.url(),
      stage: 'amazon_content_ready',
    });
  };

  const extractAmazonProductFromPage = async ({
    candidateUrl,
    matchedImageId,
    amazonCandidateAttempt,
    candidateRank = null,
    amazonProbe = null,
  }) => {
    upsertScanStep({
      key: 'amazon_extract',
      label: 'Extract Amazon details',
      attempt: amazonCandidateAttempt,
      candidateId: toText(matchedImageId),
      candidateRank,
      status: 'running',
      resultCode: 'extract_start',
      message: 'Extracting ASIN, title, price, URL, and description.',
      url: page.url(),
    });

    try {
      const currentUrl = page.url();
      const canonicalHref = toText(
        await page.locator('link[rel="canonical"]').first().getAttribute('href').catch(() => null)
      );
      const canonicalUrl = toAbsoluteUrl(canonicalHref, currentUrl) || currentUrl;
      const pageLanguage = toText(
        await page.evaluate(() => document.documentElement?.lang || null).catch(() => null)
      );
      const marketplaceDomain = (() => {
        try {
          return new URL(canonicalUrl || currentUrl).hostname.toLowerCase();
        } catch {
          return null;
        }
      })();
      const asin =
        extractAsin(currentUrl) ||
        extractAsin(canonicalUrl) ||
        extractAsin(await page.locator('[data-asin]').first().getAttribute('data-asin').catch(() => null)) ||
        extractAsin(await page.locator('input[name="ASIN"]').first().inputValue().catch(() => null));

      const title =
        (await readFirstText(['#productTitle', 'h1.a-size-large', 'h1#title'])) ||
        toText(await getMetaContent('meta[property="og:title"]'));
      const price =
        (await readFirstText([
          '.priceToPay .a-offscreen',
          '#corePrice_feature_div .a-offscreen',
          '#tp_price_block_total_price_ww .a-offscreen',
          '#priceblock_ourprice',
          '#priceblock_dealprice',
        ])) || null;
      const description =
        (await readFirstText([
          '#feature-bullets',
          '#productDescription',
          '#bookDescription_feature_div',
        ])) || toText(await getMetaContent('meta[name="description"]'));
      const amazonDetails = await buildAmazonDetails();

      upsertScanStep({
        key: 'amazon_extract',
        label: 'Extract Amazon details',
        attempt: amazonCandidateAttempt,
        candidateId: toText(matchedImageId),
        candidateRank,
        status: asin ? 'completed' : 'failed',
        resultCode: asin ? 'match_found' : 'asin_missing',
        message: asin
          ? 'Extracted Amazon ASIN ' + asin + '.'
          : 'Amazon page opened but ASIN could not be extracted.',
        url: currentUrl,
        details: [
          { label: 'ASIN', value: asin },
          { label: 'Title', value: title },
          { label: 'Price', value: price },
          { label: 'Canonical URL', value: canonicalUrl },
          {
            label: 'Attribute count',
            value:
              amazonDetails && Array.isArray(amazonDetails.attributes)
                ? String(amazonDetails.attributes.length)
                : null,
          },
          {
            label: 'Bullet count',
            value:
              amazonDetails && Array.isArray(amazonDetails.bulletPoints)
                ? String(amazonDetails.bulletPoints.length)
                : null,
          },
        ],
      });

      return buildAmazonCandidateOutcome({
        status: asin ? 'matched' : 'no_match',
        asin,
        title,
        price,
        url: canonicalUrl || toAbsoluteUrl(currentUrl, candidateUrl) || currentUrl,
        description,
        amazonDetails,
        amazonProbe,
        matchedImageId: toText(matchedImageId),
        currentUrl,
        message: asin ? null : 'Amazon page opened but ASIN could not be extracted.',
        stage: 'amazon_extract',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      upsertScanStep({
        key: 'amazon_extract',
        label: 'Extract Amazon details',
        attempt: amazonCandidateAttempt,
        candidateId: toText(matchedImageId),
        candidateRank,
        status: 'failed',
        resultCode: 'extract_failed',
        message: 'Amazon product extraction failed: ' + message,
        url: page.url(),
        details: [{ label: 'Error', value: message }],
      });
      return buildAmazonCandidateOutcome({
        status: 'failed',
        amazonProbe,
        matchedImageId: toText(matchedImageId),
        currentUrl: page.url(),
        url: page.url(),
        message: 'Amazon product extraction failed: ' + message,
        stage: 'amazon_extract',
      });
    }
  };

  const probeAmazonProductPage = async ({
    candidateUrl,
    matchedImageId,
    amazonCandidateAttempt,
    candidateRank = null,
  }) => {
    upsertScanStep({
      key: 'amazon_probe',
      label: 'Probe Amazon product page',
      attempt: amazonCandidateAttempt,
      candidateId: toText(matchedImageId),
      candidateRank,
      status: 'running',
      resultCode: 'probe_start',
      message: 'Collecting candidate page evidence before detailed extraction.',
      url: page.url(),
    });

    try {
      const currentUrl = page.url();
      const artifactCandidateFragment =
        toText(matchedImageId)
          ?.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 80) || 'candidate';
      const artifactKey = [
        'amazon-scan-probe',
        artifactCandidateFragment,
        'attempt-' + String(resolveComparableAttempt(amazonCandidateAttempt)),
        typeof candidateRank === 'number' && Number.isFinite(candidateRank) && candidateRank > 0
          ? 'rank-' + String(Math.trunc(candidateRank))
          : null,
      ]
        .filter(Boolean)
        .join('-');
      const canonicalHref = toText(
        await page.locator('link[rel="canonical"]').first().getAttribute('href').catch(() => null)
      );
      const canonicalUrl = toAbsoluteUrl(canonicalHref, currentUrl) || currentUrl;
      const asin =
        extractAsin(currentUrl) ||
        extractAsin(canonicalUrl) ||
        extractAsin(await page.locator('[data-asin]').first().getAttribute('data-asin').catch(() => null)) ||
        extractAsin(await page.locator('input[name="ASIN"]').first().inputValue().catch(() => null));
      const pageTitle =
        (await readFirstText(['#productTitle', 'h1.a-size-large', 'h1#title'])) ||
        toText(await getMetaContent('meta[property="og:title"]'));
      const descriptionSnippet =
        (await readFirstText([
          '#feature-bullets',
          '#productDescription',
          '#bookDescription_feature_div',
        ])) || toText(await getMetaContent('meta[name="description"]'));
      const heroImageSelectors = [
        '#landingImage',
        '#imgTagWrapperId img',
        '#main-image-container img',
        '#ebooksImgBlkFront',
        '#imgBlkFront',
      ];
      let heroImageUrl = null;
      let heroImageAlt = null;
      let heroImageArtifactName = null;
      for (const selector of heroImageSelectors) {
        const locator = page.locator(selector).first();
        const nextUrl = toText(await locator.getAttribute('src').catch(() => null));
        const nextAlt = toText(await locator.getAttribute('alt').catch(() => null));
        if (nextUrl || nextAlt) {
          heroImageUrl = nextUrl;
          heroImageAlt = nextAlt;
          const heroArtifactKey = artifactKey + '-hero';
          const heroArtifactPath = await locator
            .screenshot()
            .then((value) =>
              artifacts.file(heroArtifactKey, value, {
                extension: 'png',
                mimeType: 'image/png',
                kind: 'screenshot',
              })
            )
            .catch(() => null);
          heroImageArtifactName = toText(heroArtifactPath?.split('/').pop());
          break;
        }
      }
      const bulletPoints = (await readAmazonBulletPoints()).slice(0, 8);
      const bulletCount = bulletPoints.length;
      const attributeCount = (await readAmazonAttributePairs()).length;
      await artifacts.screenshot(artifactKey).catch(() => undefined);
      await artifacts.html(artifactKey).catch(() => undefined);
      const amazonProbe = {
        asin,
        pageTitle,
        descriptionSnippet,
        pageLanguage,
        pageLanguageSource: pageLanguage ? 'html_lang' : marketplaceDomain ? 'marketplace_domain' : null,
        marketplaceDomain,
        candidateUrl: toText(candidateUrl),
        canonicalUrl,
        heroImageUrl,
        heroImageAlt,
        heroImageArtifactName,
        artifactKey,
        bulletPoints,
        bulletCount,
        attributeCount,
      };

      upsertScanStep({
        key: 'amazon_probe',
        label: 'Probe Amazon product page',
        attempt: amazonCandidateAttempt,
        candidateId: toText(matchedImageId),
        candidateRank,
        status: 'completed',
        resultCode: 'probe_ready',
        message: 'Collected Amazon candidate page evidence before extraction.',
        url: currentUrl,
        details: [
          { label: 'ASIN', value: asin },
          { label: 'Title', value: pageTitle },
          { label: 'Description', value: descriptionSnippet },
          { label: 'Page language', value: pageLanguage },
          {
            label: 'Language source',
            value: pageLanguage ? 'html_lang' : marketplaceDomain ? 'marketplace_domain' : null,
          },
          { label: 'Marketplace domain', value: marketplaceDomain },
          { label: 'Canonical URL', value: canonicalUrl },
          { label: 'Hero image URL', value: heroImageUrl },
          { label: 'Hero image artifact', value: heroImageArtifactName },
          { label: 'Artifact key', value: artifactKey },
          { label: 'Bullet count', value: String(bulletCount) },
          { label: 'Attribute count', value: String(attributeCount) },
        ],
      });

      return {
        success: true,
        amazonProbe,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      upsertScanStep({
        key: 'amazon_probe',
        label: 'Probe Amazon product page',
        attempt: amazonCandidateAttempt,
        candidateId: toText(matchedImageId),
        candidateRank,
        status: 'failed',
        resultCode: 'probe_failed',
        message: 'Failed to collect Amazon candidate evidence: ' + message,
        url: page.url(),
        details: [{ label: 'Error', value: message }],
      });
      return {
        success: false,
        amazonProbe: null,
      };
    }
  };

  const extractAmazonPageData = async (
    candidateUrl,
    matchedImageId,
    amazonCandidateAttempt,
    candidateRank = null
  ) => {
    const openResult = await openAmazonCandidatePage({
      candidateUrl,
      matchedImageId,
      amazonCandidateAttempt,
      candidateRank,
    });
    if (!openResult.success) {
      return buildAmazonCandidateOutcome({
        status: 'failed',
        matchedImageId: toText(matchedImageId),
        currentUrl: openResult.currentUrl,
        url: candidateUrl,
        message: openResult.message,
        stage: openResult.stage,
      });
    }

    const overlayResult = await clearAmazonCandidateOverlays({
      matchedImageId,
      amazonCandidateAttempt,
      candidateRank,
    });
    if (!overlayResult.success) {
      return buildAmazonCandidateOutcome({
        status: 'failed',
        matchedImageId: toText(matchedImageId),
        currentUrl: overlayResult.currentUrl,
        url: page.url(),
        message: overlayResult.message,
        stage: overlayResult.stage,
      });
    }

    const contentReadyResult = await ensureAmazonCandidateContentReady({
      matchedImageId,
      amazonCandidateAttempt,
      candidateRank,
    });
    if (!contentReadyResult.success) {
      return buildAmazonCandidateOutcome({
        status: 'failed',
        matchedImageId: toText(matchedImageId),
        currentUrl: contentReadyResult.currentUrl,
        url: page.url(),
        message: contentReadyResult.message,
        stage: contentReadyResult.stage,
      });
    }

    const skipAmazonProbe = input?.skipAmazonProbe === true;
    let probeResult = {
      success: true,
      amazonProbe: null,
    };

    if (skipAmazonProbe) {
      upsertScanStep({
        key: 'amazon_probe',
        label: 'Probe Amazon product page',
        attempt: amazonCandidateAttempt,
        candidateId: toText(matchedImageId),
        candidateRank,
        status: 'skipped',
        resultCode: 'probe_reused',
        message: 'Reused earlier Amazon probe evidence for approved direct extraction.',
        url: page.url(),
      });
    } else {
      probeResult = await probeAmazonProductPage({
        candidateUrl,
        matchedImageId,
        amazonCandidateAttempt,
        candidateRank,
      });
    }

    if (input?.probeOnlyOnAmazonMatch === true) {
      return buildAmazonCandidateOutcome({
        status: 'probe_ready',
        asin: probeResult.amazonProbe?.asin ?? null,
        title: probeResult.amazonProbe?.pageTitle ?? null,
        price: null,
        url:
          probeResult.amazonProbe?.canonicalUrl ||
          probeResult.amazonProbe?.candidateUrl ||
          page.url(),
        description: probeResult.amazonProbe?.descriptionSnippet ?? null,
        amazonDetails: null,
        amazonProbe: probeResult.amazonProbe,
        matchedImageId: toText(matchedImageId),
        currentUrl: page.url(),
        message: 'Collected Amazon candidate evidence for AI evaluation.',
        stage: 'amazon_probe',
      });
    }

    return await extractAmazonProductFromPage({
      candidateUrl,
      matchedImageId,
      amazonCandidateAttempt,
      candidateRank,
      amazonProbe: probeResult.amazonProbe,
    });
  };

  try {
    const batchIndex =
      typeof input?.batchIndex === 'number' && Number.isFinite(input.batchIndex) && input.batchIndex > 0
        ? Math.trunc(input.batchIndex)
        : 0;
    const directAmazonCandidateUrl = toText(input?.directAmazonCandidateUrl);
    const directAmazonCandidateUrls = Array.isArray(input?.directAmazonCandidateUrls)
      ? input.directAmazonCandidateUrls.map((value) => toText(value)).filter(Boolean)
      : [];
    const directMatchedImageId = toText(input?.directMatchedImageId);
    const directAmazonCandidateRank =
      typeof input?.directAmazonCandidateRank === 'number' &&
      Number.isFinite(input.directAmazonCandidateRank) &&
      input.directAmazonCandidateRank > 0
        ? Math.trunc(input.directAmazonCandidateRank)
        : 1;
    if (batchIndex > 0) {
      await emitProgress({
        stage: 'validate',
        message: 'Waiting ' + String(batchIndex * 5) + 's to stagger batch reverse image scans.',
      });
      await wait(batchIndex * 5000);
    }

    upsertScanStep({
      key: 'validate',
      label: 'Validate scan input',
      status: 'running',
      resultCode: 'validate_start',
      message: 'Validating scan request.',
      url: page.url(),
    });
    if (imageCandidates.length === 0) {
      upsertScanStep({
        key: 'validate',
        label: 'Validate scan input',
        status: 'failed',
        resultCode: 'no_input_candidates',
        message: 'No product image candidates were provided.',
        url: page.url(),
      });
      await emitResult({
        status: 'failed',
        message: 'No product image candidates were provided.',
        stage: 'validate',
        currentUrl: page.url(),
      });
      return;
    }
    upsertScanStep({
      key: 'validate',
      label: 'Validate scan input',
      status: 'completed',
      resultCode: 'input_validated',
      message:
        'Validated ' +
        imageCandidates.length +
        ' product image candidate' +
        (imageCandidates.length === 1 ? '' : 's') +
        '.',
      url: page.url(),
    });
    await emitProgress({
      stage: 'validate',
      message:
        'Validated ' +
        imageCandidates.length +
        ' product image candidate' +
        (imageCandidates.length === 1 ? '' : 's') +
        '.',
    });

    if (directAmazonCandidateUrl) {
      const extracted = await extractAmazonPageData(
        directAmazonCandidateUrl,
        directMatchedImageId,
        1,
        directAmazonCandidateRank
      );
      const directCandidateUrls =
        directAmazonCandidateUrls.length > 0
          ? directAmazonCandidateUrls
          : [directAmazonCandidateUrl].filter(Boolean);

      if (extracted.status === 'matched') {
        await artifacts.screenshot('amazon-scan-match').catch(() => undefined);
        await artifacts.html('amazon-scan-match').catch(() => undefined);
        await emitResult({
          ...extracted,
          candidateUrls: directCandidateUrls,
        });
        return;
      }

      if (extracted.status === 'probe_ready') {
        await emitResult({
          ...extracted,
          candidateUrls: directCandidateUrls,
        });
        return;
      }

      if (extracted.status === 'no_match') {
        await artifacts.screenshot('amazon-scan-no-match').catch(() => undefined);
        await artifacts.html('amazon-scan-no-match').catch(() => undefined);
        await emitResult({
          ...extracted,
          candidateUrls: directCandidateUrls,
        });
        return;
      }

      await artifacts.screenshot('amazon-scan-error').catch(() => undefined);
      await artifacts.html('amazon-scan-error').catch(() => undefined);
      await emitResult({
        ...extracted,
        candidateUrls: directCandidateUrls,
      });
      return;
    }

    let attemptedAmazonCandidateCount = 0;
    let openedAmazonCandidateCount = 0;
    let lastAmazonCandidateError = null;
    let uploadedCandidateCount = 0;
    let lastUploadError = null;
    let bestMatchedResult = null;
    let bestMatchedCandidateUrls = [];
    let bestNoMatchResult = null;
    let bestNoMatchCandidateUrls = [];
    let googleCaptchaEncountered = false;

    for (const candidate of imageCandidates) {
      const candidateId = toText(candidate?.id);
      log('amazon.scan.image_candidate', { candidateId, filepath: candidate?.filepath, url: candidate?.url });

      const candidateAttempt = uploadedCandidateCount + 1;
      const uploadResult = await uploadImageCandidate(candidate, candidateAttempt).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        return {
          submitted: false,
          advanced: false,
          captchaRequired: false,
          error: message,
          retryRecommended: false,
          inputSourceUsed: null,
          failureCode: 'unexpected_upload_error',
          transitionReason: null,
        };
      });
      googleCaptchaEncountered =
        googleCaptchaEncountered || uploadResult.captchaEncountered === true;

      if (!uploadResult.submitted) {
        if (uploadResult.captchaRequired) {
          return;
        }
        if (googleCaptchaEncountered) {
          await artifacts.screenshot('amazon-scan-error').catch(() => undefined);
          await artifacts.html('amazon-scan-error').catch(() => undefined);
          await emitResult({
            status: 'failed',
            asin: null,
            title: null,
            price: null,
            url: null,
            description: null,
            matchedImageId: candidateId,
            currentUrl: page.url(),
            message:
              uploadResult.error ||
              'Google captcha interrupted the Amazon scan before the image upload could complete.',
            stage: 'google_captcha',
          });
          return;
        }
        if (uploadResult.failureCode === 'captcha_timeout') {
          await artifacts.screenshot('amazon-scan-error').catch(() => undefined);
          await artifacts.html('amazon-scan-error').catch(() => undefined);
          await emitResult({
            status: 'failed',
            asin: null,
            title: null,
            price: null,
            url: null,
            description: null,
            matchedImageId: candidateId,
            currentUrl: page.url(),
            message: uploadResult.error,
            stage: 'google_captcha',
          });
          return;
        }
        lastUploadError = uploadResult.error;
        log('amazon.scan.image_candidate_failed', {
          candidateId,
          filepath: candidate?.filepath,
          url: candidate?.url,
          error: uploadResult.error,
        });
        continue;
      }
      uploadedCandidateCount += 1;

      const amazonCandidateResult = await collectAmazonCandidates({
        attempt: candidateAttempt,
        candidateId,
        inputSource: uploadResult.inputSourceUsed ?? null,
      });
      googleCaptchaEncountered =
        googleCaptchaEncountered || amazonCandidateResult.captchaEncountered === true;
      const candidateCaptchaEncountered =
        googleCaptchaEncountered ||
        uploadResult.captchaEncountered === true ||
        amazonCandidateResult.captchaEncountered === true;
      if (amazonCandidateResult.captchaRequired) {
        return;
      }
      if (candidateCaptchaEncountered && amazonCandidateResult.candidates.length === 0) {
        await artifacts.screenshot('amazon-scan-error').catch(() => undefined);
        await artifacts.html('amazon-scan-error').catch(() => undefined);
        await emitResult({
          status: 'failed',
          asin: null,
          title: null,
          price: null,
          url: null,
          description: null,
          matchedImageId: candidateId,
          currentUrl: page.url(),
          message:
            amazonCandidateResult.error ||
            'Google captcha interrupted candidate collection before Amazon results became available.',
          stage: 'google_captcha',
        });
        return;
      }
      if (amazonCandidateResult.failureCode === 'captcha_timeout') {
        await artifacts.screenshot('amazon-scan-error').catch(() => undefined);
        await artifacts.html('amazon-scan-error').catch(() => undefined);
        await emitResult({
          status: 'failed',
          asin: null,
          title: null,
          price: null,
          url: null,
          description: null,
          matchedImageId: candidateId,
          currentUrl: page.url(),
          message: amazonCandidateResult.error,
          stage: 'google_captcha',
        });
        return;
      }
      const amazonCandidates = amazonCandidateResult.candidates;
      log('amazon.scan.google_candidates', { candidateId, candidateCount: amazonCandidates.length });

      if (amazonCandidates.length === 0) {
        continue;
      }

      for (const [candidateRankIndex, amazonCandidateUrl] of amazonCandidates.slice(0, 3).entries()) {
        const amazonCandidateAttempt = attemptedAmazonCandidateCount + 1;
        attemptedAmazonCandidateCount += 1;
        const extracted = await extractAmazonPageData(
          amazonCandidateUrl,
          candidateId,
          amazonCandidateAttempt,
          candidateRankIndex + 1
        ).catch((error) =>
          buildAmazonCandidateOutcome({
            status: 'failed',
            matchedImageId: candidateId,
            currentUrl: page.url(),
            url: amazonCandidateUrl,
            message: error instanceof Error ? error.message : String(error),
            stage: 'amazon_extract',
          })
        );
        if (extracted.stage !== 'amazon_open_failed') {
          openedAmazonCandidateCount += 1;
        }

        if (extracted.status === 'matched') {
          if (isStrongAmazonMatch(extracted)) {
            await emitResult({
              ...extracted,
              candidateUrls: amazonCandidates,
            });
            return;
          }

          if (
            !bestMatchedResult ||
            scoreAmazonMatchResult(extracted) > scoreAmazonMatchResult(bestMatchedResult)
          ) {
            bestMatchedResult = extracted;
            bestMatchedCandidateUrls = amazonCandidates;
          }
          continue;
        }

        if (extracted.status === 'failed') {
          lastAmazonCandidateError = extracted.message;
          if (extracted.stage === 'amazon_overlay_blocked') {
            log('amazon.scan.amazon_overlay_blocked', {
              candidateId,
              amazonCandidateUrl,
              error: extracted.message,
            });
          } else {
            log('amazon.scan.amazon_candidate_failed', {
              candidateId,
              amazonCandidateUrl,
              stage: extracted.stage,
              error: extracted.message,
            });
          }
          continue;
        }

        if (
          !bestNoMatchResult ||
          scoreAmazonPageData(extracted) > scoreAmazonPageData(bestNoMatchResult)
        ) {
          bestNoMatchResult = extracted;
          bestNoMatchCandidateUrls = amazonCandidates;
        }
      }
    }

    if (bestMatchedResult) {
      await artifacts.screenshot('amazon-scan-match').catch(() => undefined);
      await artifacts.html('amazon-scan-match').catch(() => undefined);
      await emitResult({
        ...bestMatchedResult,
        candidateUrls: bestMatchedCandidateUrls,
      });
      return;
    }

    if (bestNoMatchResult) {
      await artifacts.screenshot('amazon-scan-no-match').catch(() => undefined);
      await artifacts.html('amazon-scan-no-match').catch(() => undefined);
      await emitResult({
        ...bestNoMatchResult,
        candidateUrls: bestNoMatchCandidateUrls,
      });
      return;
    }

    if (uploadedCandidateCount === 0 && lastUploadError) {
      await artifacts.screenshot('amazon-scan-error').catch(() => undefined);
      await artifacts.html('amazon-scan-error').catch(() => undefined);
      await emitResult({
        status: 'failed',
        asin: null,
        title: null,
        price: null,
        url: null,
        description: null,
        matchedImageId: null,
        currentUrl: page.url(),
        message: lastUploadError,
        stage: 'google_upload',
      });
      return;
    }

    if (
      attemptedAmazonCandidateCount > 0 &&
      openedAmazonCandidateCount === 0 &&
      lastAmazonCandidateError
    ) {
      await artifacts.screenshot('amazon-scan-error').catch(() => undefined);
      await artifacts.html('amazon-scan-error').catch(() => undefined);
      await emitResult({
        status: 'failed',
        asin: null,
        title: null,
        price: null,
        url: null,
        description: null,
        matchedImageId: null,
        currentUrl: page.url(),
        message: lastAmazonCandidateError,
        stage: 'amazon_extract',
      });
      return;
    }

    await artifacts.screenshot('amazon-scan-no-match').catch(() => undefined);
    await artifacts.html('amazon-scan-no-match').catch(() => undefined);
    await emitResult({
      status: 'no_match',
      asin: null,
      title: null,
      price: null,
      url: null,
      description: null,
      matchedImageId: null,
      currentUrl: page.url(),
      message: 'Google reverse image search did not return a usable Amazon result.',
      stage: 'google_candidates',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('amazon.scan.failed', { error: message, currentUrl: page.url() });
    await artifacts.screenshot('amazon-scan-error').catch(() => undefined);
    await artifacts.html('amazon-scan-error').catch(() => undefined);
    await emitResult({
      status: 'failed',
      asin: null,
      title: null,
      price: null,
      url: null,
      description: null,
      matchedImageId: null,
      currentUrl: page.url(),
      message,
      stage: 'failed',
    });
  }
}`;
