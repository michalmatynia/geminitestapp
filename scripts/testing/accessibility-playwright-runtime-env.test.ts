import { describe, expect, it } from 'vitest';

import { buildAccessibilityPlaywrightRuntimeEnv } from './lib/accessibility-playwright-runtime-env.mjs';

describe('buildAccessibilityPlaywrightRuntimeEnv', () => {
  it('disables queue workers by default for accessibility runtimes', () => {
    expect(buildAccessibilityPlaywrightRuntimeEnv({ env: {} })).toEqual({
      DISABLE_QUEUE_WORKERS: 'true',
    });
  });

  it('prefers a dedicated runtime override when provided', () => {
    expect(
      buildAccessibilityPlaywrightRuntimeEnv({
        env: {
          DISABLE_QUEUE_WORKERS: 'true',
          PLAYWRIGHT_RUNTIME_DISABLE_QUEUE_WORKERS: 'false',
        },
      })
    ).toEqual({
      DISABLE_QUEUE_WORKERS: 'false',
      PLAYWRIGHT_RUNTIME_DISABLE_QUEUE_WORKERS: 'false',
    });
  });

  it('falls back to the process-wide queue worker setting', () => {
    expect(
      buildAccessibilityPlaywrightRuntimeEnv({
        env: {
          DISABLE_QUEUE_WORKERS: 'false',
          PATH: '/usr/bin',
        },
      })
    ).toEqual({
      DISABLE_QUEUE_WORKERS: 'false',
      PATH: '/usr/bin',
    });
  });
});
