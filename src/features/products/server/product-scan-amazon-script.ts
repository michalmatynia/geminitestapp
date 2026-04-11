export const AMAZON_REVERSE_IMAGE_SCAN_SCRIPT = String.raw`export default async function run({
  page,
  input,
  emit,
  log,
  artifacts,
  helpers,
}) {
  const imageCandidates = Array.isArray(input?.imageCandidates) ? input.imageCandidates : [];

  const emitResult = async (payload) => {
    emit('result', payload);
    if (typeof artifacts?.json === 'function') {
      await artifacts.json('amazon-scan-result', payload).catch(() => undefined);
    }
  };

  const wait = async (ms) => {
    if (helpers && typeof helpers.sleep === 'function') {
      await helpers.sleep(ms);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, ms));
  };

  const toText = (value) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const isGoogleRedirectHost = (host) => {
    const normalizedHost = toText(host)?.toLowerCase();
    if (!normalizedHost) {
      return false;
    }

    if (
      normalizedHost === 'googleusercontent.com' ||
      normalizedHost.endsWith('.googleusercontent.com')
    ) {
      return true;
    }

    const hostParts = normalizedHost.split('.').filter(Boolean);
    const googleIndex = hostParts.lastIndexOf('google');
    const googleSuffixParts = googleIndex >= 0 ? hostParts.slice(googleIndex + 1) : [];

    return (
      googleIndex >= 0 &&
      googleSuffixParts.length >= 1 &&
      googleSuffixParts.length <= 2 &&
      googleSuffixParts.every((part) => /^[a-z]{2,3}$/i.test(part))
    );
  };

  const normalizeAmazonUrl = (value) => {
    const href = toText(value);
    if (!href) return null;
    try {
      const parsed = new URL(href, page.url());
      const host = parsed.hostname.toLowerCase();
      if (isGoogleRedirectHost(host)) {
        const redirected = parsed.searchParams.get('url') || parsed.searchParams.get('q');
        if (redirected) {
          return normalizeAmazonUrl(redirected);
        }
      }
      const hostParts = host.split('.').filter(Boolean);
      const amazonIndex = hostParts.lastIndexOf('amazon');
      const amazonSuffixParts = amazonIndex >= 0 ? hostParts.slice(amazonIndex + 1) : [];
      const isRetailAmazonHost =
        amazonIndex >= 0 &&
        amazonSuffixParts.length >= 1 &&
        amazonSuffixParts.length <= 2 &&
        amazonSuffixParts.every((part) => /^[a-z]{2,3}$/i.test(part));
      if (!isRetailAmazonHost) {
        return null;
      }
      const redirectedAmazonUrl =
        parsed.searchParams.get('url') ||
        parsed.searchParams.get('u') ||
        parsed.searchParams.get('redirectUrl');
      if (redirectedAmazonUrl) {
        return normalizeAmazonUrl(new URL(redirectedAmazonUrl, parsed.origin).toString());
      }
      const pathname = parsed.pathname.toLowerCase();
      const blockedPathPrefixes = [
        '/ap/',
        '/gp/help',
        '/gp/cart',
        '/hz/',
        '/stores',
      ];
      if (blockedPathPrefixes.some((prefix) => pathname.startsWith(prefix))) {
        return null;
      }
      if (extractAsin(parsed.toString())) {
        parsed.search = '';
      }
      parsed.hash = '';
      return parsed.toString();
    } catch {
      return null;
    }
  };

  const toAbsoluteUrl = (value, baseUrl) => {
    const href = toText(value);
    if (!href) return null;
    try {
      return new URL(href, baseUrl || page.url()).toString();
    } catch {
      return href;
    }
  };

  const extractAsin = (value) => {
    const text = toText(value);
    if (!text) return null;
    const match = text
      .toUpperCase()
      .match(/(?:\/DP\/|\/GP\/PRODUCT\/|\/GP\/AW\/D\/|\/PRODUCT\/|ASIN=)([A-Z0-9]{10})(?:[/?#&]|$)/i);
    return match ? match[1] : null;
  };

  const rankAmazonCandidateUrl = (value) => {
    const normalized = toText(value);
    if (!normalized) return -1;
    if (extractAsin(normalized)) return 3;
    if (/\/(?:dp|gp\/product|gp\/aw\/d|product)\//i.test(normalized)) return 2;
    if (/\/s(?:[/?#]|$)/i.test(normalized)) return 1;
    return 0;
  };

  const clickGoogleConsentIfPresent = async () => {
    const selectors = [
      'button:has-text("Accept all cookies")',
      'button:has-text("Accept all")',
      'button:has-text("I agree")',
      'button[aria-label*="Accept"]',
      'button[aria-label*="agree"]',
    ];
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      if ((await locator.count().catch(() => 0)) > 0) {
        await locator.click().catch(() => undefined);
        await wait(800);
        return;
      }
    }
  };

  const uploadImageCandidate = async (candidate) => {
    const filePath = toText(candidate?.filepath);
    const imageUrl = toText(candidate?.url);

    if (filePath) {
      await page.goto('https://lens.google.com/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await clickGoogleConsentIfPresent();
      const inputLocator = page.locator('input[type="file"]').first();
      await inputLocator.waitFor({ state: 'attached', timeout: 15000 });
      await inputLocator.setInputFiles(filePath);
      await wait(2500);
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
      return { uploaded: true, error: null };
    }

    if (imageUrl) {
      await page.goto('https://lens.google.com/uploadbyurl?url=' + encodeURIComponent(imageUrl), {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await clickGoogleConsentIfPresent();
      await wait(2500);
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
      return { uploaded: true, error: null };
    }

    return {
      uploaded: false,
      error: 'Product image candidate did not include a filepath or URL.',
    };
  };

  const collectAmazonCandidates = async () => {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      const hrefs = await page
        .locator('a[href]')
        .evaluateAll((links) =>
          links
            .map((link) => {
              const anchor = link;
              return typeof anchor.href === 'string' ? anchor.href : anchor.getAttribute('href');
            })
            .filter(Boolean)
        )
        .catch(() => []);

      const candidates = Array.from(
        new Set(
          hrefs
            .map((href) => normalizeAmazonUrl(href))
            .filter((href) => typeof href === 'string' && href.length > 0)
        )
      );

      if (candidates.length > 0) {
        const sortedCandidates = [...candidates].sort(
          (left, right) => rankAmazonCandidateUrl(right) - rankAmazonCandidateUrl(left)
        );
        return sortedCandidates.slice(0, 5);
      }

      await wait(1000);
    }

    return [];
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

  const scoreAmazonPageData = (result) =>
    [result?.title, result?.price, result?.url, result?.description].filter(Boolean).length;

  const extractAmazonPageData = async (candidateUrl, matchedImageId) => {
    await page.goto(candidateUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await wait(1500);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);

    const currentUrl = page.url();
    const canonicalHref = toText(
      await page.locator('link[rel="canonical"]').first().getAttribute('href').catch(() => null)
    );
    const canonicalUrl = toAbsoluteUrl(canonicalHref, currentUrl) || currentUrl;
    const asin =
      extractAsin(currentUrl) ||
      extractAsin(canonicalUrl) ||
      extractAsin(await page.locator('input#ASIN').first().inputValue().catch(() => null)) ||
      extractAsin(await page.locator('[data-asin]').first().getAttribute('data-asin').catch(() => null));

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

    return {
      status: asin ? 'matched' : 'no_match',
      asin,
      title,
      price,
      url: canonicalUrl || toAbsoluteUrl(currentUrl, candidateUrl) || currentUrl,
      description,
      matchedImageId: toText(matchedImageId),
      currentUrl,
      message: asin ? null : 'Amazon page opened but ASIN could not be extracted.',
      stage: 'amazon_extract',
    };
  };

  try {
    if (imageCandidates.length === 0) {
      await emitResult({
        status: 'failed',
        message: 'No product image candidates were provided.',
        stage: 'validate',
        currentUrl: page.url(),
      });
      return;
    }

    let attemptedAmazonCandidateCount = 0;
    let openedAmazonCandidateCount = 0;
    let lastAmazonCandidateError = null;
    let uploadedCandidateCount = 0;
    let lastUploadError = null;
    let bestNoMatchResult = null;
    let bestNoMatchCandidateUrls = [];

    for (const candidate of imageCandidates) {
      const candidateId = toText(candidate?.id);
      log('amazon.scan.image_candidate', { candidateId, filepath: candidate?.filepath, url: candidate?.url });

      const uploadResult = await uploadImageCandidate(candidate).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        return { uploaded: false, error: message };
      });

      if (!uploadResult.uploaded) {
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

      const amazonCandidates = await collectAmazonCandidates();
      log('amazon.scan.google_candidates', { candidateId, candidateCount: amazonCandidates.length });

      if (amazonCandidates.length === 0) {
        continue;
      }

      for (const amazonCandidateUrl of amazonCandidates.slice(0, 3)) {
        attemptedAmazonCandidateCount += 1;
        let extracted;
        try {
          extracted = await extractAmazonPageData(amazonCandidateUrl, candidateId);
          openedAmazonCandidateCount += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          lastAmazonCandidateError = message;
          log('amazon.scan.amazon_candidate_failed', {
            candidateId,
            amazonCandidateUrl,
            error: message,
          });
          continue;
        }

        if (extracted.status === 'matched') {
          await emitResult({
            ...extracted,
            candidateUrls: amazonCandidates,
          });
          return;
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
