import type { PlaywrightCaptureRoute } from '@/shared/contracts/playwright';

const DEFAULT_WAIT_FOR_SELECTOR_MS = 15_000;
const DEFAULT_NAVIGATION_TIMEOUT_MS = 45_000;
const DEFAULT_CAPTURE_RETRY_DELAY_MS = 1_000;
const DEFAULT_CAPTURE_MAX_ATTEMPTS = 2;

export const PLAYWRIGHT_CAPTURE_TIMEOUT_MS = 240_000;

export const PLAYWRIGHT_DEFAULT_CAPTURE_SCRIPT = `
export default async function run({ page, input, artifacts, helpers, emit, log }) {
  const captures = Array.isArray(input.captures) ? input.captures : [];
  const navigationTimeoutMs = ${DEFAULT_NAVIGATION_TIMEOUT_MS};
  const retryDelayMs = ${DEFAULT_CAPTURE_RETRY_DELAY_MS};
  const maxCaptureAttempts = ${DEFAULT_CAPTURE_MAX_ATTEMPTS};
  const expectedAppearanceMode =
    typeof input.appearanceMode === 'string' ? input.appearanceMode.trim() : '';
  const expectedAppearanceSelector = expectedAppearanceMode
    ? 'html[data-kangur-appearance-mode="' + expectedAppearanceMode + '"], ' +
      'body[data-kangur-appearance-mode="' + expectedAppearanceMode + '"], ' +
      '#app-content[data-kangur-appearance-mode="' + expectedAppearanceMode + '"]'
    : '';
  const results = [];
  let successCount = 0;
  let failureCount = 0;
  const totalCount = captures.length;
  const describeError = (error) => {
    if (error instanceof Error && typeof error.message === 'string' && error.message.trim()) {
      return error.message.trim();
    }
    if (typeof error === 'string' && error.trim()) {
      return error.trim();
    }
    if (error && typeof error === 'object') {
      const maybeName =
        typeof error.name === 'string' && error.name.trim() ? error.name.trim() : '';
      const maybeMessage =
        typeof error.message === 'string' && error.message.trim() ? error.message.trim() : '';
      if (maybeName || maybeMessage) {
        return [maybeName, maybeMessage].filter(Boolean).join(': ');
      }
      try {
        const serialized = JSON.stringify(error);
        if (typeof serialized === 'string' && serialized.length > 2) {
          return serialized;
        }
      } catch {}
    }
    return 'capture_failed';
  };

  const describeWaitReason = (reason) => {
    switch (reason) {
      case 'route_shell':
        return 'Waiting for Kangur route shell.';
      case 'transition_skeleton':
        return 'Waiting for transition skeleton to finish.';
      case 'transition_phase':
        return 'Waiting for route transition to become idle.';
      case 'route_content':
        return 'Waiting for route content to mount.';
      case 'capture_ready':
        return 'Waiting for route capture-ready flag.';
      case 'appearance_mode':
        return 'Waiting for expected appearance mode.';
      default:
        return 'Waiting for page readiness.';
    }
  };

  const emitProgress = (payload = {}) => {
    const processedCount = successCount + failureCount;
    emit('capture_progress', {
      processedCount,
      completedCount: successCount,
      failureCount,
      remainingCount: Math.max(totalCount - processedCount, 0),
      totalCount,
      ...payload,
    });
  };

  const buildCaptureResult = ({
    id,
    title,
    status,
    reason = null,
    resolvedUrl = null,
    attemptCount = null,
    stage = null,
    durationMs = 0,
  }) => ({
    id,
    title,
    status,
    reason,
    resolvedUrl,
    attemptCount,
    durationMs: Math.max(Math.floor(durationMs), 0),
    stage,
  });

  for (let index = 0; index < captures.length; index += 1) {
    const capture = captures[index] || {};
    const id = typeof capture.id === 'string' ? capture.id : \`capture-\${index + 1}\`;
    const title =
      typeof capture.title === 'string' && capture.title.trim().length > 0
        ? capture.title.trim()
        : id;
    const url = typeof capture.url === 'string' ? capture.url : '';
    const selector = typeof capture.selector === 'string' ? capture.selector.trim() : '';
    const selectorRole =
      typeof capture.selectorRole === 'string' ? capture.selectorRole.trim() : '';
    const waitForMs = Number.isFinite(capture.waitForMs) ? Number(capture.waitForMs) : 2000;
    const waitForSelectorMs = Number.isFinite(capture.waitForSelectorMs)
      ? Number(capture.waitForSelectorMs)
      : 15000;
    const captureStartedAt = Date.now();
    let captureStage = 'starting';
    let resolvedUrl = url || null;
    let usedFallbackCapture = false;

    emitProgress({
      currentCaptureId: id,
      currentCaptureTitle: title,
      currentCaptureStatus: 'starting',
      message: \`[\${id}] Opening \${title}.\`,
    });

    if (!url) {
      failureCount += 1;
      captureStage = 'validation';
      results.push(
        buildCaptureResult({
          id,
          title,
          status: 'skipped',
          reason: 'missing_url',
          resolvedUrl: null,
          durationMs: Date.now() - captureStartedAt,
          stage: captureStage,
        })
      );
      emitProgress({
        currentCaptureId: id,
        currentCaptureTitle: title,
        currentCaptureStatus: 'failed',
        lastCaptureId: id,
        lastCaptureStatus: 'skipped',
        message: \`[\${id}] Skipped because the capture URL is missing.\`,
      });
      continue;
    }

    let captureCompleted = false;
    for (let attempt = 1; attempt <= maxCaptureAttempts; attempt += 1) {
      try {
        captureStage = 'navigating';
        log(
          \`[\${id}] Attempt \${attempt}/\${maxCaptureAttempts}: navigating to \${url}\${
            selectorRole ? \` (selector role: \${selectorRole})\` : ''
          }\`
        );
        await page.goto(url, { waitUntil: 'load', timeout: navigationTimeoutMs });
        resolvedUrl = page.url() || url;
        log(\`[\${id}] Load event fired — current URL: \${page.url()}\`);

        {
          captureStage = 'waiting_for_page_ready';
          const pollDeadline = Date.now() + waitForSelectorMs;
          let pageReady = false;
          let lastWaitReason = '';
          let lastWaitProgressAt = 0;
          log(\`[\${id}] Polling for page readiness (shell + no skeleton + transition idle + capture ready)\`);
          while (Date.now() < pollDeadline) {
            let waitReason = '';
            const hasShell = await page.$('[data-testid="kangur-route-shell"]');
            if (!hasShell) {
              waitReason = 'route_shell';
            } else {
              const skeletonCount = await page
                .locator('[data-testid="kangur-page-transition-skeleton"]')
                .count();
              if (skeletonCount > 0) {
                waitReason = 'transition_skeleton';
              } else {
                const phaseEl = await page.$('[data-route-transition-phase]');
                if (phaseEl) {
                  const phase = await phaseEl.getAttribute('data-route-transition-phase');
                  const busy = await phaseEl.getAttribute('aria-busy');
                  if ((phase && phase !== 'idle') || busy === 'true') {
                    waitReason = 'transition_phase';
                  }
                }
              }
            }

            if (!waitReason) {
              const routeContent = await page.$('[data-testid="kangur-route-content"]');
              if (!routeContent) {
                waitReason = 'route_content';
              } else {
                const captureReady = await routeContent.getAttribute('data-route-capture-ready');
                if (captureReady !== 'true') {
                  waitReason = 'capture_ready';
                } else if (expectedAppearanceSelector) {
                  const appearanceApplied = await page.$(expectedAppearanceSelector);
                  if (!appearanceApplied) {
                    waitReason = 'appearance_mode';
                  } else {
                    pageReady = true;
                    break;
                  }
                } else {
                  pageReady = true;
                  break;
                }
              }
            }

            const now = Date.now();
            if (waitReason !== lastWaitReason || now - lastWaitProgressAt >= 2000) {
              lastWaitReason = waitReason;
              lastWaitProgressAt = now;
              emitProgress({
                currentCaptureId: id,
                currentCaptureTitle: title,
                currentCaptureStatus: 'waiting_for_page_ready',
                message: \`[\${id}] \${describeWaitReason(waitReason)}\`,
              });
            }
            await helpers.sleep(400);
          }
          log(pageReady
            ? \`[\${id}] Page ready — shell stable and capture-ready\`
            : \`[\${id}] Page readiness timeout — capturing current state\`);
          if (!pageReady) {
            captureStage = 'capturing_fallback';
            usedFallbackCapture = true;
            emitProgress({
              currentCaptureId: id,
              currentCaptureTitle: title,
              currentCaptureStatus: 'capturing_fallback',
              message: \`[\${id}] Page readiness timed out. Capturing the current state.\`,
            });
          }
        }

        if (selector) {
          captureStage = 'waiting_for_selector';
          log(\`[\${id}] Waiting for target selector: \${selector}\`);
          emitProgress({
            currentCaptureId: id,
            currentCaptureTitle: title,
            currentCaptureStatus: 'waiting_for_selector',
            message: \`[\${id}] Waiting for selector \${selector}.\`,
          });
          await page.waitForSelector(selector, { state: 'visible', timeout: waitForSelectorMs });
        }

        const settleMs = Math.max(waitForMs, 3000);
        captureStage = 'settling';
        log(\`[\${id}] Waiting \${settleMs}ms for content to settle\`);
        emitProgress({
          currentCaptureId: id,
          currentCaptureTitle: title,
          currentCaptureStatus: 'settling',
          message: \`[\${id}] Settling for \${settleMs}ms before capture.\`,
        });
        await helpers.sleep(settleMs);

        captureStage = 'capturing';
        const buffer = selector
          ? await page.locator(selector).screenshot({ type: 'png' })
          : await page.screenshot({ fullPage: true, type: 'png' });

        await artifacts.file(id, buffer, {
          extension: 'png',
          mimeType: 'image/png',
          kind: 'screenshot',
        });

        log(\`[\${id}] Captured successfully\`);
        successCount += 1;
        captureStage = usedFallbackCapture ? 'captured_fallback' : 'captured';
        results.push(
          buildCaptureResult({
            id,
            title,
            status: 'ok',
            resolvedUrl,
            attemptCount: attempt,
            durationMs: Date.now() - captureStartedAt,
            stage: captureStage,
          })
        );
        emitProgress({
          currentCaptureId: id,
          currentCaptureTitle: title,
          currentCaptureStatus: 'captured',
          lastCaptureId: id,
          lastCaptureStatus: 'ok',
          message:
            attempt > 1
              ? \`[\${id}] Captured \${title} on retry.\`
              : \`[\${id}] Captured \${title}.\`,
        });
        captureCompleted = true;
        break;
      } catch (error) {
        const message = describeError(error);
        if (attempt < maxCaptureAttempts) {
          log(\`[\${id}] Attempt \${attempt}/\${maxCaptureAttempts} failed: \${message}\`);
          emitProgress({
            currentCaptureId: id,
            currentCaptureTitle: title,
            currentCaptureStatus: 'retrying',
            message: \`[\${id}] Capture attempt \${attempt} failed: \${message}. Retrying.\`,
          });
          try {
            await page.goto('about:blank', { waitUntil: 'load', timeout: 15000 });
          } catch (resetError) {
            log(\`[\${id}] Retry reset failed: \${describeError(resetError)}\`);
          }
          await helpers.sleep(retryDelayMs);
          continue;
        }

        log(\`Capture failed for \${id}: \${message}\`);
        failureCount += 1;
        results.push(
          buildCaptureResult({
            id,
            title,
            status: 'failed',
            reason: message,
            resolvedUrl,
            attemptCount: attempt,
            durationMs: Date.now() - captureStartedAt,
            stage: captureStage,
          })
        );
        emitProgress({
          currentCaptureId: id,
          currentCaptureTitle: title,
          currentCaptureStatus: 'failed',
          lastCaptureId: id,
          lastCaptureStatus: 'failed',
          message: \`[\${id}] Capture failed: \${message}\`,
        });
      }
    }

    if (!captureCompleted) {
      continue;
    }
  }

  emit('capture_results', results);
}
`;

/**
 * Build an absolute capture URL from a base URL and a route path.
 * Returns null when the path is empty or the combination cannot be resolved.
 */
export const buildCaptureRouteUrl = (baseUrl: string, path: string): string | null => {
  const normalizedPath = path.trim();
  if (!normalizedPath) return null;
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;
  const normalizedBase = baseUrl.trim().replace(/\/+$/, '');
  if (!normalizedBase) return null;
  return `${normalizedBase}${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}`;
};

export const createEmptyPlaywrightCaptureRoute = (index = 1): PlaywrightCaptureRoute => ({
  id: `route-${index}`,
  title: '',
  path: '/',
  description: '',
  selector: null,
  selectorRole: null,
  waitForMs: null,
  waitForSelectorMs: DEFAULT_WAIT_FOR_SELECTOR_MS,
});
