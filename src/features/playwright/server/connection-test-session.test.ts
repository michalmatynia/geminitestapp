import { beforeEach, describe, expect, it, vi } from 'vitest';

const { openPlaywrightConnectionPageSessionMock } = vi.hoisted(() => ({
  openPlaywrightConnectionPageSessionMock: vi.fn(),
}));

vi.mock('./browser-session', () => ({
  openPlaywrightConnectionPageSession: (...args: unknown[]) =>
    openPlaywrightConnectionPageSessionMock(...args),
}));

import { openPlaywrightConnectionTestSession } from './connection-test-session';

describe('openPlaywrightConnectionTestSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    openPlaywrightConnectionPageSessionMock.mockResolvedValue({
      runtime: { settings: { headless: true } },
      instance: null,
      browser: {},
      context: {},
      page: { id: 'page-1' },
      launchLabel: 'Chromium (bundled)',
      fallbackMessages: ['Brave unavailable'],
      close: vi.fn(),
    });
  });

  it('logs launch and browser-selection steps around the shared page session opener', async () => {
    const pushStep = vi.fn();

    const session = await openPlaywrightConnectionTestSession({
      connection: { id: 'connection-1' } as never,
      runtime: { settings: { headless: true } } as never,
      headless: false,
      pushStep,
      launchStep: {
        stepName: 'Launching browser',
        pendingDetail: 'Starting isolated Chromium instance',
        successDetail: 'Browser ready',
      },
    });

    expect(openPlaywrightConnectionPageSessionMock).toHaveBeenCalledWith({
      connection: { id: 'connection-1' },
      runtime: { settings: { headless: true } },
      headless: false,
    });
    expect(pushStep).toHaveBeenNthCalledWith(
      1,
      'Launching browser',
      'pending',
      'Starting isolated Chromium instance'
    );
    expect(pushStep).toHaveBeenNthCalledWith(
      2,
      'Browser selection',
      'ok',
      'Brave unavailable'
    );
    expect(pushStep).toHaveBeenNthCalledWith(
      3,
      'Browser selection',
      'ok',
      'Using Chromium (bundled).'
    );
    expect(pushStep).toHaveBeenNthCalledWith(
      4,
      'Launching browser',
      'ok',
      'Browser ready'
    );
    expect(session.page).toEqual({ id: 'page-1' });
  });

  it('supports calls without launch step logging', async () => {
    const pushStep = vi.fn();

    await openPlaywrightConnectionTestSession({
      connection: { id: 'connection-1' } as never,
      pushStep,
    });

    expect(pushStep).toHaveBeenCalledTimes(2);
    expect(pushStep).toHaveBeenNthCalledWith(
      1,
      'Browser selection',
      'ok',
      'Brave unavailable'
    );
    expect(pushStep).toHaveBeenNthCalledWith(
      2,
      'Browser selection',
      'ok',
      'Using Chromium (bundled).'
    );
  });
});
