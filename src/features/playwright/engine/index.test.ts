import { describe, expect, it } from 'vitest';

import * as playwrightEngine from './index';

describe('playwright engine barrel', () => {
  it('continues exposing capture defaults and validators', () => {
    expect(playwrightEngine).toHaveProperty('PLAYWRIGHT_CAPTURE_TIMEOUT_MS');
    expect(playwrightEngine).toHaveProperty('PLAYWRIGHT_DEFAULT_CAPTURE_SCRIPT');
    expect(playwrightEngine).toHaveProperty('createEmptyPlaywrightCaptureRoute');
    expect(playwrightEngine).toHaveProperty('buildCaptureRouteUrl');
    expect(playwrightEngine).toHaveProperty('resolvePlaywrightCaptureRouteUrl');
    expect(playwrightEngine).toHaveProperty('resolvePlaywrightCaptureRoutePreview');
    expect(playwrightEngine).toHaveProperty('validatePlaywrightCaptureRoutes');
  });
});
