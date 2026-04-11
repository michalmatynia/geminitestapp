export const AMAZON_REVERSE_IMAGE_SCAN_SCRIPT = String.raw`export default async function run({
  page,
  input,
  emit,
  log,
  artifacts,
  helpers,
}) {
  const imageCandidates = Array.isArray(input?.imageCandidates) ? input.imageCandidates : [];
  const allowManualVerification = input?.allowManualVerification === true;
  const manualVerificationTimeoutMs =
    typeof input?.manualVerificationTimeoutMs === 'number' &&
    Number.isFinite(input.manualVerificationTimeoutMs) &&
    input.manualVerificationTimeoutMs > 0
      ? Math.trunc(input.manualVerificationTimeoutMs)
      : 240000;
  const CAPTCHA_REQUIRED_MESSAGE = 'Google Lens requested captcha verification.';
  const CAPTCHA_WAIT_MESSAGE =
    'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.';
  const scanSteps = [];
  const nowIso = () => new Date().toISOString();

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
    const existingIndex = scanSteps.findIndex((entry) => entry.key === key);
    const existingStep =
      existingIndex >= 0
        ? scanSteps[existingIndex]
        : {
            key,
            label,
            status: 'pending',
            message: null,
            url: null,
            startedAt: null,
            completedAt: null,
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

    const nextStep = {
      ...existingStep,
      label,
      status: normalizedStatus,
      message: stepMessage ?? existingStep.message ?? null,
      url: stepUrl ?? existingStep.url ?? null,
      startedAt,
      completedAt,
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
      await artifacts.json('amazon-scan-result', payloadWithSteps).catch(() => undefined);
    }
  };

  const emitProgress = async (input = {}) => {
    await emitResult({
      status: 'running',
      asin: null,
      title: null,
      price: null,
      url: toText(input?.url) || page.url(),
      description: null,
      matchedImageId: null,
      currentUrl: toText(input?.currentUrl) || page.url(),
      message: toText(input?.message),
      stage: toText(input?.stage),
    });
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
      normalizedHost === 'googleadservices.com' ||
      normalizedHost.endsWith('.googleadservices.com') ||
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
        const redirected =
          parsed.searchParams.get('url') ||
          parsed.searchParams.get('q') ||
          parsed.searchParams.get('adurl');
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

  const detectGoogleLensCaptcha = async () => {
    const currentUrl = page.url();
    const normalizedUrl = currentUrl.toLowerCase();
    const bodyText = (
      toText(await page.locator('body').first().textContent().catch(() => null)) || ''
    ).toLowerCase();
    const challengeSelectors = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      'iframe[title*="recaptcha"]',
      'iframe[title*="captcha"]',
      'form[action*="sorry"]',
      'input[name="captcha"]',
      '#captcha-form',
      '.g-recaptcha',
    ];

    for (const selector of challengeSelectors) {
      if ((await page.locator(selector).first().count().catch(() => 0)) > 0) {
        return {
          detected: true,
          currentUrl,
        };
      }
    }

    const textHints = [
      'unusual traffic',
      'our systems have detected unusual traffic',
      'solve the captcha',
      'enter the characters you see below',
      'verify you are human',
      'not a robot',
      'captcha',
    ];
    const urlHints = ['/sorry', '/challenge', '/captcha', 'sorry/index'];

    return {
      detected:
        urlHints.some((hint) => normalizedUrl.includes(hint)) ||
        textHints.some((hint) => bodyText.includes(hint)),
      currentUrl,
    };
  };

  const handleGoogleLensCaptchaIfPresent = async (stage) => {
    const detected = await detectGoogleLensCaptcha();
    if (!detected.detected) {
      return { resolved: true, captchaRequired: false, currentUrl: detected.currentUrl, message: null };
    }

    log('amazon.scan.google_captcha_detected', {
      stage,
      currentUrl: detected.currentUrl,
      allowManualVerification,
    });
    upsertScanStep({
      key: 'google_captcha',
      label: 'Google captcha',
      status: 'running',
      message: CAPTCHA_WAIT_MESSAGE,
      url: detected.currentUrl,
    });

    if (!allowManualVerification) {
      upsertScanStep({
        key: 'google_captcha',
        label: 'Google captcha',
        status: 'failed',
        message: CAPTCHA_REQUIRED_MESSAGE,
        url: detected.currentUrl,
      });
      await emitResult({
        status: 'captcha_required',
        asin: null,
        title: null,
        price: null,
        url: null,
        description: null,
        matchedImageId: null,
        currentUrl: detected.currentUrl,
        message: CAPTCHA_REQUIRED_MESSAGE,
        stage,
      });
      return {
        resolved: false,
        captchaRequired: true,
        currentUrl: detected.currentUrl,
        message: CAPTCHA_REQUIRED_MESSAGE,
      };
    }

    await emitResult({
      status: 'captcha_required',
      asin: null,
      title: null,
      price: null,
      url: null,
      description: null,
      matchedImageId: null,
      currentUrl: detected.currentUrl,
      message: CAPTCHA_WAIT_MESSAGE,
      stage,
    });

    const deadline = Date.now() + manualVerificationTimeoutMs;
    while (Date.now() < deadline) {
      await wait(1000);
      const currentState = await detectGoogleLensCaptcha();
      if (!currentState.detected) {
        await wait(1500);
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);
        const settledState = await detectGoogleLensCaptcha();
        if (!settledState.detected) {
          log('amazon.scan.google_captcha_resolved', {
            stage,
            currentUrl: page.url(),
          });
          upsertScanStep({
            key: 'google_captcha',
            label: 'Google captcha',
            status: 'completed',
            message: 'Captcha resolved. Continuing scan.',
            url: page.url(),
          });
          return {
            resolved: true,
            captchaRequired: false,
            currentUrl: page.url(),
            message: null,
          };
        }
      }
    }

    upsertScanStep({
      key: 'google_captcha',
      label: 'Google captcha',
      status: 'failed',
      message: 'Google Lens captcha was not resolved before timeout.',
      url: page.url(),
    });

    return {
      resolved: false,
      captchaRequired: false,
      currentUrl: page.url(),
      message: 'Google Lens captcha was not resolved before timeout.',
    };
  };

  const uploadImageCandidate = async (candidate) => {
    const filePath = toText(candidate?.filepath);
    const imageUrl = toText(candidate?.url);
    const candidateId = toText(candidate?.id);

    if (filePath) {
      upsertScanStep({
        key: 'google_lens_open',
        label: 'Open Google Lens',
        status: 'running',
        message: 'Opening Google Lens for image ' + (candidateId || 'candidate') + '.',
        url: 'https://lens.google.com/',
      });
      await page.goto('https://lens.google.com/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await clickGoogleConsentIfPresent();
      upsertScanStep({
        key: 'google_lens_open',
        label: 'Open Google Lens',
        status: 'completed',
        message: 'Google Lens opened.',
        url: page.url(),
      });
      await emitProgress({
        stage: 'google_lens',
        message: 'Google Lens opened.',
      });
      const preUploadCaptchaState = await handleGoogleLensCaptchaIfPresent('google_lens');
      if (!preUploadCaptchaState.resolved) {
        upsertScanStep({
          key: 'google_upload',
          label: 'Upload image to Google Lens',
          status: preUploadCaptchaState.captchaRequired ? 'running' : 'failed',
          message: preUploadCaptchaState.message,
          url: preUploadCaptchaState.currentUrl,
        });
        return {
          uploaded: false,
          captchaRequired: preUploadCaptchaState.captchaRequired,
          error: preUploadCaptchaState.message,
        };
      }
      upsertScanStep({
        key: 'google_upload',
        label: 'Upload image to Google Lens',
        status: 'running',
        message: 'Uploading image ' + (candidateId || 'candidate') + ' from file.',
        url: page.url(),
      });
      const inputLocator = page.locator('input[type="file"]').first();
      await inputLocator.waitFor({ state: 'attached', timeout: 15000 });
      await inputLocator.setInputFiles(filePath);
      await wait(2500);
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
      const postUploadCaptchaState = await handleGoogleLensCaptchaIfPresent('google_upload');
      if (!postUploadCaptchaState.resolved) {
        upsertScanStep({
          key: 'google_upload',
          label: 'Upload image to Google Lens',
          status: postUploadCaptchaState.captchaRequired ? 'running' : 'failed',
          message: postUploadCaptchaState.message,
          url: postUploadCaptchaState.currentUrl,
        });
        return {
          uploaded: false,
          captchaRequired: postUploadCaptchaState.captchaRequired,
          error: postUploadCaptchaState.message,
        };
      }
      upsertScanStep({
        key: 'google_upload',
        label: 'Upload image to Google Lens',
        status: 'completed',
        message: 'Uploaded image ' + (candidateId || 'candidate') + ' to Google Lens.',
        url: page.url(),
      });
      await emitProgress({
        stage: 'google_upload',
        message: 'Uploaded image ' + (candidateId || 'candidate') + ' to Google Lens.',
      });
      return { uploaded: true, captchaRequired: false, error: null };
    }

    if (imageUrl) {
      upsertScanStep({
        key: 'google_lens_open',
        label: 'Open Google Lens',
        status: 'running',
        message: 'Opening Google Lens upload URL for image ' + (candidateId || 'candidate') + '.',
        url: imageUrl,
      });
      await page.goto('https://lens.google.com/uploadbyurl?url=' + encodeURIComponent(imageUrl), {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await clickGoogleConsentIfPresent();
      upsertScanStep({
        key: 'google_lens_open',
        label: 'Open Google Lens',
        status: 'completed',
        message: 'Google Lens upload page opened.',
        url: page.url(),
      });
      await emitProgress({
        stage: 'google_lens',
        message: 'Google Lens upload page opened.',
      });
      upsertScanStep({
        key: 'google_upload',
        label: 'Upload image to Google Lens',
        status: 'running',
        message: 'Submitting image URL for ' + (candidateId || 'candidate') + '.',
        url: page.url(),
      });
      await wait(2500);
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
      const uploadByUrlCaptchaState = await handleGoogleLensCaptchaIfPresent('google_upload');
      if (!uploadByUrlCaptchaState.resolved) {
        upsertScanStep({
          key: 'google_upload',
          label: 'Upload image to Google Lens',
          status: uploadByUrlCaptchaState.captchaRequired ? 'running' : 'failed',
          message: uploadByUrlCaptchaState.message,
          url: uploadByUrlCaptchaState.currentUrl,
        });
        return {
          uploaded: false,
          captchaRequired: uploadByUrlCaptchaState.captchaRequired,
          error: uploadByUrlCaptchaState.message,
        };
      }
      upsertScanStep({
        key: 'google_upload',
        label: 'Upload image to Google Lens',
        status: 'completed',
        message: 'Submitted image URL for ' + (candidateId || 'candidate') + '.',
        url: page.url(),
      });
      await emitProgress({
        stage: 'google_upload',
        message: 'Submitted image URL for ' + (candidateId || 'candidate') + '.',
      });
      return { uploaded: true, captchaRequired: false, error: null };
    }

    upsertScanStep({
      key: 'google_upload',
      label: 'Upload image to Google Lens',
      status: 'failed',
      message: 'Product image candidate did not include a filepath or URL.',
      url: page.url(),
    });
    return {
      uploaded: false,
      captchaRequired: false,
      error: 'Product image candidate did not include a filepath or URL.',
    };
  };

  const collectAmazonCandidates = async () => {
    upsertScanStep({
      key: 'google_candidates',
      label: 'Collect Amazon candidates from Google Lens',
      status: 'running',
      message: 'Collecting Amazon result candidates from Google Lens.',
      url: page.url(),
    });
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      const captchaState = await handleGoogleLensCaptchaIfPresent('google_candidates');
      if (!captchaState.resolved) {
        upsertScanStep({
          key: 'google_candidates',
          label: 'Collect Amazon candidates from Google Lens',
          status: captchaState.captchaRequired ? 'running' : 'failed',
          message: captchaState.message,
          url: captchaState.currentUrl,
        });
        return {
          candidates: [],
          captchaRequired: captchaState.captchaRequired,
          error: captchaState.message,
        };
      }

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
        upsertScanStep({
          key: 'google_candidates',
          label: 'Collect Amazon candidates from Google Lens',
          status: 'completed',
          message: 'Found ' + sortedCandidates.length + ' Amazon candidates.',
          url: page.url(),
        });
        await emitProgress({
          stage: 'google_candidates',
          message: 'Found ' + sortedCandidates.length + ' Amazon candidates.',
        });
        return {
          candidates: sortedCandidates.slice(0, 5),
          captchaRequired: false,
          error: null,
        };
      }

      await wait(1000);
    }

    upsertScanStep({
      key: 'google_candidates',
      label: 'Collect Amazon candidates from Google Lens',
      status: 'completed',
      message: 'No Amazon candidates were found in Google Lens results.',
      url: page.url(),
    });
    await emitProgress({
      stage: 'google_candidates',
      message: 'No Amazon candidates were found in Google Lens results.',
    });
    return {
      candidates: [],
      captchaRequired: false,
      error: null,
    };
  };

  const clickFirstVisible = async (selectors) => {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      if ((await locator.count().catch(() => 0)) === 0) {
        continue;
      }
      const visible = await locator.isVisible().catch(() => false);
      if (!visible) {
        continue;
      }
      await locator.scrollIntoViewIfNeeded().catch(() => undefined);
      const clicked = await locator
        .click({ timeout: 3000 })
        .then(() => true)
        .catch(() => false);
      if (!clicked) {
        const jsClicked = await locator
          .evaluate((element) => {
            if (!(element instanceof HTMLElement)) {
              return false;
            }
            element.click();
            return true;
          })
          .catch(() => false);
        if (jsClicked) {
          await wait(800);
          return true;
        }
      }
      if (clicked) {
        await wait(800);
        return true;
      }
    }

    return false;
  };

  const AMAZON_PRODUCT_CONTENT_SELECTORS = [
    '#productTitle',
    'input#ASIN',
    '[data-asin]',
    '#corePrice_feature_div',
    '#feature-bullets',
  ];

  const readVisibleBodyText = async () =>
    (
      toText(
        await page
          .locator('body')
          .first()
          .evaluate((node) => {
            if (!(node instanceof HTMLElement)) {
              return null;
            }
            return node.innerText;
          })
          .catch(() => null)
      ) || ''
    ).toLowerCase();

  const detectAmazonOverlayState = async () => {
    const bodyText = await readVisibleBodyText();

    const cookieSelectors = [
      '#sp-cc',
      '#sp-cc-banner',
      '#sp-cc-background',
      'form[action*="cookieprefs"]',
      'div[aria-modal="true"] button[name="accept"]',
      'button#sp-cc-accept',
      'input#sp-cc-accept',
    ];
    const addressSelectors = [
      '#glow-toaster',
      '#nav-main [data-a-modal-name="glow-toaster"]',
      'div[role="dialog"] button:has-text("Dismiss")',
      'button[aria-label="Dismiss"]',
      'input[data-action-type="DISMISS"]',
    ];
    const hasVisibleSelector = async (selectors) => {
      for (const selector of selectors) {
        const locator = page.locator(selector).first();
        if ((await locator.count().catch(() => 0)) === 0) {
          continue;
        }
        if (await locator.isVisible().catch(() => false)) {
          return true;
        }
      }
      return false;
    };

    const cookieTextHints = [
      'select your cookie preferences',
      'cookie notice',
      'we use cookies and similar tools',
    ];
    const addressTextHints = [
      "we're showing you items that dispatch to poland",
      'change your delivery address',
      'dispatch to poland',
    ];

    const cookieVisible =
      (await hasVisibleSelector(cookieSelectors)) ||
      cookieTextHints.some((hint) => bodyText.includes(hint));
    const addressVisible =
      (await hasVisibleSelector(addressSelectors)) ||
      addressTextHints.some((hint) => bodyText.includes(hint));
    const productContentReady = await hasVisibleSelector(AMAZON_PRODUCT_CONTENT_SELECTORS);

    return {
      cookieVisible,
      addressVisible,
      productContentReady,
      bodyText,
    };
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
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const contentVisible = await Promise.any(
        AMAZON_PRODUCT_CONTENT_SELECTORS.map(async (selector) => {
          const locator = page.locator(selector).first();
          if ((await locator.count().catch(() => 0)) === 0) {
            throw new Error('not-found');
          }
          const visible = await locator.isVisible().catch(() => false);
          if (!visible) {
            throw new Error('not-visible');
          }
          return true;
        })
      ).catch(() => false);

      if (contentVisible) {
        return true;
      }

      await wait(500);
    }

    return false;
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
    upsertScanStep({
      key: 'amazon_open',
      label: 'Open Amazon candidate',
      status: 'running',
      message: 'Opening Amazon candidate page.',
      url: candidateUrl,
    });
    await page.goto(candidateUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    upsertScanStep({
      key: 'amazon_open',
      label: 'Open Amazon candidate',
      status: 'completed',
      message: 'Amazon candidate page opened.',
      url: page.url(),
    });
    await emitProgress({
      stage: 'amazon_open',
      message: 'Amazon candidate page opened.',
    });
    upsertScanStep({
      key: 'amazon_overlays',
      label: 'Dismiss Amazon overlays',
      status: 'running',
      message: 'Checking Amazon cookie and delivery overlays.',
      url: page.url(),
    });
    await dismissAmazonOverlaysIfPresent();
    await wait(1500);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);
    await dismissAmazonOverlaysIfPresent();

    const overlayState = await dismissAmazonOverlaysIfPresent();
    if (overlayState.blocked) {
      upsertScanStep({
        key: 'amazon_overlays',
        label: 'Dismiss Amazon overlays',
        status: 'failed',
        message: overlayState.message || 'Amazon page remained blocked by overlays.',
        url: page.url(),
      });
      return {
        status: 'failed',
        asin: null,
        title: null,
        price: null,
        url: page.url(),
        description: null,
        matchedImageId: toText(matchedImageId),
        currentUrl: page.url(),
        message: overlayState.message || 'Amazon page remained blocked by overlays.',
        stage: 'amazon_overlay_blocked',
      };
    }
    upsertScanStep({
      key: 'amazon_overlays',
      label: 'Dismiss Amazon overlays',
      status: 'completed',
      message: 'Amazon cookie and delivery overlays cleared.',
      url: page.url(),
    });
    await emitProgress({
      stage: 'amazon_overlays',
      message: 'Amazon cookie and delivery overlays cleared.',
    });
    upsertScanStep({
      key: 'amazon_content_ready',
      label: 'Wait for Amazon product content',
      status: 'running',
      message: 'Waiting for Amazon product content to become visible.',
      url: page.url(),
    });
    const productContentReady = await waitForAmazonProductContent();
    if (!productContentReady) {
      upsertScanStep({
        key: 'amazon_content_ready',
        label: 'Wait for Amazon product content',
        status: 'failed',
        message: 'Amazon product content did not become available after overlays were cleared.',
        url: page.url(),
      });
      return {
        status: 'failed',
        asin: null,
        title: null,
        price: null,
        url: page.url(),
        description: null,
        matchedImageId: toText(matchedImageId),
        currentUrl: page.url(),
        message: 'Amazon product content did not become available after overlays were cleared.',
        stage: 'amazon_content_unavailable',
      };
    }
    upsertScanStep({
      key: 'amazon_content_ready',
      label: 'Wait for Amazon product content',
      status: 'completed',
      message: 'Amazon product content became visible.',
      url: page.url(),
    });
    await emitProgress({
      stage: 'amazon_content_ready',
      message: 'Amazon product content became visible.',
    });
    upsertScanStep({
      key: 'amazon_extract',
      label: 'Extract Amazon details',
      status: 'running',
      message: 'Extracting ASIN, title, price, URL, and description.',
      url: page.url(),
    });

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

    upsertScanStep({
      key: 'amazon_extract',
      label: 'Extract Amazon details',
      status: asin ? 'completed' : 'failed',
      message: asin
        ? 'Extracted Amazon ASIN ' + asin + '.'
        : 'Amazon page opened but ASIN could not be extracted.',
      url: currentUrl,
    });

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
    upsertScanStep({
      key: 'validate',
      label: 'Validate scan input',
      status: 'running',
      message: 'Validating scan request.',
      url: page.url(),
    });
    if (imageCandidates.length === 0) {
      upsertScanStep({
        key: 'validate',
        label: 'Validate scan input',
        status: 'failed',
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
        return { uploaded: false, captchaRequired: false, error: message };
      });

      if (!uploadResult.uploaded) {
        if (uploadResult.captchaRequired) {
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

      const amazonCandidateResult = await collectAmazonCandidates();
      if (amazonCandidateResult.captchaRequired) {
        return;
      }
      const amazonCandidates = amazonCandidateResult.candidates;
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

        if (extracted.status === 'failed') {
          lastAmazonCandidateError = extracted.message;
          log('amazon.scan.amazon_overlay_blocked', {
            candidateId,
            amazonCandidateUrl,
            error: extracted.message,
          });
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
