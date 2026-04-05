// Script, timeout, and empty-route factory are defined in the shared AI-Paths layer
// so that `definitions/index.ts` can reference them without a features → shared violation.
export {
  PLAYWRIGHT_CAPTURE_TIMEOUT_MS,
  PLAYWRIGHT_DEFAULT_CAPTURE_SCRIPT,
  createEmptyPlaywrightCaptureRoute,
  buildCaptureRouteUrl,
} from '@/shared/lib/ai-paths/core/playwright/capture-defaults';
