/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { chromiumLaunchMock } = vi.hoisted(() => ({
  chromiumLaunchMock: vi.fn(),
}));

vi.mock('@/shared/lib/playwright/runtime', () => ({
  getPlaywrightRuntime: () => ({
    chromium: {
      launch: chromiumLaunchMock,
    },
  }),
}));

import {
  launchPlaywrightBrowser,
  resolvePlaywrightBrowserLaunchOptions,
} from '@/shared/lib/playwright/browser-launch';

describe('playwright browser launch resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    delete process.env['PLAYWRIGHT_BRAVE_EXECUTABLE_PATH'];
  });

  it('uses the explicit Brave executable override for brave and auto preferences', () => {
    vi.stubEnv('PLAYWRIGHT_BRAVE_EXECUTABLE_PATH', '/tmp/brave-browser');

    expect(resolvePlaywrightBrowserLaunchOptions('brave')).toEqual({
      executablePath: '/tmp/brave-browser',
    });
    expect(resolvePlaywrightBrowserLaunchOptions('auto')).toEqual({
      executablePath: '/tmp/brave-browser',
    });
  });

  it('keeps chrome and chromium launch modes unchanged', () => {
    expect(resolvePlaywrightBrowserLaunchOptions('chrome')).toEqual({ channel: 'chrome' });
    expect(resolvePlaywrightBrowserLaunchOptions('chromium')).toEqual({});
  });

  it('tries auto launch candidates in Brave, Chrome, Chromium order', async () => {
    vi.stubEnv('PLAYWRIGHT_BRAVE_EXECUTABLE_PATH', '/tmp/brave-browser');
    chromiumLaunchMock
      .mockRejectedValueOnce(new Error('brave unavailable'))
      .mockRejectedValueOnce(new Error('chrome unavailable'))
      .mockResolvedValueOnce({ id: 'browser-1' });

    const result = await launchPlaywrightBrowser('auto', { headless: true });

    expect(chromiumLaunchMock.mock.calls).toEqual([
      [{ headless: true, executablePath: '/tmp/brave-browser' }],
      [{ headless: true, channel: 'chrome' }],
      [{ headless: true }],
    ]);
    expect(result).toMatchObject({
      browser: { id: 'browser-1' },
      label: 'Chromium (bundled)',
      fallbackMessages: [
        'Brave unavailable: brave unavailable',
        'Chrome unavailable: chrome unavailable',
      ],
    });
  });
});
