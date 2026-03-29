import { KANGUR_SOCIAL_CAPTURE_PRESETS } from '@/features/kangur/shared/social-capture-presets';
import type { KangurSocialProgrammableCaptureRoute } from '@/shared/contracts/kangur-social-image-addons';

const DEFAULT_WAIT_FOR_SELECTOR_MS = 15_000;

export const KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT = `
export default async function run({ page, input, artifacts, helpers, emit, log }) {
  const captures = Array.isArray(input.captures) ? input.captures : [];
  const results = [];
  let successCount = 0;
  let failureCount = 0;
  const totalCount = captures.length;

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

  for (let index = 0; index < captures.length; index += 1) {
    const capture = captures[index] || {};
    const id = typeof capture.id === 'string' ? capture.id : \`capture-\${index + 1}\`;
    const title =
      typeof capture.title === 'string' && capture.title.trim().length > 0
        ? capture.title.trim()
        : id;
    const url = typeof capture.url === 'string' ? capture.url : '';
    const selector = typeof capture.selector === 'string' ? capture.selector.trim() : '';
    const waitForMs = Number.isFinite(capture.waitForMs) ? Number(capture.waitForMs) : 2000;
    const waitForSelectorMs = Number.isFinite(capture.waitForSelectorMs)
      ? Number(capture.waitForSelectorMs)
      : 15000;

    emitProgress({
      currentCaptureId: id,
      currentCaptureTitle: title,
      currentCaptureStatus: 'starting',
      message: \`[\${id}] Opening \${title}.\`,
    });

    if (!url) {
      failureCount += 1;
      results.push({ id, status: 'skipped', reason: 'missing_url' });
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

    try {
      log(\`[\${id}] Navigating to \${url}\`);
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      log(\`[\${id}] Load event fired — current URL: \${page.url()}\`);

      {
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
          emitProgress({
            currentCaptureId: id,
            currentCaptureTitle: title,
            currentCaptureStatus: 'capturing_fallback',
            message: \`[\${id}] Page readiness timed out. Capturing the current state.\`,
          });
        }
      }

      if (selector) {
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
      log(\`[\${id}] Waiting \${settleMs}ms for content to settle\`);
      emitProgress({
        currentCaptureId: id,
        currentCaptureTitle: title,
        currentCaptureStatus: 'settling',
        message: \`[\${id}] Settling for \${settleMs}ms before capture.\`,
      });
      await helpers.sleep(settleMs);

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
      results.push({ id, status: 'ok' });
      emitProgress({
        currentCaptureId: id,
        currentCaptureTitle: title,
        currentCaptureStatus: 'captured',
        lastCaptureId: id,
        lastCaptureStatus: 'ok',
        message: \`[\${id}] Captured \${title}.\`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'capture_failed';
      log(\`Capture failed for \${id}: \${message}\`);
      failureCount += 1;
      results.push({ id, status: 'failed', reason: message });
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

  emit('capture_results', results);
}
`;

export const createEmptyKangurSocialProgrammableCaptureRoute = (
  index = 1
): KangurSocialProgrammableCaptureRoute => ({
  id: `route-${index}`,
  title: '',
  path: '/',
  description: '',
  selector: null,
  waitForMs: null,
  waitForSelectorMs: DEFAULT_WAIT_FOR_SELECTOR_MS,
});

export const buildKangurSocialProgrammableCaptureRoutesFromPresetIds = (
  presetIds?: string[]
): KangurSocialProgrammableCaptureRoute[] => {
  const allowed = new Set((presetIds ?? []).map((id) => id.trim()).filter(Boolean));
  const presets =
    allowed.size > 0
      ? KANGUR_SOCIAL_CAPTURE_PRESETS.filter((preset) => allowed.has(preset.id))
      : KANGUR_SOCIAL_CAPTURE_PRESETS;

  return presets.map((preset) => ({
    id: preset.id,
    title: preset.title,
    path: preset.path,
    description: preset.description ?? '',
    selector: preset.selector ?? null,
    waitForMs: preset.waitForMs ?? null,
    waitForSelectorMs: preset.waitForSelectorMs ?? DEFAULT_WAIT_FOR_SELECTOR_MS,
  }));
};
