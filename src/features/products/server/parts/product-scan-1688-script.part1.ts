export const SCAN_1688_REVERSE_IMAGE_SCRIPT_PART_1 = String.raw`export default async function run({
  page,
  input,
  emit,
  log,
  artifacts,
  helpers,
}) {
  const imageCandidates = Array.isArray(input?.imageCandidates) ? input.imageCandidates : [];
  const directCandidateUrls = Array.isArray(input?.directSupplierCandidateUrls)
    ? input.directSupplierCandidateUrls
    : [];
  const directCandidateUrl =
    typeof input?.directSupplierCandidateUrl === 'string'
      ? input.directSupplierCandidateUrl.trim()
      : '';
  const directMatchedImageId =
    typeof input?.directMatchedImageId === 'string'
      ? input.directMatchedImageId.trim()
      : '';
  const directCandidateRank =
    typeof input?.directSupplierCandidateRank === 'number' &&
    Number.isFinite(input.directSupplierCandidateRank) &&
    input.directSupplierCandidateRank > 0
      ? Math.trunc(input.directSupplierCandidateRank)
      : null;
  const productName =
    typeof input?.productName === 'string' ? input.productName.trim() : '';
  const configuredCandidateResultLimit =
    typeof input?.candidateResultLimit === 'number' &&
    Number.isFinite(input.candidateResultLimit) &&
    input.candidateResultLimit > 0
      ? Math.min(20, Math.max(1, Math.trunc(input.candidateResultLimit)))
      : 8;
  const configuredMinimumCandidateScore =
    typeof input?.minimumCandidateScore === 'number' &&
    Number.isFinite(input.minimumCandidateScore) &&
    input.minimumCandidateScore > 0
      ? Math.min(20, Math.max(1, Math.trunc(input.minimumCandidateScore)))
      : 4;
  const configuredMaxExtractedImages =
    typeof input?.maxExtractedImages === 'number' &&
    Number.isFinite(input.maxExtractedImages) &&
    input.maxExtractedImages > 0
      ? Math.min(20, Math.max(1, Math.trunc(input.maxExtractedImages)))
      : 12;
  const allowUrlImageSearchFallback = input?.allowUrlImageSearchFallback !== false;
  const scanSteps = [];
  const nowIso = () => new Date().toISOString();
  const wait = async (ms) => {
    if (helpers && typeof helpers.sleep === 'function') {
      await helpers.sleep(ms);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, ms));
  };
  const toText = (value) => {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };
  const toAbsoluteUrl = (value, baseUrl) => {
    const href = toText(value);
    if (!href) {
      return null;
    }
    try {
      return new URL(href, baseUrl || page.url()).toString();
    } catch {
      return href;
    }
  };
  const resolveComparableAttempt = (attempt) =>
    typeof attempt === 'number' && Number.isFinite(attempt) && attempt > 0
      ? Math.trunc(attempt)
      : 1;
  const resolveStepGroup = (key) => {
    const normalizedKey = toText(key);
    if (!normalizedKey) {
      return null;
    }
    if (
      normalizedKey === 'validate' ||
      normalizedKey === 'prepare_scan' ||
      normalizedKey === 'queue_scan'
    ) {
      return 'input';
    }
    if (normalizedKey.startsWith('1688_') || normalizedKey.startsWith('supplier_')) {
      return 'supplier';
    }
    return null;
  };
  const normalizeStepDetails = (details) =>
    (Array.isArray(details) ? details : [])
      .map((entry) => {
        const label = toText(entry?.label);
        const value = toText(entry?.value);
        if (!label) {
          return null;
        }
        return {
          label,
          value,
        };
      })
      .filter(Boolean)
      .slice(0, 12);
  const mergeStepDetails = (...detailSets) =>
    detailSets.flatMap((details) => normalizeStepDetails(details));
  const resolveStepIdentity = (key, attempt, inputSource) =>
    String(toText(key) || '') +
    '::' +
    String(resolveComparableAttempt(attempt)) +
    '::' +
    String(toText(inputSource) || 'none');
  const upsertScanStep = (input) => {
    const key = toText(input?.key);
    const label = toText(input?.label);
    const status = toText(input?.status);
    if (!key || !label || !status) {
      return null;
    }

    const normalizedStatus =
      status === 'pending' ||
      status === 'running' ||
      status === 'completed' ||
      status === 'failed' ||
      status === 'skipped'
        ? status
        : null;
    if (!normalizedStatus) {
      return null;
    }

    const timestamp = nowIso();
    const stepUrl = toText(input?.url) || toText(page.url());
    const stepMessage = toText(input?.message);
    const stepAttempt = resolveComparableAttempt(input?.attempt);
    const normalizedInputSource = toText(input?.inputSource);
    const existingIndex = scanSteps.findIndex(
      (entry) =>
        resolveStepIdentity(entry.key, entry.attempt, entry.inputSource) ===
        resolveStepIdentity(key, stepAttempt, normalizedInputSource)
    );
    const existingStep =
      existingIndex >= 0
        ? scanSteps[existingIndex]
        : {
            key,
            label,
            group: resolveStepGroup(key),
            attempt: stepAttempt,
            candidateId: null,
            candidateRank: null,
            inputSource: null,
            retryOf: null,
            resultCode: null,
            status: 'pending',
            message: null,
            warning: null,
            details: [],
            url: null,
            startedAt: null,
            completedAt: null,
            durationMs: null,
          };

    const startedAt =
      normalizedStatus === 'pending'
        ? existingStep.startedAt
        : existingStep.startedAt || timestamp;
    const completedAt =
      normalizedStatus === 'completed' ||
      normalizedStatus === 'failed' ||
      normalizedStatus === 'skipped'
        ? timestamp
        : null;
    const durationMs =
      startedAt && completedAt
        ? Math.max(0, Date.parse(completedAt) - Date.parse(startedAt))
        : null;

    const nextStep = {
      ...existingStep,
      label,
      group: toText(input?.group) || existingStep.group || resolveStepGroup(key),
      attempt: stepAttempt,
      candidateId: toText(input?.candidateId) || existingStep.candidateId || null,
      candidateRank:
        typeof input?.candidateRank === 'number' &&
        Number.isFinite(input.candidateRank) &&
        input.candidateRank > 0
          ? Math.trunc(input.candidateRank)
          : existingStep.candidateRank || null,
      inputSource: normalizedInputSource || existingStep.inputSource || null,
      retryOf: toText(input?.retryOf) ?? existingStep.retryOf ?? null,
      resultCode: toText(input?.resultCode) ?? existingStep.resultCode ?? null,
      status: normalizedStatus,
      message: stepMessage ?? existingStep.message ?? null,
      warning: toText(input?.warning) ?? existingStep.warning ?? null,
      details:
        Array.isArray(input?.details) ? normalizeStepDetails(input.details) : existingStep.details || [],
      url: stepUrl ?? existingStep.url ?? null,
      startedAt,
      completedAt,
      durationMs,
    };

    if (existingIndex >= 0) {
      scanSteps[existingIndex] = nextStep;
    } else {
      scanSteps.push(nextStep);
    }

    return nextStep;
  };
  const emitResult = async (payload) => {
    const payloadWithSteps = {
      ...payload,
      steps: scanSteps.map((step) => ({ ...step })),
    };
    emit('result', payloadWithSteps);
    if (typeof artifacts?.json === 'function') {
      await artifacts.json('1688-scan-result', payloadWithSteps).catch(() => undefined);
    }
  };
  const emitProgress = async (input = {}) => {
    await emitResult({
      status: 'running',
      title: null,
      price: null,
      url: toText(input?.url) || page.url(),
      description: null,
      supplierDetails: null,
      supplierProbe: null,
      candidateUrls: [],
      matchedImageId: toText(input?.matchedImageId),
      currentUrl: toText(input?.currentUrl) || page.url(),
      message: toText(input?.message),
      stage: toText(input?.stage),
    });
  };
  const CANDIDATE_RESULT_LIMIT = configuredCandidateResultLimit;
  const FILE_INPUT_SELECTORS = [
    'input[type="file"]',
    'input[accept*="image"]',
  ];
  const IMAGE_SEARCH_ENTRY_SELECTORS = [
    'a:has-text("以图搜")',
    'button:has-text("以图搜")',
    'span:has-text("以图搜")',
    'div:has-text("以图搜")',
    'a:has-text("搜同款")',
    'button:has-text("搜同款")',
    '[aria-label*="image"]',
    '[title*="以图搜"]',
    '[title*="搜同款"]',
  ];
  const PRICE_TEXT_PATTERN = /(?:¥|￥)\s*\d+(?:\.\d+)?(?:\s*[-~至]\s*(?:¥|￥)?\s*\d+(?:\.\d+)?)?/;
  const normalize1688OfferUrl = (value) => {
    const href = toAbsoluteUrl(value, page.url());
    if (!href) {
      return null;
    }
    try {
      const parsed = new URL(href);
      const host = parsed.hostname.toLowerCase();
      const pathname = parsed.pathname.toLowerCase();
      if (!host.includes('1688.com')) {
        return null;
      }
      if (!/\/offer\/\d+\.html/.test(pathname)) {
        return null;
      }
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString();
    } catch {
      return null;
    }
  };
  const dedupeStrings = (values, limit = CANDIDATE_RESULT_LIMIT) => {
    const result = [];
    const seen = new Set();
    for (const value of Array.isArray(values) ? values : []) {
      const normalized = toText(value);
      if (!normalized) {
        continue;
      }
      if (seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      result.push(normalized);
      if (result.length >= limit) {
        break;
      }
    }
    return result;
  };
  const clickFirstVisible = async (selectors) => {
    for (const selector of Array.isArray(selectors) ? selectors : []) {
      const locator = page.locator(selector).first();
      if ((await locator.count().catch(() => 0)) === 0) {
        continue;
      }
      const visible = await locator.isVisible().catch(() => false);
      if (!visible) {
        continue;
      }
      await locator.click().catch(() => undefined);
      return true;
    }
    return false;
  };
  const findFirstVisibleFileInput = async () => {
    for (const selector of FILE_INPUT_SELECTORS) {
      const locator = page.locator(selector).first();
      if ((await locator.count().catch(() => 0)) === 0) {
        continue;
      }
      const visible = await locator.isVisible().catch(() => false);
      if (visible) {
        return locator;
      }
    }
    return null;
  };
  const detect1688AccessBarrier = async () => {
    const currentUrl = page.url();
    const normalizedUrl = currentUrl.toLowerCase();
    const bodyText = (
      toText(await page.locator('body').first().textContent().catch(() => null)) || ''
    ).toLowerCase();
    const blockingSelectors = [
      'input[type="password"]',
      'iframe[src*="captcha"]',
      '[id*="nc_"]',
      '[class*="captcha"]',
      '[class*="login"] input',
    ];
    for (const selector of blockingSelectors) {
      if ((await page.locator(selector).first().count().catch(() => 0)) > 0) {
        return {
          blocked: true,
          currentUrl,
          message: '1688 requested login or captcha verification before image search could continue.',
        };
      }
    }
    const textHints = [
      '请登录',
      '登录后',
      '扫码登录',
      '验证码',
      '滑动验证',
      '访问受限',
      '安全验证',
      'captcha',
    ];
    if (
      normalizedUrl.includes('login') ||
      normalizedUrl.includes('captcha') ||
      textHints.some((hint) => bodyText.includes(hint.toLowerCase()))
    ) {
      return {
        blocked: true,
        currentUrl,
        message: '1688 requested login or captcha verification before image search could continue.',
      };
    }
    return {
      blocked: false,
      currentUrl,
      message: null,
    };
  };
  const collect1688CandidateUrls = async (limit = CANDIDATE_RESULT_LIMIT) => {
    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((links) =>
        links
          .map((link) =>
            link instanceof HTMLAnchorElement ? link.href : link.getAttribute('href')
          )
          .filter(Boolean)
      )
      .catch(() => []);
    return dedupeStrings(
      hrefs
        .map((href) => normalize1688OfferUrl(href))
        .filter((href) => typeof href === 'string' && href.length > 0),
      limit
    );
  };
  const waitFor1688Candidates = async (startingUrl, timeoutMs = 20000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const candidateUrls = await collect1688CandidateUrls();
      if (candidateUrls.length > 0) {
        return {
          ready: true,
          candidateUrls,
          currentUrl: page.url(),
          blocked: false,
          message: null,
        };
      }
      const currentUrl = page.url();
      const normalizedCurrentUrl = normalize1688OfferUrl(currentUrl);
      if (normalizedCurrentUrl) {
        return {
          ready: true,
          candidateUrls: [normalizedCurrentUrl],
          currentUrl,
          blocked: false,
          message: null,
        };
      }
      const barrier = await detect1688AccessBarrier();
      if (barrier.blocked) {
        return {
          ready: false,
          candidateUrls: [],
          currentUrl: barrier.currentUrl,
          blocked: true,
          message: barrier.message,
        };
      }
      if (toText(currentUrl) && currentUrl !== startingUrl) {
        await wait(500);
      }
      await wait(800);
    }
    return {
      ready: false,
      candidateUrls: [],
      currentUrl: page.url(),
      blocked: false,
      message: '1688 image search did not produce supplier candidates before timeout.',
    };
  };
  const readFirstText = async (selectors) => {
    for (const selector of Array.isArray(selectors) ? selectors : []) {
      const locator = page.locator(selector).first();
      if ((await locator.count().catch(() => 0)) === 0) {
        continue;
      }
      const text = await locator.textContent().catch(() => null);
      const normalized = toText(text);
      if (normalized) {
        return normalized;
      }
    }
    return null;
  };
  const readMetaContent = async (selector) =>
    await page
      .locator(selector)
      .first()
      .getAttribute('content')
      .catch(() => null);
  const dedupeImages = (values, limit = configuredMaxExtractedImages) => {
    const result = [];
    const seen = new Set();
    for (const value of Array.isArray(values) ? values : []) {
      const normalized = toAbsoluteUrl(value, page.url());
      if (!normalized) {
        continue;
      }
      if (seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      result.push(normalized);
      if (result.length >= limit) {
        break;
      }
    }
    return result;
  };
  const readBodyText = async () =>
    toText(await page.locator('body').first().innerText().catch(() => null)) || '';
  const extractFirstPriceText = (values) => {
    for (const value of Array.isArray(values) ? values : []) {
      const normalized = toText(value);
      if (!normalized) {
        continue;
      }
      const match = normalized.match(PRICE_TEXT_PATTERN);
      if (match && toText(match[0])) {
        return toText(match[0]);
      }
    }
    return null;
  };
  const extractMoqText = (bodyText) => {
    const patterns = [
      /起订量[:：]?\s*[^\n]{0,30}/,
      /起批量[:：]?\s*[^\n]{0,30}/,
      /起批[:：]?\s*[^\n]{0,30}/,
      /MOQ[:：]?\s*[^\n]{0,30}/i,
    ];
    for (const pattern of patterns) {
      const match = String(bodyText || '').match(pattern);
      if (match && toText(match[0])) {
        return toText(match[0]);
      }
    }
    return null;
  };
  const extractLabeledBodyValue = (bodyText, labelPatterns) => {
    const text = String(bodyText || '');
    for (const pattern of Array.isArray(labelPatterns) ? labelPatterns : []) {
      const match = text.match(pattern);
      if (match && toText(match[1])) {
        return toText(match[1]);
      }
    }
    return null;
  };
  const parsePriceParts = (priceText, moqText) => {
    const normalizedPrice = toText(priceText);
    const valueMatches = normalizedPrice
      ? Array.from(normalizedPrice.matchAll(/\d+(?:\.\d+)?/g)).map((entry) => entry[0])
      : [];
    const currency = normalizedPrice && /[¥￥]/.test(normalizedPrice) ? 'CNY' : null;
    return {
      label: normalizedPrice && /[-~至]/.test(normalizedPrice) ? 'Range' : 'Primary',
      amount: valueMatches[0] || null,
      currency,
      rangeStart: valueMatches[0] || null,
      rangeEnd: valueMatches.length > 1 ? valueMatches[valueMatches.length - 1] : null,
      moq: toText(moqText),
      unit: null,
      source: 'page',
    };
  };
  const tokenizeComparableText = (value) =>
    (toText(value) || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 3);
  const scoreSupplierCandidate = (candidate) => {
    let score = 0;
    if (toText(candidate?.title)) {
      score += 3;
    }
    if (toText(candidate?.price)) {
      score += 2;
    }
    if (toText(candidate?.supplierDetails?.supplierName)) {
      score += 2;
    }
    if (Array.isArray(candidate?.supplierDetails?.images) && candidate.supplierDetails.images.length > 0) {
      score += 1;
    }
    if (toText(candidate?.supplierDetails?.supplierStoreUrl)) {
      score += 1;
    }
    const nameTokens = tokenizeComparableText(productName);
    const titleTokens = tokenizeComparableText(candidate?.title);
    if (nameTokens.length > 0 && titleTokens.length > 0) {
      const nameSet = new Set(nameTokens);
      const overlap = titleTokens.filter((token) => nameSet.has(token)).length;
      score += overlap;
    }
    return score;
  };
  const extract1688CandidatePayload = async (candidateUrl, candidateRank, candidateId) => {
    await page.goto(candidateUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
    await wait(1200);
    const barrier = await detect1688AccessBarrier();
    if (barrier.blocked) {
      return {
        blocked: true,
        message: barrier.message,
        currentUrl: barrier.currentUrl,
      };
    }

    const pageTitle =
      toText(await readMetaContent('meta[property="og:title"]')) ||
      toText(await page.title().catch(() => null)) ||
      (await readFirstText(['h1', '[class*="title"]', '[data-testid*="title"]']));
    const descriptionSnippet =
      toText(await readMetaContent('meta[name="description"]')) ||
      (await readFirstText(['meta[name="description"]', '[class*="desc"]', '[class*="summary"]']));
    const selectorPriceText = extractFirstPriceText([
      await readFirstText([
        '[class*="price"]',
        '[class*="Price"]',
        '[data-testid*="price"]',
        '[class*="reference"]',
      ]),
    ]);
    const bodyText = await readBodyText();
    const bodyPriceText = extractFirstPriceText(bodyText.split(/\n+/).slice(0, 120));
    const priceText = selectorPriceText || bodyPriceText;
    const moqText = extractMoqText(bodyText);
    const supplierName =
      (await readFirstText([
        'a[href*="shop.1688.com"]',
        '[class*="shop-name"]',
        '[class*="company-name"]',
        '[class*="supplier-name"]',
      ])) ||
      extractLabeledBodyValue(bodyText, [
        /供应商[:：]\s*([^\n]{1,80})/,
        /厂商[:：]\s*([^\n]{1,80})/,
      ]);
    const supplierStoreUrl = toAbsoluteUrl(
      await page
        .locator('a[href*="shop.1688.com"], a[href*="winport"]')
        .first()
        .getAttribute('href')
        .catch(() => null),
      page.url()
    );
    const supplierLocation = extractLabeledBodyValue(bodyText, [
      /所在地[:：]\s*([^\n]{1,80})/,
      /发货地[:：]\s*([^\n]{1,80})/,
    ]);
    const supplierRating = extractLabeledBodyValue(bodyText, [
      /诚信通[:：]?\s*([^\n]{1,40})/,
      /经营模式[:：]?\s*([^\n]{1,40})/,
    ]);
    const imageUrls = dedupeImages(
      await page
        .locator('img')
        .evaluateAll((images) =>
          images
            .map((img) =>
              img instanceof HTMLImageElement
                ? img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src')
                : null
            )
            .filter(Boolean)
        )
        .catch(() => [])
    );
    const currentUrl = page.url();
    const canonicalUrl = normalize1688OfferUrl(currentUrl) || normalize1688OfferUrl(candidateUrl) || currentUrl;
    const platformProductIdMatch = canonicalUrl.match(/\/offer\/(\d+)\.html/i);
    const priceParts = parsePriceParts(priceText, moqText);
    const artifactKey = '1688-scan-probe-' + (candidateId || 'candidate') + '-rank-' + String(candidateRank);
    await artifacts.screenshot(artifactKey).catch(() => undefined);
    await artifacts.html(artifactKey).catch(() => undefined);

    return {
      blocked: false,
      title: pageTitle,
      price: priceText,
      url: canonicalUrl,
      description: descriptionSnippet,
      supplierDetails: {
        supplierName,
        supplierStoreUrl,
        supplierProductUrl: canonicalUrl,
        platformProductId: platformProductIdMatch ? platformProductIdMatch[1] : null,
        currency: priceParts.currency,
        priceText,
        priceRangeText:
          toText(priceText) && /[-~至]/.test(priceText) ? toText(priceText) : null,
        moqText,
        supplierLocation,
        supplierRating,
        sourceLanguage:
          toText(await page.locator('html').first().getAttribute('lang').catch(() => null)) || 'zh-CN',
        images: imageUrls.map((imageUrl, index) => ({
          url: imageUrl,
          alt: null,
          source: index === 0 ? 'hero' : 'gallery',
          position: index + 1,
        })),
        prices: toText(priceText) ? [priceParts] : [],
      },
      supplierProbe: {
        candidateUrl: normalize1688OfferUrl(candidateUrl) || candidateUrl,
        canonicalUrl,
        pageTitle,
        descriptionSnippet,
        pageLanguage:
          toText(await page.locator('html').first().getAttribute('lang').catch(() => null)) || 'zh-CN',
        supplierName,
        supplierStoreUrl,
        priceText,
        currency: priceParts.currency,
        heroImageUrl: imageUrls[0] || null,
        heroImageAlt: null,
        heroImageArtifactName: null,
        artifactKey,
        imageCount: imageUrls.length,
      },
      score: scoreSupplierCandidate({
        title: pageTitle,
        price: priceText,
        supplierDetails: {
          supplierName,
          supplierStoreUrl,
          images: imageUrls,
        },
      }),
    };
  };

  if (imageCandidates.length === 0 && !directCandidateUrl && directCandidateUrls.length === 0) {
    upsertScanStep({
      key: 'validate',
      label: 'Validate 1688 supplier scan input',
      status: 'failed',
      resultCode: 'missing_image_candidates',
      message: '1688 supplier reverse image scanner requires at least one product image.',
      url: page.url(),
    });
    await artifacts.screenshot('1688-scan-error').catch(() => undefined);
    await artifacts.html('1688-scan-error').catch(() => undefined);
    await emitResult({
      status: 'failed',
      title: null,
      price: null,
      url: null,
      description: null,
      supplierDetails: null,
      supplierProbe: null,
      candidateUrls: [],
      matchedImageId: null,
      message: '1688 supplier reverse image scanner requires at least one product image.',
      currentUrl: page.url(),
      stage: 'validate',
    });
    return;
  }

  const selectedImageCandidate = imageCandidates.find(
    (candidate) => toText(candidate?.filepath) || toText(candidate?.url)
  ) || null;
  const matchedImageId =
    directMatchedImageId || toText(selectedImageCandidate?.id) || null;
  upsertScanStep({
    key: 'validate',
    label: 'Validate 1688 supplier scan input',
    status: 'completed',
    resultCode: 'scan_ready',
    message: 'Prepared 1688 supplier reverse image scan input.',
    candidateId: matchedImageId,
    inputSource: toText(selectedImageCandidate?.filepath)
      ? 'file'
      : toText(selectedImageCandidate?.url)
        ? 'url'
        : null,
    details: [
      { label: 'Product', value: productName || toText(input?.productId) },
      { label: 'Image candidates', value: String(imageCandidates.length) },
    ],
    url: page.url(),
  });
  await emitProgress({
    stage: 'validate',
    matchedImageId,
    message: 'Prepared 1688 supplier reverse image scan input.',
  });

  let candidateUrls = dedupeStrings(
    [directCandidateUrl].concat(directCandidateUrls),
    CANDIDATE_RESULT_LIMIT
  )
    .map((candidateUrl) => normalize1688OfferUrl(candidateUrl) || candidateUrl)
    .filter(Boolean);

  if (candidateUrls.length === 0) {
    const imageFilePath = toText(selectedImageCandidate?.filepath);
    const imageUrl = toText(selectedImageCandidate?.url);
    upsertScanStep({
      key: '1688_open',
      label: 'Open 1688 image search',
      attempt: 1,
      candidateId: matchedImageId,
      inputSource: imageFilePath ? 'file' : imageUrl ? 'url' : null,
      status: 'running',
      resultCode: 'search_open_start',
      message: 'Opening 1688 image search.',
      url: 'https://www.1688.com/',
    });
    await page.goto('https://www.1688.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
    await wait(1200);
    upsertScanStep({
      key: '1688_open',
      label: 'Open 1688 image search',
      attempt: 1,
      candidateId: matchedImageId,
      inputSource: imageFilePath ? 'file' : imageUrl ? 'url' : null,
      status: 'completed',
      resultCode: 'search_opened',
      message: 'Opened 1688 image search.',
      url: page.url(),
    });
    await emitProgress({
      stage: '1688_open',
      matchedImageId,
      message: 'Opened 1688 image search.',
      currentUrl: page.url(),
    });

    const barrierAfterOpen = await detect1688AccessBarrier();
    if (barrierAfterOpen.blocked) {
      upsertScanStep({
        key: '1688_open',
        label: 'Open 1688 image search',
        attempt: 1,
        candidateId: matchedImageId,
        inputSource: imageFilePath ? 'file' : imageUrl ? 'url' : null,
        status: 'failed',
        resultCode: 'access_blocked',
        message: barrierAfterOpen.message,
        url: barrierAfterOpen.currentUrl,
      });
      await emitResult({
        status: 'captcha_required',
        title: null,
        price: null,
        url: null,
        description: null,
        supplierDetails: null,
        supplierProbe: null,
        candidateUrls: [],
        matchedImageId,
        message: barrierAfterOpen.message,
        currentUrl: barrierAfterOpen.currentUrl,
        stage: '1688_open',
      });
      return;
    }

    const fileInput =
      (await findFirstVisibleFileInput()) ||
      (await clickFirstVisible(IMAGE_SEARCH_ENTRY_SELECTORS).then(async (clicked) => {
        if (clicked) {
          await wait(1200);
          return await findFirstVisibleFileInput();
        }
        return null;
      }));

    if (fileInput && imageFilePath) {
      upsertScanStep({
        key: '1688_upload',
        label: 'Upload image to 1688 search',
        attempt: 1,
        candidateId: matchedImageId,
        inputSource: 'file',
        status: 'running',
        resultCode: 'upload_start',
        message: 'Uploading local product image to 1688 search.',
        url: page.url(),
      });
      await fileInput.setInputFiles(imageFilePath);
      const candidateState = await waitFor1688Candidates(page.url());
      if (!candidateState.ready) {
        upsertScanStep({
          key: '1688_upload',
          label: 'Upload image to 1688 search',
          attempt: 1,
          candidateId: matchedImageId,
          inputSource: 'file',
          status: candidateState.blocked ? 'running' : 'failed',
          resultCode: candidateState.blocked ? 'captcha_required' : 'candidate_timeout',
          message: candidateState.message,
          url: candidateState.currentUrl,
        });
        await emitResult({
          status: candidateState.blocked ? 'captcha_required' : 'failed',
          title: null,
          price: null,
          url: null,
          description: null,
          supplierDetails: null,
          supplierProbe: null,
          candidateUrls: [],
          matchedImageId,
          message: candidateState.message,
          currentUrl: candidateState.currentUrl,
          stage: '1688_upload',
        });
        return;
      }
      candidateUrls = candidateState.candidateUrls;
      upsertScanStep({
        key: '1688_collect_candidates',
        label: 'Collect 1688 supplier candidates',
        attempt: 1,
        candidateId: matchedImageId,
        inputSource: 'file',
        status: 'completed',
        resultCode: 'candidates_collected',
        message: 'Collected ' + String(candidateUrls.length) + ' 1688 supplier candidates.',
        url: candidateState.currentUrl,
        details: [{ label: 'Candidates', value: String(candidateUrls.length) }],
      });
    } else if (imageUrl && allowUrlImageSearchFallback) {
      const urlSearchAttempts = [
        'https://s.1688.com/youyuan/index.htm?tab=imageSearch&imageAddress=' + encodeURIComponent(imageUrl),
        'https://s.1688.com/youyuan/index.htm?imageAddress=' + encodeURIComponent(imageUrl),
      ];
      let urlSearchResolved = false;
      for (const searchUrl of urlSearchAttempts) {
        upsertScanStep({
          key: '1688_upload',
          label: 'Open 1688 image search results',
          attempt: 1,
          candidateId: matchedImageId,
          inputSource: 'url',
          status: 'running',
          resultCode: 'url_search_start',
          message: 'Opening 1688 image search using the product image URL.',
          url: searchUrl,
        });
        await page.goto(searchUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        }).catch(() => undefined);
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
        const candidateState = await waitFor1688Candidates(searchUrl, 8000);
        if (!candidateState.ready) {
          if (candidateState.blocked) {
            await emitResult({
              status: 'captcha_required',
              title: null,
              price: null,
              url: null,
              description: null,
              supplierDetails: null,
              supplierProbe: null,
              candidateUrls: [],
              matchedImageId,
              message: candidateState.message,
              currentUrl: candidateState.currentUrl,
              stage: '1688_upload',
            });
            return;
          }
          continue;
        }
        candidateUrls = candidateState.candidateUrls;
        urlSearchResolved = candidateUrls.length > 0;
        if (urlSearchResolved) {
          upsertScanStep({
            key: '1688_collect_candidates',
            label: 'Collect 1688 supplier candidates',
            attempt: 1,
            candidateId: matchedImageId,
            inputSource: 'url',
            status: 'completed',
            resultCode: 'candidates_collected',
            message: 'Collected ' + String(candidateUrls.length) + ' 1688 supplier candidates.',
            url: candidateState.currentUrl,
            details: [{ label: 'Candidates', value: String(candidateUrls.length) }],
          });
          break;
        }
      }
      if (!urlSearchResolved) {
        upsertScanStep({
          key: '1688_upload',
          label: 'Open 1688 image search results',
          attempt: 1,
          candidateId: matchedImageId,
          inputSource: 'url',
          status: 'failed',
          resultCode: 'url_search_unsupported',
          message:
            '1688 image search did not accept the product image URL. A local product image file is required for this scanner path.',
          url: page.url(),
        });
        await artifacts.screenshot('1688-scan-error').catch(() => undefined);
        await artifacts.html('1688-scan-error').catch(() => undefined);
        await emitResult({
          status: 'failed',
          title: null,
          price: null,
          url: null,
          description: null,
          supplierDetails: null,
          supplierProbe: null,
          candidateUrls: [],
          matchedImageId,
          message:
            '1688 image search did not accept the product image URL. A local product image file is required for this scanner path.',
          currentUrl: page.url(),
          stage: '1688_upload',
        });
        return;
      }
    } else {
      const missingInputMessage =
        imageUrl && !allowUrlImageSearchFallback
          ? '1688 image URL fallback is disabled in scanner settings. A local product image file is required for this scanner path.'
          : 'Product image candidate did not include a usable filepath or URL for 1688 scanning.';
      await emitResult({
        status: 'failed',
        title: null,
        price: null,
        url: null,
        description: null,
        supplierDetails: null,
        supplierProbe: null,
        candidateUrls: [],
        matchedImageId,
        message: missingInputMessage,
        currentUrl: page.url(),
        stage: '1688_upload',
      });
      return;
    }
  }

  const normalizedCandidateUrls = dedupeStrings(
    candidateUrls.map((candidateUrl) => normalize1688OfferUrl(candidateUrl) || candidateUrl),
    CANDIDATE_RESULT_LIMIT
  );
  if (normalizedCandidateUrls.length === 0) {
    await artifacts.screenshot('1688-scan-no-match').catch(() => undefined);
    await artifacts.html('1688-scan-no-match').catch(() => undefined);
    await emitResult({
      status: 'no_match',
      title: null,
      price: null,
      url: null,
      description: null,
      supplierDetails: null,
      supplierProbe: null,
      candidateUrls: [],
      matchedImageId,
      message: '1688 image search did not return any supplier product candidates.',
      currentUrl: page.url(),
      stage: '1688_collect_candidates',
    });
    return;
  }

  let bestCandidate = null;
  let bestScore = -1;
  let blockedMessage = null;
  for (const [index, candidateUrl] of normalizedCandidateUrls.entries()) {
    const candidateRank =
      index === 0 && directCandidateRank && directCandidateRank > 0
        ? directCandidateRank
        : index + 1;
    upsertScanStep({
      key: 'supplier_open',
      label: 'Open supplier product page',
      attempt: 1,
      candidateId: matchedImageId,
      candidateRank,
      inputSource: null,
      status: 'running',
      resultCode: 'candidate_open_start',
      message: 'Opening 1688 supplier candidate #' + String(candidateRank) + '.',
      url: candidateUrl,
    });
    const candidatePayload = await extract1688CandidatePayload(
      candidateUrl,
      candidateRank,
      matchedImageId
    ).catch((error) => ({
      blocked: false,
      message:
        (error instanceof Error && toText(error.message)) ||
        'Failed to probe 1688 supplier candidate.',
      currentUrl: page.url(),
    }));
    if (candidatePayload?.blocked) {
      blockedMessage = candidatePayload.message;
      upsertScanStep({
        key: 'supplier_open',
        label: 'Open supplier product page',
        attempt: 1,
        candidateId: matchedImageId,
        candidateRank,
        status: 'failed',
        resultCode: 'access_blocked',
        message: candidatePayload.message,
        url: candidatePayload.currentUrl,
      });
      break;
    }
    if (!candidatePayload || !toText(candidatePayload.url)) {
      upsertScanStep({
        key: 'supplier_open',
        label: 'Open supplier product page',
        attempt: 1,
        candidateId: matchedImageId,
        candidateRank,
        status: 'failed',
        resultCode: 'candidate_probe_failed',
        message: candidatePayload?.message || 'Failed to probe 1688 supplier candidate.',
        url: candidateUrl,
      });
      continue;
    }
    upsertScanStep({
      key: 'supplier_probe',
      label: 'Probe supplier product page',
      attempt: 1,
      candidateId: matchedImageId,
      candidateRank,
      status: 'completed',
      resultCode: 'candidate_probed',
      message: 'Collected 1688 supplier candidate details.',
      url: candidatePayload.url,
      details: mergeStepDetails([
        { label: 'Supplier', value: candidatePayload.supplierDetails?.supplierName },
        { label: 'Price', value: candidatePayload.price },
        { label: 'Images', value: String(candidatePayload.supplierDetails?.images?.length || 0) },
      ]),
    });
    if (candidatePayload.score > bestScore) {
      bestScore = candidatePayload.score;
      bestCandidate = {
        ...candidatePayload,
        candidateRank,
      };
    }
  }

  if (blockedMessage) {
    await emitResult({
      status: 'captcha_required',
      title: null,
      price: null,
      url: null,
      description: null,
      supplierDetails: null,
      supplierProbe: null,
      candidateUrls: normalizedCandidateUrls,
      matchedImageId,
      message: blockedMessage,
      currentUrl: page.url(),
      stage: 'supplier_open',
    });
    return;
  }

    if (!bestCandidate || bestScore < configuredMinimumCandidateScore) {
    await artifacts.screenshot('1688-scan-no-match').catch(() => undefined);
    await artifacts.html('1688-scan-no-match').catch(() => undefined);
    await emitResult({
      status: 'no_match',
      title: bestCandidate?.title || null,
      price: bestCandidate?.price || null,
      url: bestCandidate?.url || null,
      description: bestCandidate?.description || null,
      supplierDetails: bestCandidate?.supplierDetails || null,
      supplierProbe: bestCandidate?.supplierProbe || null,
      candidateUrls: normalizedCandidateUrls,
      matchedImageId,
      message:
        bestCandidate
          ? '1688 supplier candidates were found, but none produced a confident supplier result.'
          : '1688 image search did not return a usable supplier product page.',
      currentUrl: page.url(),
      stage: 'supplier_probe',
    });
    return;
  }

  upsertScanStep({
    key: 'supplier_extract',
    label: 'Extract supplier details',
    attempt: 1,
    candidateId: matchedImageId,
    candidateRank: bestCandidate.candidateRank,
    status: 'completed',
    resultCode: 'supplier_matched',
    message: 'Extracted supplier details from the strongest 1688 candidate.',
    url: bestCandidate.url,
    details: mergeStepDetails([
      { label: 'Supplier', value: bestCandidate.supplierDetails?.supplierName },
      { label: 'Price', value: bestCandidate.price },
      { label: 'MOQ', value: bestCandidate.supplierDetails?.moqText },
    ]),
  });
  await artifacts.screenshot('1688-scan-match').catch(() => undefined);
  await artifacts.html('1688-scan-match').catch(() => undefined);
  await emitResult({
    status: 'matched',
    title: bestCandidate.title,
    price: bestCandidate.price,
    url: bestCandidate.url,
    description: bestCandidate.description,
    supplierDetails: bestCandidate.supplierDetails,
    supplierProbe: bestCandidate.supplierProbe,
    candidateUrls: normalizedCandidateUrls,
    matchedImageId,
    message: '1688 supplier reverse image scan completed.',
    currentUrl: page.url(),
    stage: 'supplier_extract',
  });
}
`;
