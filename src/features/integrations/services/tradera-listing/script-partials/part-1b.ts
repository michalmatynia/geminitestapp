export const PART_1B = String.raw`
  const deliveryOptionLabels = configuredDeliveryOptionLabel
    ? [
        configuredDeliveryOptionLabel,
        ...DELIVERY_OPTION_LABELS.filter(
          (label) =>
            normalizeWhitespace(label).toLowerCase() !==
            normalizeWhitespace(configuredDeliveryOptionLabel).toLowerCase()
        ),
      ]
    : DELIVERY_OPTION_LABELS;
  const imageUrls = Array.isArray(input?.imageUrls)
    ? input.imageUrls
        .map((value) => toText(value))
        .filter((value) => typeof value === 'string')
        .slice(0, 12)
    : [];
  const localImagePaths = Array.isArray(input?.localImagePaths)
    ? input.localImagePaths
        .map((value) => toText(value))
        .filter((value) => typeof value === 'string')
        .slice(0, 12)
    : [];
  const imageOrderStrategy = toText(input?.traderaImageOrder?.strategy);
  const imageManifestCount = toNumber(input?.traderaImageOrder?.imageCount) ?? imageUrls.length;
  const localImageCoverageCount = toNumber(input?.traderaImageOrder?.localImageCoverageCount);
  let unexpectedTraderaNavigation = null;

  const getUnexpectedTraderaNavigationPayload = (value) => {
    const normalized = toText(value);
    if (!normalized || normalized === 'about:blank') {
      return null;
    }

    try {
      const parsed = new URL(normalized, DIRECT_SELL_URL);
      const protocol = parsed.protocol.toLowerCase();
      const host = parsed.host.toLowerCase();
      if (
        (protocol === 'http:' || protocol === 'https:') &&
        TRADERA_ALLOWED_PAGE_HOSTS.includes(host)
      ) {
        return null;
      }

      return {
        currentUrl: parsed.toString(),
        host,
        protocol,
      };
    } catch {
      return {
        currentUrl: normalized,
        host: null,
        protocol: null,
      };
    }
  };

  const assertAllowedTraderaPage = async (context = 'operation') => {
    const currentUrl = typeof page?.url === 'function' ? page.url() : null;
    const navigationPayload = getUnexpectedTraderaNavigationPayload(currentUrl);
    if (!navigationPayload) {
      return;
    }

    const failurePayload = {
      context,
      ...navigationPayload,
    };
    const failureMessage =
      'FAIL_SELL_PAGE_INVALID: Unexpected navigation away from Tradera to ' +
      failurePayload.currentUrl +
      ' during ' +
      context +
      '.';

    const shouldCapture =
      !unexpectedTraderaNavigation ||
      unexpectedTraderaNavigation.currentUrl !== failurePayload.currentUrl ||
      unexpectedTraderaNavigation.context !== failurePayload.context;

    unexpectedTraderaNavigation = failurePayload;
    log?.('tradera.quicklist.navigation.unexpected', failurePayload);
    if (shouldCapture) {
      await captureFailureArtifacts('unexpected-navigation', failurePayload).catch(
        () => undefined
      );
    }

    throw new Error(failureMessage);
  };

  const readClickTargetMetadata = async (target) => {
    if (!target || typeof target.evaluate !== 'function') {
      return null;
    }

    return target
      .evaluate((element) => {
        const hrefAttribute = element.getAttribute('href') || '';
        const resolvedHref =
          element instanceof HTMLAnchorElement
            ? element.href || hrefAttribute
            : hrefAttribute;

        return {
          tagName: element.tagName.toLowerCase(),
          id: element.getAttribute('id') || '',
          name: element.getAttribute('name') || '',
          type: element.getAttribute('type') || '',
          role: element.getAttribute('role') || '',
          href: resolvedHref,
          hrefAttribute,
          targetAttribute: element.getAttribute('target') || '',
          ariaLabel: element.getAttribute('aria-label') || '',
          title: element.getAttribute('title') || '',
          dataTestId: element.getAttribute('data-testid') || '',
          value:
            'value' in element && typeof element.value === 'string'
              ? element.value
              : '',
          text: (element.textContent || '').replace(/\s+/g, ' ').trim(),
        };
      })
      .catch(() => null);
  };

  const resolveExternalClickTargetUrl = (metadata) => {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    const hrefCandidate = normalizeWhitespace(metadata.href || metadata.hrefAttribute || '');
    if (!hrefCandidate || hrefCandidate === '#' || hrefCandidate.startsWith('#')) {
      return null;
    }
    if (/^(javascript|mailto|tel):/i.test(hrefCandidate)) {
      return null;
    }

    try {
      const parsed = new URL(hrefCandidate, typeof page?.url === 'function' ? page.url() : DIRECT_SELL_URL);
      const protocol = parsed.protocol.toLowerCase();
      if (protocol !== 'http:' && protocol !== 'https:') {
        return null;
      }
      return TRADERA_ALLOWED_PAGE_HOSTS.includes(parsed.host.toLowerCase())
        ? null
        : parsed.toString();
    } catch {
      return null;
    }
  };

  const logClickTarget = async (context, target) => {
    const targetMetadata = await readClickTargetMetadata(target);
    log?.('tradera.quicklist.click_target', {
      context,
      currentUrl: typeof page?.url === 'function' ? page.url() : null,
      ...(targetMetadata || {}),
    });
  };

  const isPublishClickTarget = (metadata) => {
    if (!metadata || typeof metadata !== 'object') {
      return false;
    }

    return [
      metadata.text,
      metadata.ariaLabel,
      metadata.dataTestId,
      metadata.id,
      metadata.name,
      metadata.title,
      metadata.value,
    ].some((value) => hasPublishActionHint(value));
  };

  const findPublishButton = async (options = {}) => {
    const allowAmbiguousSubmit = options?.allowAmbiguousSubmit === true;
    let ambiguousSubmitCandidate = null;

    for (const selector of PUBLISH_SELECTORS) {
      const locator = page.locator(selector);
      const count = await locator.count().catch(() => 0);
      if (!count) continue;

      for (let index = 0; index < Math.min(count, 8); index += 1) {
        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible) continue;

        const metadata = await readClickTargetMetadata(candidate);
        if (resolveExternalClickTargetUrl(metadata)) {
          continue;
        }

        const isAmbiguousSubmitSelector = selector === 'button[type="submit"]';
        if (!isAmbiguousSubmitSelector || isPublishClickTarget(metadata)) {
          return candidate;
        }

        ambiguousSubmitCandidate ??= candidate;
      }
    }

    return allowAmbiguousSubmit ? ambiguousSubmitCandidate : null;
  };

  const wait = async (ms) => {
    await assertAllowedTraderaPage('wait');
    if (helpers && typeof helpers.sleep === 'function') {
      await helpers.sleep(ms);
    } else {
      await page.waitForTimeout(ms);
    }
    await assertAllowedTraderaPage('wait');
  };

  const humanClick = async (target, options) => {
    if (!target) return;
    await assertAllowedTraderaPage('before click');
    const targetMetadata = await readClickTargetMetadata(target);
    const externalClickTargetUrl = resolveExternalClickTargetUrl(targetMetadata);
    if (externalClickTargetUrl) {
      const failurePayload = {
        currentUrl: typeof page?.url === 'function' ? page.url() : null,
        externalClickTargetUrl,
        ...targetMetadata,
      };
      log?.('tradera.quicklist.click_blocked', failurePayload);
      await captureFailureArtifacts('blocked-external-click', failurePayload).catch(
        () => undefined
      );
      throw new Error(
        'FAIL_SELL_PAGE_INVALID: Refusing to click external link target "' +
          externalClickTargetUrl +
          '".'
      );
    }
    if (helpers && typeof helpers.click === 'function') {
      await helpers.click(target, options);
    } else {
      if (options?.scroll !== false && typeof target.scrollIntoViewIfNeeded === 'function') {
        await target.scrollIntoViewIfNeeded().catch(() => undefined);
      }
      await target.click(options?.clickOptions);
    }
    await assertAllowedTraderaPage('after click');
  };

  const tryHumanClick = async (target, options) => {
    try {
      await humanClick(target, options);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || '');
      if (message.includes('FAIL_SELL_PAGE_INVALID:')) {
        throw error;
      }
      return false;
    }
  };

  const humanFill = async (target, value, options) => {
    if (!target) return;
    await assertAllowedTraderaPage('before fill');
    if (helpers && typeof helpers.fill === 'function') {
      await helpers.fill(target, value, options);
    } else {
      await target.fill(value);
    }
    await assertAllowedTraderaPage('after fill');
  };

  const humanType = async (value, options) => {
    await assertAllowedTraderaPage('before type');
    if (helpers && typeof helpers.type === 'function') {
      await helpers.type(value, options);
    } else {
      await page.keyboard.type(value);
    }
    await assertAllowedTraderaPage('after type');
  };

  const humanPress = async (key, options) => {
    await assertAllowedTraderaPage('before press');
    if (helpers && typeof helpers.press === 'function') {
      await helpers.press(key, options);
    } else {
      await page.keyboard.press(key);
    }
    await assertAllowedTraderaPage('after press');
  };

  const emitStage = (stage, extra = {}) => {
    if (typeof emit !== 'function') {
      return;
    }
    let currentUrl = null;
    try {
      currentUrl = typeof page?.url === 'function' ? page.url() : null;
    } catch {}
    emit('result', {
      stage,
      ...(currentUrl ? { currentUrl } : {}),
      ...extra,
    });
  };

  const readRuntimeEnvironment = async () => {
    return page
      .evaluate(() => {
        const coarsePointer =
          typeof window.matchMedia === 'function'
            ? window.matchMedia('(pointer: coarse)').matches
            : null;
        const finePointer =
          typeof window.matchMedia === 'function'
            ? window.matchMedia('(pointer: fine)').matches
            : null;

        return {
          href: window.location.href,
          viewportWidth: window.innerWidth || null,
          viewportHeight: window.innerHeight || null,
          outerWidth: window.outerWidth || null,
          outerHeight: window.outerHeight || null,
          screenWidth: window.screen?.width ?? null,
          screenHeight: window.screen?.height ?? null,
          devicePixelRatio: window.devicePixelRatio ?? null,
          userAgent: navigator.userAgent,
          maxTouchPoints: navigator.maxTouchPoints ?? 0,
          coarsePointer,
          finePointer,
        };
      })
      .catch(() => null);
  };

  const toSafeArtifactName = (value) =>
    String(value || 'artifact')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+\$/g, '')
      .slice(0, 48) || 'artifact';

  const firstExisting = async (selectors) => {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      const count = await locator.count().catch(() => 0);
      if (count) return locator;
    }
    return null;
  };

  const firstVisible = async (selectors) => {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      const count = await locator.count().catch(() => 0);
      if (!count) continue;
      const visible = await locator.isVisible().catch(() => false);
      if (visible) return locator;
    }
    return null;
  };

  const isControlDisabled = async (locator) => {
    if (!locator) return true;
    return locator.isDisabled().catch(async () => {
      return locator
        .evaluate((element) => {
          return (
            element.hasAttribute('disabled') ||
            element.getAttribute('aria-disabled') === 'true'
          );
        })
        .catch(() => false);
    });
  };

  const collectValidationMessages = async () => {
    const isIgnorableValidationCandidate = async (locator) => {
      return locator
        .evaluate((element, ignoredFields) => {
          const normalizedFields = Array.isArray(ignoredFields)
            ? ignoredFields
                .map((value) => String(value || '').trim().toLowerCase())
                .filter(Boolean)
            : [];
          if (normalizedFields.length === 0) {
            return false;
          }

          const identifiers = [
            element.getAttribute('id') || '',
            element.getAttribute('name') || '',
            element.getAttribute('aria-label') || '',
            element.parentElement?.getAttribute('id') || '',
            element.parentElement?.tagName || '',
            element.tagName || '',
          ]
            .map((value) => String(value || '').trim().toLowerCase())
            .filter(Boolean);

          if (identifiers.some((value) => normalizedFields.includes(value))) {
            return true;
          }

          return Boolean(element.closest('next-route-announcer'));
        }, VALIDATION_MESSAGE_IGNORE_FIELDS)
        .catch(() => false);
    };

    const sanitizeValidationMessages = (messages) => {
      if (!Array.isArray(messages)) {
        return [];
      }

      return messages.filter((message) => {
        const normalized = normalizeWhitespace(message).toLowerCase();
        return (
          normalized.length > 0 &&
          !VALIDATION_MESSAGE_IGNORE_FIELDS.some((ignoredField) => normalized.includes(ignoredField)) &&
          !TRANSIENT_VALIDATION_MESSAGE_PATTERNS.some((pattern) => pattern.test(normalized))
        );
      });
    };

    const messages = new Set();

    for (const selector of VALIDATION_MESSAGE_SELECTORS) {
      const locator = page.locator(selector);
      const count = await locator.count().catch(() => 0);
      if (!count) continue;

      for (let index = 0; index < Math.min(count, 8); index += 1) {
        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible) continue;
        if (await isIgnorableValidationCandidate(candidate)) continue;

        const text = await candidate.innerText().catch(() => '');
        const normalized = text.trim().replace(/\s+/g, ' ');
        if (normalized) {
          messages.add(normalized.slice(0, 240));
          continue;
        }

        const fieldLabel = await candidate
          .evaluate((element) => {
            return (
              element.getAttribute('aria-label') ||
              element.getAttribute('name') ||
              element.getAttribute('id') ||
              ''
            );
          })
          .catch(() => '');
        const normalizedFieldLabel = fieldLabel.trim();
        if (normalizedFieldLabel) {
          messages.add('Invalid field: ' + normalizedFieldLabel);
        }
      }
    }

    return sanitizeValidationMessages(Array.from(messages)).slice(0, 6);
  };

  const hasDeliveryValidationIssue = (messages) => {
    if (!Array.isArray(messages) || messages.length === 0) {
      return false;
    }

    return messages.some((message) =>`;
