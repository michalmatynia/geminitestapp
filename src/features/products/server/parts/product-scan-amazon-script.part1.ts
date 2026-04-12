export const AMAZON_REVERSE_IMAGE_SCAN_SCRIPT_PART_1 = String.raw`export default async function run({
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
  const CAPTCHA_STABLE_CLEAR_WINDOW_MS = 10000;
  const scanSteps = [];
  const nowIso = () => new Date().toISOString();
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
    if (normalizedKey.startsWith('google_')) {
      return 'google_lens';
    }
    if (normalizedKey.startsWith('amazon_')) {
      return 'amazon';
    }
    if (normalizedKey.startsWith('product_')) {
      return 'product';
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
  const resolveStepIdentity = (key, attempt, inputSource, candidateId = null) =>
    String(toText(key) || '') +
    '::' +
    String(resolveComparableAttempt(attempt)) +
    '::' +
    String(toText(inputSource) || 'none') +
    '::' +
    String(toText(candidateId) || 'none');

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
        resolveStepIdentity(entry.key, entry.attempt, entry.inputSource, entry.candidateId) ===
        resolveStepIdentity(key, stepAttempt, normalizedInputSource, input?.candidateId)
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

  const readSelectedGoogleLensFileState = async (inputLocator) => {
    const fallbackState = {
      fileCount: 0,
      fileName: null,
      fileSize: null,
    };

    try {
      return (
        await inputLocator.evaluate((node) => {
          if (!(node instanceof HTMLInputElement)) {
            return {
              fileCount: 0,
              fileName: null,
              fileSize: null,
            };
          }

          const file = node.files && node.files[0] ? node.files[0] : null;
          return {
            fileCount: node.files ? node.files.length : 0,
            fileName: file && typeof file.name === 'string' ? file.name : null,
            fileSize: file && typeof file.size === 'number' ? file.size : null,
          };
        })
      ) || fallbackState;
    } catch {
      return fallbackState;
    }
  };

  const buildGoogleUploadArtifactKey = (stage, candidateId, candidateAttempt) => {
    const normalizedStage =
      toText(stage)
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'state';
    const normalizedCandidate =
      toText(candidateId)
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'candidate';
    return [
      'amazon-scan-google-upload',
      normalizedStage,
      normalizedCandidate,
      'attempt-' + String(resolveComparableAttempt(candidateAttempt)),
    ].join('-');
  };

  const captureGoogleUploadArtifacts = async (stage, candidateId, candidateAttempt) => {
    const artifactKey = buildGoogleUploadArtifactKey(stage, candidateId, candidateAttempt);
    if (typeof artifacts?.screenshot === 'function') {
      await artifacts.screenshot(artifactKey).catch(() => undefined);
    }
    if (typeof artifacts?.html === 'function') {
      await artifacts.html(artifactKey).catch(() => undefined);
    }
    return artifactKey;
  };

  const GOOGLE_LENS_RESULT_HINT_SELECTORS = [
    'a[href*="amazon."]',
    '#search a[href]',
    '#rso a[href]',
    'div.g a[href]',
    'main a[href]',
    '[data-lpage]',
    'a[href*="udm=44"]',
    'a[href*="udm=48"]',
    'a[href*="/imgres"]',
    '#islrg img',
    'img[src^="blob:"]',
    'img[src^="data:image/"]',
  ];
  const GOOGLE_LENS_RESULT_SHELL_SELECTORS = [
    'button[aria-label*="Edit visual search"]',
    'img[alt*="Visually searched image"]',
    'main h2',
    '#search',
    '#rso',
    '#islrg',
    '[data-lpage]',
    'div.g',
  ];
  const GOOGLE_LENS_PROCESSING_INDICATOR_SELECTORS = [
    '[role="progressbar"]',
    '[aria-busy="true"]',
  ];
  const GOOGLE_LENS_PROCESSING_TEXT_HINTS = [
    'uploading',
    'searching',
    'looking for matches',
    'finding results',
  ];
  const GOOGLE_LENS_RESULT_TEXT_HINTS = [
    'visual matches',
    'exact matches',
    'about this image',
    'search results',
    'edit visual search',
  ];
  const GOOGLE_LENS_FILE_INPUT_SELECTORS = [
    'input[type="file"][accept*="image"]',
    'input[type="file"]',
  ];
  const GOOGLE_LENS_ENTRY_TRIGGER_SELECTORS = [
    'div[aria-label="Search by image"]',
    'button[aria-label="Search by image"]',
    'div[aria-label="Search with an image"]',
    'button[aria-label="Search with an image"]',
    'div[role="button"][aria-label*="image"]',
    'button[aria-label*="image"]',
    'div[role="button"]:has-text("Search by image")',
    'button:has-text("Search by image")',
    'div[role="button"]:has-text("Search with an image")',
    'button:has-text("Search with an image")',
    '[data-base-uri="/searchbyimage"]',
  ];
  const GOOGLE_LENS_UPLOAD_TAB_SELECTORS = [
    'button:has-text("Upload an image")',
    'button:has-text("Upload image")',
    'button:has-text("Upload a file")',
    'button:has-text("Upload file")',
    'div[role="tab"]:has-text("Upload")',
    'div[role="tab"]:has-text("Upload an image")',
    'div[role="tab"]:has-text("Upload a file")',
    'button:has-text("upload")',
  ];
  const GOOGLE_CONSENT_CONTROL_SELECTOR =
    'button, [role="button"], input[type="submit"], input[type="button"]';
  const GOOGLE_CONSENT_ACCEPT_SELECTORS = [
    'button:has-text("Accept all cookies")',
    'button:has-text("Accept all")',
    'button:has-text("I agree")',
    'button:has-text("Continue to Google")',
    'button:has-text("Zaakceptuj")',
    'button:has-text("Akceptuj")',
    'button:has-text("Zgadzam")',
    'button:has-text("Kontynuuj")',
    'button[aria-label*="Accept"]',
    'button[aria-label*="agree"]',
    'form[action*="consent"] button',
    'form[action*="save"] button',
  ];
  const GOOGLE_CONSENT_SURFACE_TEXT_HINTS = [
    'before you continue',
    'before you continue to google',
    'google uses cookies',
    'cookies',
    'cookie',
    'privacy',
    'terms',
    'consent',
    'zanim przejdziesz',
    'wykorzystuje pliki cookie',
    'zasady prywatnosci',
  ];
  const GOOGLE_CONSENT_ACCEPT_TEXT_HINTS = [
    'accept all',
    'accept everything',
    'i agree',
    'agree',
    'accept',
    'continue to google',
    'got it',
    'zaakceptuj',
    'akceptuj wszystko',
    'zgadzam sie',
    'przejdz do google',
    'kontynuuj',
  ];
  const GOOGLE_CONSENT_REJECT_TEXT_HINTS = [
    'reject all',
    'reject',
    'decline',
    'manage options',
    'more options',
    'customize',
    'settings',
    'nie zgadzam',
    'odrzuc',
    'zarzadzaj',
    'ustawienia',
  ];

  const normalizeComparableText = (value) =>
    (toText(value) || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const looksLikeGoogleConsentUrl = (value) => {
    const normalized = normalizeComparableText(value);
    return (
      normalized.includes('consent.google') ||
      normalized.includes('/consent') ||
      normalized.includes('before-you-continue')
    );
  };

  const frameLooksLikeGoogleConsentSurface = async (frame) => {
    const frameUrl = frame.url();
    if (looksLikeGoogleConsentUrl(frameUrl)) {
      return {
        detected: true,
        frameUrl,
      };
    }

    const hasConsentForm =
      (await frame
        .locator(
          'form[action*="consent"], form[action*="save"], form[action*="cookie"], form[action*="privacy"]'
        )
        .count()
        .catch(() => 0)) > 0;
    if (hasConsentForm) {
      return {
        detected: true,
        frameUrl,
      };
    }

    const bodyText = normalizeComparableText(
      await frame.locator('body').first().textContent().catch(() => null)
    );
    const detected = GOOGLE_CONSENT_SURFACE_TEXT_HINTS.some((hint) => bodyText.includes(hint));

    return {
      detected,
      frameUrl,
    };
  };

  const listGoogleConsentFrames = async () => {
    const matches = [];
    for (const frame of page.frames()) {
      const state = await frameLooksLikeGoogleConsentSurface(frame).catch(() => ({
        detected: false,
        frameUrl: frame.url(),
      }));
      if (state.detected) {
        matches.push({
          frame,
          frameUrl: state.frameUrl,
        });
      }
    }
    return matches;
  };

  const findGoogleConsentAcceptControl = async (frame) => {
    for (const selector of GOOGLE_CONSENT_ACCEPT_SELECTORS) {
      const locator = frame.locator(selector).first();
      if ((await locator.count().catch(() => 0)) === 0) {
        continue;
      }
      if (!(await locator.isVisible().catch(() => false))) {
        continue;
      }
      return {
        locator,
        label: selector,
        frameUrl: frame.url(),
      };
    }

    const candidateControls = await frame
      .locator(GOOGLE_CONSENT_CONTROL_SELECTOR)
      .evaluateAll(
        (elements, hints) => {
          const normalize = (value) =>
            (typeof value === 'string' ? value : '')
              .normalize('NFKD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim()
              .toLowerCase();
          const acceptHints = Array.isArray(hints?.accept) ? hints.accept : [];
          const rejectHints = Array.isArray(hints?.reject) ? hints.reject : [];
          return elements
            .map((element, index) => {
              if (!(element instanceof HTMLElement)) {
                return null;
              }
              const text = normalize(
                [
                  element.innerText,
                  element.textContent,
                  element.getAttribute('aria-label'),
                  element.getAttribute('title'),
                  element.getAttribute('value'),
                  element.getAttribute('name'),
                  element.getAttribute('id'),
                ]
                  .filter(Boolean)
                  .join(' ')
              );
              if (!text) {
                return null;
              }
              const disabled =
                element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true';
              if (disabled) {
                return null;
              }
              const style = window.getComputedStyle(element);
              const visible =
                style.visibility !== 'hidden' &&
                style.display !== 'none' &&
                element.getBoundingClientRect().width > 0 &&
                element.getBoundingClientRect().height > 0;
              if (!visible) {
                return null;
              }
              if (rejectHints.some((hint) => text.includes(hint))) {
                return null;
              }
              let score = 0;
              if (text.includes('accept all') || text.includes('akceptuj wszystko')) {
                score += 8;
              }
              if (text.includes('i agree') || text.includes('zgadzam sie')) {
                score += 7;
              }
              if (text.includes('continue to google') || text.includes('przejdz do google')) {
                score += 6;
              }
              if (acceptHints.some((hint) => text.includes(hint))) {
                score += 4;
              }
              const formAction = normalize(element.closest('form')?.getAttribute('action') || '');
              if (formAction.includes('consent') || formAction.includes('save')) {
                score += 2;
              }
              return score > 0
                ? {
                    index,
                    label: text,
                    score,
                  }
                : null;
            })
            .filter(Boolean)
            .sort((left, right) => right.score - left.score);
        },
        {
          accept: GOOGLE_CONSENT_ACCEPT_TEXT_HINTS,
          reject: GOOGLE_CONSENT_REJECT_TEXT_HINTS,
        }
      )
      .catch(() => []);

    const bestCandidate = Array.isArray(candidateControls) ? candidateControls[0] : null;
    if (!bestCandidate || typeof bestCandidate.index !== 'number') {
      return null;
    }

    return {
      locator: frame.locator(GOOGLE_CONSENT_CONTROL_SELECTOR).nth(bestCandidate.index),
      label: toText(bestCandidate.label) || 'heuristic_accept_control',
      frameUrl: frame.url(),
    };
  };

  const isGoogleConsentPresent = async () => {
    const consentFrames = await listGoogleConsentFrames();
    return consentFrames.length > 0;
  };

  const isGoogleLensUploadAdvancedUrl = (startingUrl, currentUrl) => {
    const normalizedStartingUrl = toText(startingUrl);
    const normalizedCurrentUrl = toText(currentUrl);
    if (!normalizedCurrentUrl) {
      return false;
    }
    if (!normalizedStartingUrl) {
      return true;
    }

    return normalizedCurrentUrl !== normalizedStartingUrl;
  };

  const isGoogleImagesUploadEntryUrl = (value) => {
    const normalizedValue = toText(value);
    if (!normalizedValue) {
      return false;
    }

    try {
      const parsed = new URL(normalizedValue);
      const host = parsed.hostname.toLowerCase();
      const pathname = parsed.pathname || '/';
      if (host === 'images.google.com' && (pathname === '/' || pathname === '')) {
        return true;
      }
      if (host === 'lens.google.com' && pathname.startsWith('/upload')) {
        return true;
      }
      if (
        host.startsWith('www.google.') &&
        (pathname === '/imghp' || pathname === '/images')
      ) {
        return true;
      }
    } catch {
      return false;
    }

    return false;
  };

  const waitForGoogleLensResultState = async (startingUrl, inputLocator = null, stepMeta = null) => {
    let deadline = Date.now() + 25000;
    let extendedForProcessing = false;
    let nextProcessingProgressAt = Date.now() + 5000;
    let lastProcessingState = null;
    let inputWasReplaced = false;
    while (Date.now() < deadline) {
      const currentUrl = page.url();
      if (await isGoogleConsentPresent().catch(() => false)) {
        const consentState = await clickGoogleConsentIfPresent().catch(() => null);
        if (consentState?.resolved) {
          await wait(600);
          continue;
        }
      }
      if (isGoogleLensUploadAdvancedUrl(startingUrl, currentUrl)) {
        return {
          advanced: true,
          currentUrl,
          reason: 'url_changed',
          processingState: lastProcessingState,
        };
      }

      const processingState = await readGoogleLensProcessingState();
      if (processingState.processingVisible || processingState.resultShellVisible) {
        lastProcessingState = processingState;
      }

      const hasResultHints = await Promise.any(
        GOOGLE_LENS_RESULT_HINT_SELECTORS.map(async (selector) => {
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

      if (hasResultHints) {
        return {
          advanced: true,
          currentUrl,
          reason: 'result_hints',
          processingState,
        };
      }

      const captchaState = await detectGoogleLensCaptcha();
      if (captchaState.detected) {
        return {
          advanced: true,
          currentUrl: captchaState.currentUrl,
          reason: 'captcha',
          processingState,
        };
      }

      if (processingState.resultShellVisible) {
        return {
          advanced: true,
          currentUrl,
          reason: 'results_shell_visible',
          processingState,
        };
      }

      if (inputLocator) {
        const uploadInputStillPresent = await inputLocator.count().catch(() => 0);
        if (uploadInputStillPresent === 0) {
          inputWasReplaced = true;
          if (!isGoogleImagesUploadEntryUrl(currentUrl)) {
            return {
              advanced: true,
              currentUrl,
              reason: 'input_replaced',
              processingState,
            };
          }
        }
      }

      if (processingState.processingVisible) {
        if (!extendedForProcessing) {
          deadline = Math.max(deadline, Date.now() + 35000);
          extendedForProcessing = true;
        }
        if (Date.now() >= nextProcessingProgressAt) {
          nextProcessingProgressAt = Date.now() + 5000;
          if (stepMeta) {
            upsertScanStep({
              key: 'google_upload',
              label: 'Upload image to Google Lens',
              attempt: stepMeta.attempt,
              candidateId: stepMeta.candidateId,
              inputSource: stepMeta.inputSource,
              status: 'running',
              resultCode: 'upload_processing',
              message: 'Google Lens accepted the image and is still processing it.',
              url: currentUrl,
              details: [
                { label: 'Processing text', value: processingState.processingText },
                { label: 'Progress indicator', value: processingState.progressIndicatorSelector },
                { label: 'Result shell', value: processingState.resultShellSelector },
              ],
            });
          }
          await emitProgress({
            stage: 'google_upload',
            currentUrl,
            message: 'Google Lens accepted the image and is still processing it.',
          });
        }
      }

      await wait(500);
    }

    return {
      advanced: false,
      currentUrl: page.url(),
      reason: lastProcessingState?.processingVisible
        ? 'upload_processing_timeout'
        : inputWasReplaced || isGoogleImagesUploadEntryUrl(page.url())
          ? 'lens_result_page_not_ready'
          : 'timeout',
      processingState: lastProcessingState,
    };
  };

  const verifyGoogleLensFileUploadAccepted = async (inputLocator, startingUrl, stepMeta = null) => {
    const selectedFileState = await readSelectedGoogleLensFileState(inputLocator);
    const selectionConfirmed =
      selectedFileState.fileCount >= 1 &&
      typeof selectedFileState.fileSize === 'number' &&
      selectedFileState.fileSize > 0;

    const transitionState = await waitForGoogleLensResultState(startingUrl, inputLocator, stepMeta);
    if (!selectionConfirmed && !transitionState.advanced) {
      return {
        accepted: false,
        error: 'Google Lens did not receive a usable image file upload.',
        selectedFileState,
        transitionState,
      };
    }
    if (!transitionState.advanced) {
      return {
        accepted: false,
        error:
          transitionState.reason === 'upload_processing_timeout'
            ? 'Google Lens accepted the image but stayed in the upload processing state without producing results.'
            : transitionState.reason === 'lens_result_page_not_ready'
              ? 'Google Lens closed the upload entry but did not transition into a usable result page.'
            : 'Google Lens did not advance after receiving the image upload.',
        selectedFileState,
        transitionState,
      };
    }

    return {
      accepted: true,
      error: null,
      selectedFileState,
      transitionState,
    };
  };

  const verifyGoogleLensUrlSubmissionAccepted = async (startingUrl, stepMeta = null) => {
    const transitionState = await waitForGoogleLensResultState(startingUrl, null, stepMeta);
    if (!transitionState.advanced) {
      return {
        accepted: false,
        error:
          transitionState.reason === 'upload_processing_timeout'
            ? 'Google Lens accepted the image URL but stayed in the upload processing state without producing results.'
            : transitionState.reason === 'lens_result_page_not_ready'
              ? 'Google Lens did not transition from the image submission entry into a usable result page.'
            : 'Google Lens did not advance after receiving the image URL.',
        transitionState,
      };
    }

    return {
      accepted: true,
      error: null,
      transitionState,
    };
  };

  const listGoogleLensSearchScopes = () => {
    const mainFrame = typeof page.mainFrame === 'function' ? page.mainFrame() : null;
    const childFrames = page
      .frames()
      .filter((frame) => !mainFrame || frame !== mainFrame)
      .map((frame) => ({
        target: frame,
        scopeType: 'frame',
        frameUrl: frame.url(),
      }));

    return [
      {
        target: page,
        scopeType: 'page',
        frameUrl: page.url(),
      },
      ...childFrames,
    ];
  };

  const findFirstVisibleSelector = async (selectors) => {
    for (const scope of listGoogleLensSearchScopes()) {
      for (const selector of selectors) {
        const locator = scope.target.locator(selector).first();
        if ((await locator.count().catch(() => 0)) === 0) {
          continue;
        }
        const visible = await locator.isVisible().catch(() => false);
        if (visible) {
          return {
            selector,
            scopeType: scope.scopeType,
            frameUrl: scope.frameUrl,
          };
        }
      }
    }

    return null;
  };

  const findGoogleLensProcessingText = async () => {
    for (const scope of listGoogleLensSearchScopes()) {
      const visibleText = (
        toText(await scope.target.locator('body').first().textContent().catch(() => null)) || ''
      ).toLowerCase();
      if (!visibleText) {
        continue;
      }

      const matchedHint = GOOGLE_LENS_PROCESSING_TEXT_HINTS.find((hint) =>
        visibleText.includes(hint)
      );
      if (!matchedHint) {
        continue;
      }

      return {
        hint: matchedHint,
        scopeType: scope.scopeType,
        frameUrl: scope.frameUrl,
      };
    }

    return null;
  };

  const findGoogleLensResultText = async () => {
    for (const scope of listGoogleLensSearchScopes()) {
      const visibleText = (
        toText(await scope.target.locator('body').first().textContent().catch(() => null)) || ''
      ).toLowerCase();
      if (!visibleText) {
        continue;
      }

      const matchedHint = GOOGLE_LENS_RESULT_TEXT_HINTS.find((hint) =>
        visibleText.includes(hint)
      );
      if (!matchedHint) {
        continue;
      }

      return {
        hint: matchedHint,
        scopeType: scope.scopeType,
        frameUrl: scope.frameUrl,
      };
    }

    return null;
  };

  const readGoogleLensProcessingState = async () => {
    const progressIndicatorState = await findFirstVisibleSelector(
      GOOGLE_LENS_PROCESSING_INDICATOR_SELECTORS
    );
    const resultShellState = await findFirstVisibleSelector(GOOGLE_LENS_RESULT_SHELL_SELECTORS);
    const processingTextState = await findGoogleLensProcessingText();
    const resultTextState = await findGoogleLensResultText();

    return {
      currentUrl: page.url(),
      processingVisible: Boolean(progressIndicatorState || processingTextState),
      progressIndicatorVisible: Boolean(progressIndicatorState),
      progressIndicatorSelector: progressIndicatorState?.selector ?? null,
      progressIndicatorScopeType: progressIndicatorState?.scopeType ?? null,
      progressIndicatorFrameUrl: progressIndicatorState?.frameUrl ?? null,
      processingText: processingTextState?.hint ?? null,
      processingTextScopeType: processingTextState?.scopeType ?? null,
      processingTextFrameUrl: processingTextState?.frameUrl ?? null,
      resultShellVisible: Boolean(resultShellState || resultTextState),
      resultShellSelector: resultShellState?.selector ?? resultTextState?.hint ?? null,
      resultShellScopeType: resultShellState?.scopeType ?? resultTextState?.scopeType ?? null,
      resultShellFrameUrl: resultShellState?.frameUrl ?? resultTextState?.frameUrl ?? null,
    };
  };

  const resolveGoogleLensFileInput = async () => {
    for (const scope of listGoogleLensSearchScopes()) {
      for (const selector of GOOGLE_LENS_FILE_INPUT_SELECTORS) {
        const locator = scope.target.locator(selector);
        const candidateCount = await locator.count().catch(() => 0);
        if (candidateCount < 1) {
          continue;
        }

        const bestInputIndex = await locator
          .evaluateAll((nodes) => {
            const describeVisibility = (node) => {
              if (!(node instanceof HTMLElement)) {
                return false;
              }
              const style = window.getComputedStyle(node);
              const rect = node.getBoundingClientRect();
              return (
                style.visibility !== 'hidden' &&
                style.display !== 'none' &&
                rect.width > 0 &&
                rect.height > 0
              );
            };

            let bestIndex = -1;
            let bestScore = -1;
            nodes.forEach((node, index) => {
              if (!(node instanceof HTMLInputElement)) {
                return;
              }
              if (node.disabled || node.getAttribute('aria-disabled') === 'true') {
                return;
              }
              let score = 0;
              if (describeVisibility(node)) {
                score += 8;
              }
              const acceptValue = (typeof node.accept === 'string' ? node.accept : '').toLowerCase();
              if (!acceptValue || acceptValue.includes('image')) {
                score += 4;
              }
              if (
                node.closest('[role="dialog"]') ||
                node.closest('[role="tabpanel"]') ||
                node.closest('c-wiz') ||
                node.closest('form')
              ) {
                score += 2;
              }
              if (node.files && node.files.length > 0) {
                score += 1;
              }
              if (score > bestScore) {
                bestIndex = index;
                bestScore = score;
              }
            });
            return bestIndex;
          })
          .catch(() => -1);

        if (typeof bestInputIndex === 'number' && bestInputIndex >= 0) {
          const inputLocator = locator.nth(bestInputIndex);
          return {
            ready: true,
            inputLocator,
            currentUrl: page.url(),
            selector,
            scopeType: scope.scopeType,
            frameUrl: scope.frameUrl,
            inputCount: candidateCount,
          };
        }
      }
    }

    return {
      ready: false,
      inputLocator: null,
      currentUrl: page.url(),
      selector: null,
      scopeType: null,
      frameUrl: null,
      inputCount: 0,
    };
  };

  const describeGoogleLensUploadEntryState = async () => {
    const fileInputState = await resolveGoogleLensFileInput();
    const fileInputVisible =
      fileInputState.ready && fileInputState.inputLocator
        ? await fileInputState.inputLocator.isVisible().catch(() => false)
        : false;
    const searchTriggerState = await findFirstVisibleSelector(
      GOOGLE_LENS_ENTRY_TRIGGER_SELECTORS
    );
    const uploadTabState = await findFirstVisibleSelector(
      GOOGLE_LENS_UPLOAD_TAB_SELECTORS
    );
    const resultHintsVisible = Boolean(
      await findFirstVisibleSelector(GOOGLE_LENS_RESULT_HINT_SELECTORS)
    );
    const processingState = await readGoogleLensProcessingState();
    const captchaState = await detectGoogleLensCaptcha();
    const consentFrames = await listGoogleConsentFrames().catch(() => []);
    const consentPresent = Array.isArray(consentFrames) && consentFrames.length > 0;
    const consentFrameUrl = consentPresent ? toText(consentFrames[0]?.frameUrl) : null;

    return {
      currentUrl: page.url(),
      fileInputCount: fileInputState.inputCount,
      fileInputVisible,
      fileInputSelector: fileInputState.selector,
      fileInputScopeType: fileInputState.scopeType,
      fileInputFrameUrl: fileInputState.frameUrl,
      searchTriggerSelector: searchTriggerState?.selector ?? null,
      searchTriggerScopeType: searchTriggerState?.scopeType ?? null,
      searchTriggerFrameUrl: searchTriggerState?.frameUrl ?? null,
      uploadTabSelector: uploadTabState?.selector ?? null,
      uploadTabScopeType: uploadTabState?.scopeType ?? null,
      uploadTabFrameUrl: uploadTabState?.frameUrl ?? null,
      resultHintsVisible,
      processingVisible: processingState.processingVisible,
      progressIndicatorVisible: processingState.progressIndicatorVisible,
      progressIndicatorSelector: processingState.progressIndicatorSelector,
      progressIndicatorScopeType: processingState.progressIndicatorScopeType,
      progressIndicatorFrameUrl: processingState.progressIndicatorFrameUrl,
      processingText: processingState.processingText,
      processingTextScopeType: processingState.processingTextScopeType,
      processingTextFrameUrl: processingState.processingTextFrameUrl,
      resultShellVisible: processingState.resultShellVisible,
      resultShellSelector: processingState.resultShellSelector,
      resultShellScopeType: processingState.resultShellScopeType,
      resultShellFrameUrl: processingState.resultShellFrameUrl,
      captchaDetected: captchaState.detected,
      consentPresent,
      consentFrameUrl,
    };
  };

  const resolveGoogleLensUploadEntryFailure = (entryState) => {
    if (entryState?.captchaDetected) {
      return {
        resultCode: 'captcha_required',
        message: CAPTCHA_REQUIRED_MESSAGE,
      };
    }

    if (entryState?.consentPresent) {
      return {
        resultCode: 'google_consent_blocking',
        message: 'Google consent dialog stayed open and blocked access to Google Lens upload.',
      };
    }

    if (entryState?.searchTriggerSelector || entryState?.uploadTabSelector) {
      return {
        resultCode: 'lens_upload_entry_missing',
        message: 'Google Lens file upload entry did not become available.',
      };
    }

    return {
      resultCode: 'lens_ui_variant_unknown',
      message: 'Google reverse image search entry flow did not match the expected Google Images UI.',
    };
  };

  const waitForGoogleLensFileInput = async () => {
    const waitForInput = async (timeoutMs) =>
      await (async () => {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
          const state = await resolveGoogleLensFileInput();
          if (state.ready) {
            return state;
          }
          await wait(500);
        }
        return null;
      })();

    const initialState = await waitForInput(2500);
    if (initialState?.ready) {
      return initialState;
    }

    await clickGoogleConsentIfPresent().catch(() => undefined);
    await clickFirstVisible(GOOGLE_LENS_ENTRY_TRIGGER_SELECTORS).catch(() => undefined);

    const postTriggerState = await waitForInput(4000);
    if (postTriggerState?.ready) {
      return postTriggerState;
    }

    await clickGoogleConsentIfPresent().catch(() => undefined);
    await clickFirstVisible(GOOGLE_LENS_UPLOAD_TAB_SELECTORS).catch(() => undefined);

    const readyState = await waitForInput(7000);
    const ready = Boolean(readyState?.ready);
    const entryState = ready ? null : await describeGoogleLensUploadEntryState();

    return {
      ready,
      inputLocator: readyState?.inputLocator ?? null,
      currentUrl: page.url(),
      selector: readyState?.selector ?? null,
      scopeType: readyState?.scopeType ?? null,
      frameUrl: readyState?.frameUrl ?? null,
      inputCount: readyState?.inputCount ?? 0,
      entryState,
    };
  };

  const buildGoogleUploadResult = (input = {}) => ({
    submitted: input.submitted === true,
    advanced: input.advanced === true,
    captchaRequired: input.captchaRequired === true,
    captchaEncountered: input.captchaEncountered === true,
    error: toText(input.error),
    retryRecommended: input.retryRecommended === true,
    inputSourceUsed: toText(input.inputSourceUsed),
    failureCode: toText(input.failureCode),
    transitionReason: toText(input.transitionReason),
  });

  const openGoogleLensForUpload = async ({
    candidateId,
    candidateAttempt,
    inputSource,
    destinationUrl,
    openingMessage,
    openedMessage,
    progressMessage,
    fallbackContext = null,
    details = [],
  }) => {
    const sharedDetails = mergeStepDetails(details, fallbackContext?.details);
    upsertScanStep({
      key: 'google_lens_open',
      label: 'Open Google Lens',
      attempt: candidateAttempt,
      candidateId,
      inputSource,
      status: 'running',
      retryOf: toText(fallbackContext?.retryOf),
      resultCode: 'lens_open_start',
      message: openingMessage,
      url: destinationUrl,
      warning: toText(fallbackContext?.warning),
      details: sharedDetails,
    });
    await page.goto(destinationUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await clickGoogleConsentIfPresent();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
    upsertScanStep({
      key: 'google_lens_open',
      label: 'Open Google Lens',
      attempt: candidateAttempt,
      candidateId,
      inputSource,
      status: 'completed',
      retryOf: toText(fallbackContext?.retryOf),
      resultCode: 'lens_opened',
      message: openedMessage,
      url: page.url(),
      warning: toText(fallbackContext?.warning),
      details: sharedDetails,
    });
    await emitProgress({
      stage: 'google_lens',
      message: progressMessage || openedMessage,
    });
    return {
      sharedDetails,
      currentUrl: page.url(),
    };
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

  const scoreAmazonCandidateUrl = (value) => {
    const normalized = toText(value);
    if (!normalized) return -1;

    let score = rankAmazonCandidateUrl(normalized) * 100;
    if (extractAsin(normalized)) {
      score += 50;
    }
    if (/\/dp\//i.test(normalized)) {
      score += 30;
    } else if (/\/gp\/product\//i.test(normalized)) {
      score += 24;
    } else if (/\/gp\/aw\/d\//i.test(normalized)) {
      score += 20;
    } else if (/\/product\//i.test(normalized)) {
      score += 16;
    }
    if (/\/ref=/i.test(normalized)) {
      score -= 2;
    }
    if (/[?&](psc|smid|pd_rd_[^=]+)=/i.test(normalized)) {
      score -= 1;
    }

    return score;
  };

  const GOOGLE_LENS_CANDIDATE_HINT_SELECTORS = [
    'a[href*="amazon."]',
    'a[href*="googleadservices.com"]',
    'a[href*="/imgres"]',
    '[role="listitem"]',
  ];

  const readGoogleLensAmazonCandidates = async () => {
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

    return Array.from(
      new Set(
        hrefs
          .map((href) => normalizeAmazonUrl(href))
          .filter((href) => typeof href === 'string' && href.length > 0)
      )
    )
      .map((candidateUrl) => ({
        url: candidateUrl,
        score: scoreAmazonCandidateUrl(candidateUrl),
        asin: extractAsin(candidateUrl),
      }))
      .sort(
        (left, right) =>
          right.score - left.score ||
          rankAmazonCandidateUrl(right.url) - rankAmazonCandidateUrl(left.url) ||
          left.url.localeCompare(right.url)
      );
  };

  const waitForGoogleLensCandidateHints = async (timeoutMs = 700) => {
    await Promise.race([
      Promise.any(
        GOOGLE_LENS_CANDIDATE_HINT_SELECTORS.map(async (selector) => {
          const locator = page.locator(selector).first();
          await locator.waitFor({ state: 'visible', timeout: timeoutMs });
          return selector;
        })
      ),
      page.waitForLoadState('networkidle', { timeout: timeoutMs }),
    ]).catch(() => undefined);
  };

  const describeGoogleLensCandidateCollectionState = async () => {
    const currentUrl = page.url();
    const currentUrlLooksLikeUploadEntry = isGoogleImagesUploadEntryUrl(currentUrl);
    const uploadInputVisible = await page
      .locator('input[type="file"]')
      .first()
      .isVisible()
      .catch(() => false);
    const processingState = await readGoogleLensProcessingState();
    const candidateHintsVisible = await Promise.any(
      GOOGLE_LENS_CANDIDATE_HINT_SELECTORS.map(async (selector) => {
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
    const amazonLinkCount = await page.locator('a[href*="amazon."]').count().catch(() => 0);

    return {
      currentUrl,
      uploadInputVisible,
      candidateHintsVisible,
      amazonLinkCount,
      processingVisible: processingState.processingVisible,
      progressIndicatorVisible: processingState.progressIndicatorVisible,
      progressIndicatorSelector: processingState.progressIndicatorSelector,
      processingText: processingState.processingText,
      resultShellVisible: processingState.resultShellVisible,
      resultShellSelector: processingState.resultShellSelector,
      looksLikeUploadEntry:
        !processingState.processingVisible &&
        !processingState.resultShellVisible &&
        (uploadInputVisible ||
          currentUrlLooksLikeUploadEntry ||
          currentUrl.includes('/searchbyimage') ||
          currentUrl === 'https://images.google.com/' ||
          currentUrl === 'https://images.google.com'),
    };
  };

  const clickGoogleConsentIfPresent = async () => {
    let clicked = false;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const consentFrames = await listGoogleConsentFrames();
      if (consentFrames.length === 0) {
        return {
          present: clicked,
          clicked,
          resolved: true,
          currentUrl: page.url(),
        };
      }

      for (const consentFrame of consentFrames) {
        const acceptControl = await findGoogleConsentAcceptControl(consentFrame.frame).catch(
          () => null
        );
        if (!acceptControl) {
          continue;
        }

        await acceptControl.locator.scrollIntoViewIfNeeded().catch(() => undefined);
        const accepted = await acceptControl.locator
          .click({ timeout: 4000 })
          .then(() => true)
          .catch(async () => {
            return await acceptControl.locator
              .evaluate((element) => {
                if (!(element instanceof HTMLElement)) {
                  return false;
                }
                element.click();
                return true;
              })
              .catch(() => false);
          });

        if (!accepted) {
          continue;
        }

        clicked = true;
        log('amazon.scan.google_consent_accepted', {
          currentUrl: page.url(),
          consentFrameUrl: acceptControl.frameUrl,
          control: acceptControl.label,
          attempt: attempt + 1,
        });
        await Promise.race([
          page.waitForLoadState('domcontentloaded', { timeout: 4000 }),
          page.waitForURL((url) => !looksLikeGoogleConsentUrl(String(url)), { timeout: 4000 }),
        ]).catch(() => undefined);
        await wait(1200);
        if (!(await isGoogleConsentPresent().catch(() => false))) {
          return {
            present: true,
            clicked: true,
            resolved: true,
            currentUrl: page.url(),
          };
        }
      }

      await wait(800);
    }

    return {
      present: true,
      clicked,
      resolved: !(await isGoogleConsentPresent().catch(() => true)),
      currentUrl: page.url(),
    };
  };

  const detectGoogleLensCaptcha = async () => {
    const currentUrl = page.url();
    const normalizedUrl = currentUrl.toLowerCase();
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

    for (const scope of listGoogleLensSearchScopes()) {
      const scopeUrl = toText(scope.frameUrl)?.toLowerCase();
      if (scopeUrl && urlHints.some((hint) => scopeUrl.includes(hint))) {
        return {
          detected: true,
          currentUrl,
        };
      }

      for (const selector of challengeSelectors) {
        if ((await scope.target.locator(selector).first().count().catch(() => 0)) > 0) {
          return {
            detected: true,
            currentUrl,
          };
        }
      }

      const bodyText = (
        toText(await scope.target.locator('body').first().textContent().catch(() => null)) || ''
      ).toLowerCase();
      if (bodyText && textHints.some((hint) => bodyText.includes(hint))) {
        return {
          detected: true,
          currentUrl,
        };
      }
    }

    return {
      detected: urlHints.some((hint) => normalizedUrl.includes(hint)),
      currentUrl,
    };
  };

  const readGoogleLensPostCaptchaReadyState = async (stage) => {
    const processingState = await readGoogleLensProcessingState();
    const resultHintState = await findFirstVisibleSelector(GOOGLE_LENS_RESULT_HINT_SELECTORS);
    const shouldAcceptUploadEntry =
      stage == null || stage === 'google_lens' || stage === 'google_lens_open';
    const uploadEntryState = shouldAcceptUploadEntry
      ? {
          fileInputReady: (await resolveGoogleLensFileInput()).ready,
          entryTriggerVisible: Boolean(
            await findFirstVisibleSelector(GOOGLE_LENS_ENTRY_TRIGGER_SELECTORS)
          ),
          uploadTabVisible: Boolean(
            await findFirstVisibleSelector(GOOGLE_LENS_UPLOAD_TAB_SELECTORS)
          ),
        }
      : null;

    const candidateHintsVisible = Boolean(resultHintState);
    const ready =
      processingState.processingVisible ||
      processingState.resultShellVisible ||
      candidateHintsVisible ||
      (shouldAcceptUploadEntry && uploadEntryState
        ? uploadEntryState.fileInputReady ||
          uploadEntryState.entryTriggerVisible ||
          uploadEntryState.uploadTabVisible
        : false);

    let readyReason = null;
    if (processingState.resultShellVisible) {
      readyReason = 'results_shell_visible';
    } else if (candidateHintsVisible) {
      readyReason = 'result_hints_visible';
    } else if (processingState.processingVisible) {
      readyReason = 'processing_visible';
    } else if (uploadEntryState?.fileInputReady) {
      readyReason = 'file_input_ready';
    } else if (uploadEntryState?.uploadTabVisible) {
      readyReason = 'upload_tab_visible';
    } else if (uploadEntryState?.entryTriggerVisible) {
      readyReason = 'entry_trigger_visible';
    }

    return {
      currentUrl: page.url(),
      ready,
      readyReason,
      candidateHintsVisible,
      processingVisible: processingState.processingVisible,
      progressIndicatorSelector: processingState.progressIndicatorSelector,
      processingText: processingState.processingText,
      resultShellVisible: processingState.resultShellVisible,
      resultShellSelector: processingState.resultShellSelector,
      fileInputReady: uploadEntryState?.fileInputReady ?? false,
      entryTriggerVisible: uploadEntryState?.entryTriggerVisible ?? false,
      uploadTabVisible: uploadEntryState?.uploadTabVisible ?? false,
    };
  };

  const handleGoogleLensCaptchaIfPresent = async (stage, stepMeta = {}) => {
    const detected = await detectGoogleLensCaptcha();
    if (!detected.detected) {
      return {
        resolved: true,
        captchaRequired: false,
        captchaEncountered: false,
        currentUrl: detected.currentUrl,
        message: null,
      };
    }

    log('amazon.scan.google_captcha_detected', {
      stage,
      currentUrl: detected.currentUrl,
      allowManualVerification,
    });
    upsertScanStep({
      key: 'google_captcha',
      label: 'Google captcha',
      attempt: stepMeta.attempt,
      candidateId: stepMeta.candidateId,
      inputSource: stepMeta.inputSource,
      status: 'running',
      message: CAPTCHA_WAIT_MESSAGE,
      url: detected.currentUrl,
    });

    if (!allowManualVerification) {
      upsertScanStep({
        key: 'google_captcha',
        label: 'Google captcha',
        attempt: stepMeta.attempt,
        candidateId: stepMeta.candidateId,
        inputSource: stepMeta.inputSource,
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
        captchaEncountered: true,
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
    let stableReadyCount = 0;
    let nextProgressAt = Date.now() + 5000;
    let lastCaptchaDetectedAt = Date.now();
    while (Date.now() < deadline) {
      await wait(1000);
      const currentState = await detectGoogleLensCaptcha();
      if (currentState.detected) {
        lastCaptchaDetectedAt = Date.now();
        stableReadyCount = 0;
        continue;
      }

      const timeSinceLastCaptchaDetection = Date.now() - lastCaptchaDetectedAt;
      if (timeSinceLastCaptchaDetection < CAPTCHA_STABLE_CLEAR_WINDOW_MS) {
        stableReadyCount = 0;
        if (Date.now() >= nextProgressAt) {
          nextProgressAt = Date.now() + 5000;
          upsertScanStep({
            key: 'google_captcha',
            label: 'Google captcha',
            attempt: stepMeta.attempt,
            candidateId: stepMeta.candidateId,
            inputSource: stepMeta.inputSource,
            status: 'running',
            resultCode: 'captcha_stabilizing',
            message:
              'Captcha challenge appears to be clearing. Waiting for Google Lens to stay stable before resuming.',
            url: page.url(),
            details: [
              { label: 'Stable clear window (ms)', value: String(CAPTCHA_STABLE_CLEAR_WINDOW_MS) },
              { label: 'Elapsed clear time (ms)', value: String(timeSinceLastCaptchaDetection) },
            ],
          });
          await emitProgress({
            stage,
            currentUrl: page.url(),
            message:
              'Captcha challenge appears to be clearing. Waiting for Google Lens to stay stable before resuming.',
          });
        }
        continue;
      }

      const readyState = await readGoogleLensPostCaptchaReadyState(stage);
      if (!readyState.ready) {
        stableReadyCount = 0;
        if (Date.now() >= nextProgressAt) {
          nextProgressAt = Date.now() + 5000;
          upsertScanStep({
            key: 'google_captcha',
            label: 'Google captcha',
            attempt: stepMeta.attempt,
            candidateId: stepMeta.candidateId,
            inputSource: stepMeta.inputSource,
            status: 'running',
            resultCode: 'captcha_stabilizing',
            message: 'Captcha challenge looks partially resolved. Waiting for Google Lens to become ready.',
            url: readyState.currentUrl,
            details: [
              { label: 'Ready reason', value: readyState.readyReason },
              { label: 'Processing text', value: readyState.processingText },
              { label: 'Progress indicator', value: readyState.progressIndicatorSelector },
              { label: 'Result shell', value: readyState.resultShellSelector },
            ],
          });
          await emitProgress({
            stage,
            currentUrl: readyState.currentUrl,
            message:
              'Captcha challenge looks partially resolved. Waiting for Google Lens to become ready.',
          });
        }
        continue;
      }

      stableReadyCount += 1;
      if (stableReadyCount < 3) {
        continue;
      }

      await wait(1500);
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);
      const settledState = await detectGoogleLensCaptcha();
      if (settledState.detected) {
        lastCaptchaDetectedAt = Date.now();
        stableReadyCount = 0;
        continue;
      }

      if (Date.now() - lastCaptchaDetectedAt < CAPTCHA_STABLE_CLEAR_WINDOW_MS) {
        stableReadyCount = 0;
        continue;
      }

      const settledReadyState = await readGoogleLensPostCaptchaReadyState(stage);
      if (!settledReadyState.ready) {
        stableReadyCount = 0;
        continue;
      }

      log('amazon.scan.google_captcha_resolved', {
        stage,
        currentUrl: page.url(),
        readyReason: settledReadyState.readyReason,
      });
      upsertScanStep({
        key: 'google_captcha',
        label: 'Google captcha',
        attempt: stepMeta.attempt,
        candidateId: stepMeta.candidateId,
        inputSource: stepMeta.inputSource,
        status: 'completed',
        resultCode: 'captcha_resolved',
        message: 'Captcha resolved. Continuing scan.',
        url: page.url(),
        details: [
          { label: 'Ready reason', value: settledReadyState.readyReason },
          { label: 'Processing text', value: settledReadyState.processingText },
          { label: 'Progress indicator', value: settledReadyState.progressIndicatorSelector },
          { label: 'Result shell', value: settledReadyState.resultShellSelector },
        ],
      });
      return {
        resolved: true,
        captchaRequired: false,
        captchaEncountered: true,
        currentUrl: page.url(),
        message: null,
      };
    }

    upsertScanStep({
      key: 'google_captcha',
      label: 'Google captcha',
      attempt: stepMeta.attempt,
      candidateId: stepMeta.candidateId,
      inputSource: stepMeta.inputSource,
      status: 'failed',
      resultCode: 'captcha_timeout',
      message: 'Google Lens captcha was not resolved before timeout.',
      url: page.url(),
    });

    return {
      resolved: false,
      captchaRequired: false,
      captchaEncountered: true,
      currentUrl: page.url(),
      message: 'Google Lens captcha was not resolved before timeout.',
    };
  };

  const uploadImageCandidateByUrl = async (
    candidateId,
    imageUrl,
    candidateAttempt,
    fallbackContext = null
  ) => {
    let captchaEncountered = false;
    const openState = await openGoogleLensForUpload({
      candidateId,
      candidateAttempt,
      inputSource: 'url',
      destinationUrl:
        'https://www.google.com/searchbyimage?image_url=' +
        encodeURIComponent(imageUrl) +
        '&hl=en',
      openingMessage:
        'Opening Google reverse image search for image ' + (candidateId || 'candidate') + '.',
      openedMessage: 'Google reverse image search opened.',
      fallbackContext,
      details: [{ label: 'Source', value: 'Image URL' }],
    });
    const sharedDetails = openState.sharedDetails;
    upsertScanStep({
      key: 'google_upload',
      label: 'Upload image to Google Lens',
      attempt: candidateAttempt,
      candidateId,
      inputSource: 'url',
      status: 'running',
      retryOf: toText(fallbackContext?.retryOf),
      resultCode: 'url_submit_start',
      message: 'Submitting image URL for Google reverse image search.',
      url: page.url(),
      warning: toText(fallbackContext?.warning),
      details: sharedDetails,
    });
    const urlSubmission = await verifyGoogleLensUrlSubmissionAccepted(openState.currentUrl, {
      attempt: candidateAttempt,
      candidateId,
      inputSource: 'url',
    });
    if (!urlSubmission.accepted) {
      upsertScanStep({
        key: 'google_upload',
        label: 'Upload image to Google Lens',
        attempt: candidateAttempt,
        candidateId,
        inputSource: 'url',
        status: 'failed',
        retryOf: toText(fallbackContext?.retryOf),
        resultCode: 'url_submit_not_advanced',
        message: urlSubmission.error,
        url: page.url(),
        warning:
          toText(fallbackContext?.warning) ||
          'Retryable URL handoff. Local file upload can be attempted next.',
        details: mergeStepDetails(
          sharedDetails,
          [{ label: 'Transition reason', value: urlSubmission.transitionState?.reason }],
          [{ label: 'Fallback available', value: 'Local file' }]
        ),
      });
      return buildGoogleUploadResult({
        submitted: false,
        advanced: false,
        captchaRequired: false,
        error: urlSubmission.error,
        retryRecommended: true,
        inputSourceUsed: 'url',
        failureCode: 'url_submit_not_advanced',
        transitionReason: urlSubmission.transitionState?.reason,
      });
    }
    await page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => undefined);
    const uploadByUrlCaptchaState = await handleGoogleLensCaptchaIfPresent('google_upload', {
      attempt: candidateAttempt,
      candidateId,
      inputSource: 'url',
    });
    captchaEncountered = captchaEncountered || uploadByUrlCaptchaState.captchaEncountered === true;
    if (!uploadByUrlCaptchaState.resolved) {
      upsertScanStep({
        key: 'google_upload',
        label: 'Upload image to Google Lens',
        attempt: candidateAttempt,
        candidateId,
        inputSource: 'url',
        status: uploadByUrlCaptchaState.captchaRequired ? 'running' : 'failed',
        retryOf: toText(fallbackContext?.retryOf),
        resultCode: uploadByUrlCaptchaState.captchaRequired ? 'captcha_required' : 'url_submit_failed',
        message: uploadByUrlCaptchaState.message,
        url: uploadByUrlCaptchaState.currentUrl,
        warning: toText(fallbackContext?.warning),
        details: sharedDetails,
      });
      return buildGoogleUploadResult({
        submitted: false,
        advanced: true,
        captchaRequired: uploadByUrlCaptchaState.captchaRequired,
        captchaEncountered,
        error: uploadByUrlCaptchaState.message,
        retryRecommended: false,
        inputSourceUsed: 'url',
        failureCode: uploadByUrlCaptchaState.captchaRequired ? 'captcha_required' : 'captcha_timeout',
        transitionReason: urlSubmission.transitionState?.reason,
      });
    }
    upsertScanStep({
      key: 'google_upload',
      label: 'Upload image to Google Lens',
      attempt: candidateAttempt,
      candidateId,
      inputSource: 'url',
      status: 'completed',
      retryOf: toText(fallbackContext?.retryOf),
      resultCode: 'url_submitted',
      message: 'Submitted image URL for ' + (candidateId || 'candidate') + '.',
      url: page.url(),
      warning: toText(fallbackContext?.warning),
      details: mergeStepDetails(sharedDetails, [
        { label: 'Transition reason', value: urlSubmission.transitionState?.reason },
      ]),
    });
    await emitProgress({
      stage: 'google_upload',
      message: 'Submitted image URL for ' + (candidateId || 'candidate') + '.',
    });
    return buildGoogleUploadResult({
      submitted: true,
      advanced: true,
      captchaRequired: false,
      captchaEncountered,
      error: null,
      retryRecommended: false,
      inputSourceUsed: 'url',
      failureCode: null,
      transitionReason: urlSubmission.transitionState?.reason,
    });
  };

  const uploadImageCandidateFromFile = async (
    candidateId,
    filePath,
    imageUrl,
    candidateAttempt,
    fallbackContext = null
  ) => {
    let captchaEncountered = false;
    const openState = await openGoogleLensForUpload({
      candidateId,
      candidateAttempt,
      inputSource: 'file',
      destinationUrl: 'https://lens.google.com/upload?hl=en',
      openingMessage: 'Opening Google Lens for image ' + (candidateId || 'candidate') + '.',
      openedMessage: 'Google Lens opened.',
      fallbackContext,
      details: [
        { label: 'Source', value: 'Local file' },
        { label: 'File path', value: filePath },
      ],
    });
    const sharedDetails = openState.sharedDetails;
    const preUploadCaptchaState = await handleGoogleLensCaptchaIfPresent('google_lens', {
      attempt: candidateAttempt,
      candidateId,
      inputSource: 'file',
    });
    captchaEncountered = captchaEncountered || preUploadCaptchaState.captchaEncountered === true;
    if (!preUploadCaptchaState.resolved) {
      upsertScanStep({
        key: 'google_upload',
        label: 'Upload image to Google Lens',
        attempt: candidateAttempt,
        candidateId,
        inputSource: 'file',
        status: preUploadCaptchaState.captchaRequired ? 'running' : 'failed',
        retryOf: toText(fallbackContext?.retryOf),
        resultCode: preUploadCaptchaState.captchaRequired ? 'captcha_required' : 'file_submit_failed',
        message: preUploadCaptchaState.message,
        url: preUploadCaptchaState.currentUrl,
        warning: toText(fallbackContext?.warning),
        details: sharedDetails,
      });
      return buildGoogleUploadResult({
        submitted: false,
        advanced: false,
        captchaRequired: preUploadCaptchaState.captchaRequired,
        captchaEncountered,
        error: preUploadCaptchaState.message,
        retryRecommended: false,
        inputSourceUsed: 'file',
        failureCode: preUploadCaptchaState.captchaRequired ? 'captcha_required' : 'captcha_timeout',
        transitionReason: null,
      });
    }
    upsertScanStep({
      key: 'google_upload',
      label: 'Upload image to Google Lens',
      attempt: candidateAttempt,
      candidateId,
      inputSource: 'file',
      status: 'running',
      retryOf: toText(fallbackContext?.retryOf),
      resultCode: 'file_submit_start',
      message: 'Uploading image ' + (candidateId || 'candidate') + ' from file.',
      url: page.url(),
      warning: toText(fallbackContext?.warning),
      details: sharedDetails,
    });
    let fileInputState = await waitForGoogleLensFileInput();
    if (!fileInputState.ready && fileInputState.entryState?.captchaDetected) {
      const entryCaptchaState = await handleGoogleLensCaptchaIfPresent('google_lens', {
        attempt: candidateAttempt,
        candidateId,
        inputSource: 'file',
      });
      captchaEncountered = captchaEncountered || entryCaptchaState.captchaEncountered === true;
      if (!entryCaptchaState.resolved) {
        upsertScanStep({
          key: 'google_upload',
          label: 'Upload image to Google Lens',
          attempt: candidateAttempt,
          candidateId,
          inputSource: 'file',
          status: entryCaptchaState.captchaRequired ? 'running' : 'failed',
          retryOf: toText(fallbackContext?.retryOf),
          resultCode:
            entryCaptchaState.captchaRequired ? 'captcha_required' : 'file_submit_failed',
          message: entryCaptchaState.message,
          url: entryCaptchaState.currentUrl,
          warning: toText(fallbackContext?.warning),
          details: sharedDetails,
        });
        return buildGoogleUploadResult({
          submitted: false,
          advanced: false,
          captchaRequired: entryCaptchaState.captchaRequired,
          captchaEncountered,
          error: entryCaptchaState.message,
          retryRecommended: false,
          inputSourceUsed: 'file',
          failureCode:
            entryCaptchaState.captchaRequired ? 'captcha_required' : 'captcha_timeout',
          transitionReason: 'captcha',
        });
      }
      fileInputState = await waitForGoogleLensFileInput();
    }
    if (!fileInputState.ready) {
      const entryFailure = resolveGoogleLensUploadEntryFailure(fileInputState.entryState);
      const artifactKey = await captureGoogleUploadArtifacts(
        'entry-missing',
        candidateId,
        candidateAttempt
      );
      log('amazon.scan.google_upload_entry_missing', {
        candidateId,
        filepath: filePath,
        imageUrl,
        entryState: fileInputState.entryState,
        artifactKey,
      });
      upsertScanStep({
        key: 'google_upload',
        label: 'Upload image to Google Lens',
        attempt: candidateAttempt,
        candidateId,
        inputSource: 'file',
        status: 'failed',
        retryOf: toText(fallbackContext?.retryOf),
        resultCode: entryFailure.resultCode,
        message: entryFailure.message,
        url: fileInputState.currentUrl,
        warning:
          toText(fallbackContext?.warning) ||
          (imageUrl ? 'Local file upload UI missing after fallback.' : null),
        details: mergeStepDetails(
          sharedDetails,
          imageUrl ? [{ label: 'Fallback available', value: 'Image URL' }] : [],
          [
            {
              label: 'Consent present',
              value:
                fileInputState.entryState &&
                typeof fileInputState.entryState.consentPresent === 'boolean'
                  ? String(fileInputState.entryState.consentPresent)
                  : null,
            },
            {
              label: 'Consent frame',
              value: fileInputState.entryState?.consentFrameUrl,
            },
            {
              label: 'File input count',
              value:
                typeof fileInputState.entryState?.fileInputCount === 'number'
                  ? String(fileInputState.entryState.fileInputCount)
                  : null,
            },
            {
              label: 'File input selector',
              value: fileInputState.entryState?.fileInputSelector,
            },
            {
              label: 'File input scope',
              value: fileInputState.entryState?.fileInputScopeType,
            },
            {
              label: 'File input frame',
              value: fileInputState.entryState?.fileInputFrameUrl,
            },
            {
              label: 'Entry trigger',
              value: fileInputState.entryState?.searchTriggerSelector,
            },
            {
              label: 'Entry trigger scope',
              value: fileInputState.entryState?.searchTriggerScopeType,
            },
            {
              label: 'Entry trigger frame',
              value: fileInputState.entryState?.searchTriggerFrameUrl,
            },
            {
              label: 'Upload tab',
              value: fileInputState.entryState?.uploadTabSelector,
            },
            {
              label: 'Upload tab scope',
              value: fileInputState.entryState?.uploadTabScopeType,
            },
            {
              label: 'Upload tab frame',
              value: fileInputState.entryState?.uploadTabFrameUrl,
            },
            {
              label: 'Result hints visible',
              value:
                fileInputState.entryState &&
                typeof fileInputState.entryState.resultHintsVisible === 'boolean'
                  ? String(fileInputState.entryState.resultHintsVisible)
                  : null,
            },
            {
              label: 'Artifact key',
              value: artifactKey,
            },
          ]
        ),
      });
      return buildGoogleUploadResult({
        submitted: false,
        advanced: false,
        captchaRequired: entryFailure.resultCode === 'captcha_required',
        captchaEncountered,
        error: entryFailure.message,
        retryRecommended: false,
        inputSourceUsed: 'file',
        failureCode: entryFailure.resultCode,
        transitionReason: 'file_input_missing',
      });
    }
    const inputLocator = fileInputState.inputLocator;
    const lensUploadUrl = fileInputState.currentUrl;
    const fileAttachError = await inputLocator
      .setInputFiles(filePath)
      .then(() => null)
      .catch((error) => toText(error?.message) || 'Google Lens rejected the selected image file.');
    if (fileAttachError) {
      const artifactKey = await captureGoogleUploadArtifacts(
        'attach-failed',
        candidateId,
        candidateAttempt
      );
      log('amazon.scan.google_upload_attach_failed', {
        candidateId,
        filepath: filePath,
        imageUrl,
        fileAttachError,
        selector: fileInputState.selector,
        scopeType: fileInputState.scopeType,
        frameUrl: fileInputState.frameUrl,
        artifactKey,
      });
      upsertScanStep({
        key: 'google_upload',
        label: 'Upload image to Google Lens',
        attempt: candidateAttempt,
        candidateId,
        inputSource: 'file',
        status: 'failed',
        retryOf: toText(fallbackContext?.retryOf),
        resultCode: 'file_attach_failed',
        message: fileAttachError,
        url: page.url(),
        warning:
          toText(fallbackContext?.warning) ||
          (imageUrl ? 'Retryable local file handoff failed. URL fallback is available.' : null),
        details: mergeStepDetails(
          sharedDetails,
          imageUrl ? [{ label: 'Fallback available', value: 'Image URL' }] : [],
          [
            { label: 'File input selector', value: fileInputState.selector },
            { label: 'File input scope', value: fileInputState.scopeType },
            { label: 'File input frame', value: fileInputState.frameUrl },
            { label: 'Artifact key', value: artifactKey },
          ]
        ),
      });
      return buildGoogleUploadResult({
        submitted: false,
        advanced: false,
        captchaRequired: false,
        captchaEncountered,
        error: fileAttachError,
        retryRecommended: Boolean(imageUrl),
        inputSourceUsed: 'file',
        failureCode: 'file_attach_failed',
        transitionReason: 'file_attach_failed',
      });
    }
    const uploadVerification = await verifyGoogleLensFileUploadAccepted(inputLocator, lensUploadUrl, {
      attempt: candidateAttempt,
      candidateId,
      inputSource: 'file',
    });
    if (!uploadVerification.accepted) {
      const uploadTimedOutWhileProcessing =
        uploadVerification.transitionState?.reason === 'upload_processing_timeout';
      const uploadNeverReachedResults =
        uploadVerification.transitionState?.reason === 'lens_result_page_not_ready';
      const artifactKey = await captureGoogleUploadArtifacts(
        uploadTimedOutWhileProcessing
          ? 'processing-timeout'
          : uploadNeverReachedResults
            ? 'result-page-not-ready'
            : 'empty-upload',
        candidateId,
        candidateAttempt
      );
      log('amazon.scan.google_upload_empty', {
        candidateId,
        filepath: filePath,
        imageUrl,
        selectedFileState: uploadVerification.selectedFileState,
        transitionState: uploadVerification.transitionState,
        artifactKey,
      });
      upsertScanStep({
        key: 'google_upload',
        label: 'Upload image to Google Lens',
        attempt: candidateAttempt,
        candidateId,
        inputSource: 'file',
        status: 'failed',
        retryOf: toText(fallbackContext?.retryOf),
        resultCode: uploadTimedOutWhileProcessing
          ? 'upload_processing_timeout'
          : uploadNeverReachedResults
            ? 'lens_result_page_not_ready'
            : 'empty_upload',
        message: uploadVerification.error,
        url: page.url(),
        warning:
          toText(fallbackContext?.warning) ||
          (imageUrl && !uploadNeverReachedResults
            ? 'Retryable upload handoff. URL fallback is available.'
            : null),
        details: mergeStepDetails(
          sharedDetails,
          imageUrl && !uploadNeverReachedResults
            ? [{ label: 'Fallback available', value: 'Image URL' }]
            : [],
          [
            { label: 'File input selector', value: fileInputState.selector },
            { label: 'File input scope', value: fileInputState.scopeType },
            { label: 'File input frame', value: fileInputState.frameUrl },
            { label: 'Selected file', value: uploadVerification.selectedFileState?.fileName },
            {
              label: 'Selected file size',
              value:
                typeof uploadVerification.selectedFileState?.fileSize === 'number'
                  ? String(uploadVerification.selectedFileState.fileSize)
                  : null,
            },
            { label: 'Transition reason', value: uploadVerification.transitionState?.reason },
            {
              label: 'Processing visible',
              value:
                uploadVerification.transitionState &&
                typeof uploadVerification.transitionState.processingState?.processingVisible ===
                  'boolean'
                  ? String(uploadVerification.transitionState.processingState.processingVisible)
                  : null,
            },
            {
              label: 'Progress indicator',
              value: uploadVerification.transitionState?.processingState?.progressIndicatorSelector,
            },
            {
              label: 'Processing text',
              value: uploadVerification.transitionState?.processingState?.processingText,
            },
            {
              label: 'Result shell visible',
              value:
                uploadVerification.transitionState &&
                typeof uploadVerification.transitionState.processingState?.resultShellVisible ===
                  'boolean'
                  ? String(uploadVerification.transitionState.processingState.resultShellVisible)
                  : null,
            },
            {
              label: 'Result shell selector',
              value: uploadVerification.transitionState?.processingState?.resultShellSelector,
            },
            { label: 'Artifact key', value: artifactKey },
          ]
        ),
      });
      await emitProgress({
        stage: 'google_upload_empty',
        message: uploadVerification.error,
      });
      return buildGoogleUploadResult({
        submitted: false,
        advanced: false,
        captchaRequired: false,
        captchaEncountered,
        error: uploadVerification.error,
        retryRecommended:
          !uploadTimedOutWhileProcessing &&
          !uploadNeverReachedResults &&
          !captchaEncountered &&
          Boolean(imageUrl),
        inputSourceUsed: 'file',
        failureCode: uploadTimedOutWhileProcessing
          ? 'upload_processing_timeout'
          : uploadNeverReachedResults
            ? 'lens_result_page_not_ready'
            : 'empty_upload',
        transitionReason: uploadVerification.transitionState?.reason,
      });
    }
    await page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => undefined);
    const postUploadCaptchaState = await handleGoogleLensCaptchaIfPresent('google_upload', {
        attempt: candidateAttempt,
        candidateId,
        inputSource: 'file',
      });
    captchaEncountered = captchaEncountered || postUploadCaptchaState.captchaEncountered === true;
    if (!postUploadCaptchaState.resolved) {
        upsertScanStep({
          key: 'google_upload',
          label: 'Upload image to Google Lens',
          attempt: candidateAttempt,
          candidateId,
          inputSource: 'file',
          status: postUploadCaptchaState.captchaRequired ? 'running' : 'failed',
          retryOf: toText(fallbackContext?.retryOf),
          resultCode: postUploadCaptchaState.captchaRequired ? 'captcha_required' : 'file_submit_failed',
          message: postUploadCaptchaState.message,
          url: postUploadCaptchaState.currentUrl,
          warning: toText(fallbackContext?.warning),
          details: sharedDetails,
        });
      return buildGoogleUploadResult({
        submitted: false,
        advanced: true,
        captchaRequired: postUploadCaptchaState.captchaRequired,
        captchaEncountered,
        error: postUploadCaptchaState.message,
        retryRecommended: false,
        inputSourceUsed: 'file',
        failureCode: postUploadCaptchaState.captchaRequired ? 'captcha_required' : 'captcha_timeout',
        transitionReason: uploadVerification.transitionState?.reason,
      });
    }
    upsertScanStep({
      key: 'google_upload',
      label: 'Upload image to Google Lens',
      attempt: candidateAttempt,
      candidateId,
      inputSource: 'file',
      status: 'completed',
      retryOf: toText(fallbackContext?.retryOf),
      resultCode: 'file_uploaded',
      message: 'Uploaded image ' + (candidateId || 'candidate') + ' to Google Lens.',
      url: page.url(),
      warning: toText(fallbackContext?.warning),
      details: mergeStepDetails(sharedDetails, [
        { label: 'File input selector', value: fileInputState.selector },
        { label: 'File input scope', value: fileInputState.scopeType },
        { label: 'File input frame', value: fileInputState.frameUrl },
        { label: 'Selected file', value: uploadVerification.selectedFileState?.fileName },
        {
          label: 'Selected file size',
          value:
            typeof uploadVerification.selectedFileState?.fileSize === 'number'
              ? String(uploadVerification.selectedFileState.fileSize)
              : null,
        },
        { label: 'Transition reason', value: uploadVerification.transitionState?.reason },
      ]),
    });
    await emitProgress({
      stage: 'google_upload',
      message: 'Uploaded image ' + (candidateId || 'candidate') + ' to Google Lens.',
    });
    return buildGoogleUploadResult({
      submitted: true,
      advanced: true,
      captchaRequired: false,
      captchaEncountered,
      error: null,
      retryRecommended: false,
      inputSourceUsed: 'file',
      failureCode: null,
      transitionReason: uploadVerification.transitionState?.reason,
    });
  };

  const uploadImageCandidate = async (candidate, candidateAttempt) => {
    const filePath = toText(candidate?.filepath);
    const imageUrl = toText(candidate?.url);
    const candidateId = toText(candidate?.id);

    if (filePath) {
      const fileUploadResult = await uploadImageCandidateFromFile(candidateId, filePath, imageUrl, candidateAttempt);
      if (
        fileUploadResult.submitted ||
        fileUploadResult.captchaRequired ||
        !imageUrl ||
        !fileUploadResult.retryRecommended
      ) {
        return fileUploadResult;
      }

      log('amazon.scan.google_upload_fallback_to_url', {
        candidateId,
        filepath: filePath,
        imageUrl,
        error: fileUploadResult.error,
      });
      return await uploadImageCandidateByUrl(candidateId, imageUrl, candidateAttempt, {
        warning: 'Local file upload failed. Falling back to image URL upload.',
        retryOf: 'Local file upload',
        details: [
          { label: 'Fallback from', value: 'Local file' },
          { label: 'Fallback reason', value: fileUploadResult.error || fileUploadResult.failureCode },
        ],
      });
    }

    if (imageUrl) {
      return await uploadImageCandidateByUrl(candidateId, imageUrl, candidateAttempt);
    }

    upsertScanStep({
      key: 'google_upload',
      label: 'Upload image to Google Lens',
      attempt: candidateAttempt,
      candidateId,
      status: 'failed',
      resultCode: 'candidate_missing_input',
      message: 'Product image candidate did not include a filepath or URL.',
      url: page.url(),
    });
    return buildGoogleUploadResult({
      submitted: false,
      advanced: false,
      captchaRequired: false,
      captchaEncountered: false,
      error: 'Product image candidate did not include a filepath or URL.',
      retryRecommended: false,
      inputSourceUsed: null,
      failureCode: 'candidate_missing_input',
      transitionReason: null,
    });
  };

  const collectAmazonCandidates = async (stepMeta = {}) => {
    let captchaEncountered = false;
    upsertScanStep({
      key: 'google_candidates',
      label: 'Collect Amazon candidates from Google Lens',
      attempt: stepMeta.attempt,
      candidateId: stepMeta.candidateId,
      inputSource: stepMeta.inputSource,
      status: 'running',
      resultCode: 'candidate_collect_start',
      message: 'Collecting Amazon result candidates from Google Lens.',
      url: page.url(),
    });
    let deadline = Date.now() + 25000;
    let extendedForProcessing = false;
    let nextProgressAt = Date.now() + 5000;
    while (Date.now() < deadline) {
      const captchaState = await handleGoogleLensCaptchaIfPresent('google_candidates', stepMeta);
      captchaEncountered = captchaEncountered || captchaState.captchaEncountered === true;
      if (!captchaState.resolved) {
        upsertScanStep({
          key: 'google_candidates',
          label: 'Collect Amazon candidates from Google Lens',
          attempt: stepMeta.attempt,
          candidateId: stepMeta.candidateId,
          inputSource: stepMeta.inputSource,
          status: captchaState.captchaRequired ? 'running' : 'failed',
          resultCode: captchaState.captchaRequired ? 'captcha_required' : 'candidate_collect_failed',
          message: captchaState.message,
          url: captchaState.currentUrl,
        });
        return {
          candidates: [],
          captchaRequired: captchaState.captchaRequired,
          captchaEncountered,
          error: captchaState.message,
          failureCode: captchaState.captchaRequired ? 'captcha_required' : 'captcha_timeout',
        };
      }

      const processingState = await readGoogleLensProcessingState();
      if (processingState.processingVisible && !extendedForProcessing) {
        deadline = Math.max(deadline, Date.now() + 35000);
        extendedForProcessing = true;
      }

      const rankedCandidates = await readGoogleLensAmazonCandidates();
      const candidates = rankedCandidates.map((candidate) => candidate.url);

      if (candidates.length > 0) {
        const sortedCandidates = rankedCandidates.map((candidate) => candidate.url);
        const retainedCandidates = rankedCandidates.slice(0, 5);
        const strongCandidateCount = rankedCandidates.filter((candidate) => candidate.score >= 250).length;
        upsertScanStep({
          key: 'google_candidates',
          label: 'Collect Amazon candidates from Google Lens',
          attempt: stepMeta.attempt,
          candidateId: stepMeta.candidateId,
          inputSource: stepMeta.inputSource,
          status: 'completed',
          resultCode: 'candidates_found',
          message: 'Found ' + sortedCandidates.length + ' Amazon candidates.',
          url: page.url(),
          details: mergeStepDetails(
            [{ label: 'Candidate count', value: String(sortedCandidates.length) }],
            [{ label: 'Retained candidates', value: String(retainedCandidates.length) }],
            [{ label: 'Strong candidates', value: String(strongCandidateCount) }],
            retainedCandidates[0]
              ? [{ label: 'Top candidate score', value: String(retainedCandidates[0].score) }]
              : [],
            retainedCandidates[0]?.asin
              ? [{ label: 'Top ASIN', value: retainedCandidates[0].asin }]
              : []
          ),
        });
        await emitProgress({
          stage: 'google_candidates',
          message: 'Found ' + sortedCandidates.length + ' Amazon candidates.',
        });
        return {
          candidates: retainedCandidates.map((candidate) => candidate.url),
          captchaRequired: false,
          captchaEncountered,
          error: null,
          failureCode: null,
        };
      }

      if (Date.now() >= nextProgressAt) {
        nextProgressAt = Date.now() + 5000;
        const waitingMessage = processingState.processingVisible
          ? 'Google Lens accepted the image and is still processing it.'
          : 'Waiting for Google Lens candidate results.';
        upsertScanStep({
          key: 'google_candidates',
          label: 'Collect Amazon candidates from Google Lens',
          attempt: stepMeta.attempt,
          candidateId: stepMeta.candidateId,
          inputSource: stepMeta.inputSource,
          status: 'running',
          resultCode: processingState.processingVisible
            ? 'upload_processing'
            : 'candidate_collect_waiting',
          message: waitingMessage,
          url: page.url(),
          details: processingState.processingVisible
            ? [
                { label: 'Processing text', value: processingState.processingText },
                { label: 'Progress indicator', value: processingState.progressIndicatorSelector },
                { label: 'Result shell', value: processingState.resultShellSelector },
              ]
            : undefined,
        });
        await emitProgress({
          stage: 'google_candidates',
          message: waitingMessage,
        });
      }

      await waitForGoogleLensCandidateHints();
    }

    const collectionState = await describeGoogleLensCandidateCollectionState();
    const timedOutWhileProcessing = collectionState.processingVisible;
    const timedOutOnUploadEntry = collectionState.looksLikeUploadEntry;
    const timeoutMessage = timedOutWhileProcessing
      ? 'Google Lens accepted the image but stayed in the upload processing state without producing usable results.'
      : timedOutOnUploadEntry
        ? 'Google Lens did not transition from the upload entry into a usable result page.'
        : 'Google Lens candidate collection timed out before Amazon results became available.';
    const artifactKey =
      timedOutWhileProcessing || timedOutOnUploadEntry
        ? await captureGoogleUploadArtifacts('candidate-timeout', stepMeta.candidateId, stepMeta.attempt)
        : null;

    upsertScanStep({
      key: 'google_candidates',
      label: 'Collect Amazon candidates from Google Lens',
      attempt: stepMeta.attempt,
      candidateId: stepMeta.candidateId,
      inputSource: stepMeta.inputSource,
      status: timedOutWhileProcessing || timedOutOnUploadEntry ? 'failed' : 'completed',
      resultCode: timedOutWhileProcessing
        ? 'upload_processing_timeout'
        : timedOutOnUploadEntry
          ? 'lens_result_page_not_ready'
          : 'candidate_collect_timeout',
      message: timeoutMessage,
      url: collectionState.currentUrl,
      warning: timedOutWhileProcessing
        ? 'Google Lens kept showing upload progress without usable results.'
        : timedOutOnUploadEntry
          ? 'Google Lens remained on the upload entry UI.'
          : 'Candidate collection timed out for this input attempt.',
      details: [
        { label: 'Amazon links seen', value: String(collectionState.amazonLinkCount) },
        { label: 'Upload entry visible', value: collectionState.uploadInputVisible ? 'Yes' : 'No' },
        {
          label: 'Candidate hints visible',
          value: collectionState.candidateHintsVisible ? 'Yes' : 'No',
        },
        {
          label: 'Processing visible',
          value: collectionState.processingVisible ? 'Yes' : 'No',
        },
        {
          label: 'Progress indicator',
          value: collectionState.progressIndicatorSelector,
        },
        {
          label: 'Processing text',
          value: collectionState.processingText,
        },
        {
          label: 'Result shell visible',
          value: collectionState.resultShellVisible ? 'Yes' : 'No',
        },
        {
          label: 'Result shell selector',
          value: collectionState.resultShellSelector,
        },
        {
          label: 'Artifact key',
          value: artifactKey,
        },
      ],
    });
    await emitProgress({
      stage: 'google_candidates',
      message: timeoutMessage,
    });
    return {
      candidates: [],
      captchaRequired: false,
      captchaEncountered,
      error: timedOutOnUploadEntry ? timeoutMessage : null,
      failureCode: timedOutWhileProcessing
        ? 'upload_processing_timeout'
        : timedOutOnUploadEntry
          ? 'lens_result_page_not_ready'
          : 'candidate_collect_timeout',
    };
  };

  const clickFirstVisible = async (selectors) => {
    for (const scope of listGoogleLensSearchScopes()) {
      for (const selector of selectors) {
        const locator = scope.target.locator(selector).first();
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
            return {
              clicked: true,
              selector,
              scopeType: scope.scopeType,
              frameUrl: scope.frameUrl,
            };
          }
        }
        if (clicked) {
          await wait(800);
          return {
            clicked: true,
            selector,
            scopeType: scope.scopeType,
            frameUrl: scope.frameUrl,
          };
        }
      }
    }

    return {
      clicked: false,
      selector: null,
      scopeType: null,
      frameUrl: null,
    };
  };

  const AMAZON_PRODUCT_CONTENT_SELECTORS = [
    '#productTitle',
    '[data-asin]',
    'input[name="ASIN"]',
    '#dp-container',
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
      'button[data-action="sp-cc-accept"]',
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
`;
