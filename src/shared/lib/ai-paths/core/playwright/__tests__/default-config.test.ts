import { describe, expect, it } from 'vitest';

import {
  createDefaultPlaywrightConfig,
  normalizePlaywrightConfig,
} from '@/shared/lib/ai-paths/core/playwright/default-config';

describe('playwright default config helpers', () => {
  it('creates isolated default config instances', () => {
    const first = createDefaultPlaywrightConfig();
    const second = createDefaultPlaywrightConfig();

    expect(first).not.toBe(second);
    expect(first.capture).not.toBe(second.capture);

    if (first.capture) {
      first.capture.trace = true;
    }
    expect(second.capture?.trace).toBe(false);
  });

  it('normalizes missing fields with defaults', () => {
    const normalized = normalizePlaywrightConfig({
      script: 'export default async function run() {}',
    });

    expect(normalized.script).toBe('export default async function run() {}');
    expect(normalized.waitForResult).toBe(true);
    expect(normalized.timeoutMs).toBe(120000);
    expect(normalized.browserEngine).toBe('chromium');
    expect(normalized.capture).toEqual({
      screenshot: true,
      html: false,
      video: false,
      trace: false,
    });
  });

  it('preserves explicit overrides', () => {
    const normalized = normalizePlaywrightConfig({
      personaId: 'persona-1',
      script: 'export default async function run() {}',
      waitForResult: false,
      timeoutMs: 2000,
      browserEngine: 'firefox',
      startUrlTemplate: 'https://example.com/{{entityId}}',
      launchOptionsJson: '{"headless":false}',
      contextOptionsJson: '{"viewport":{"width":1200,"height":800}}',
      settingsOverrides: { slowMo: 55 },
      capture: {
        screenshot: false,
        html: true,
        video: true,
        trace: true,
      },
    });

    expect(normalized).toMatchObject({
      personaId: 'persona-1',
      waitForResult: false,
      timeoutMs: 2000,
      browserEngine: 'firefox',
      startUrlTemplate: 'https://example.com/{{entityId}}',
      launchOptionsJson: '{"headless":false}',
      contextOptionsJson: '{"viewport":{"width":1200,"height":800}}',
      settingsOverrides: { slowMo: 55 },
      capture: {
        screenshot: false,
        html: true,
        video: true,
        trace: true,
      },
    });
  });
});
