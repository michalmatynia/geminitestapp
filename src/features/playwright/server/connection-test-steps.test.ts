import { describe, expect, it, vi } from 'vitest';

import {
  pushPlaywrightBrowserSelectionSteps,
  pushPlaywrightStoredSessionLoadingSteps,
} from './connection-test-steps';

describe('pushPlaywrightStoredSessionLoadingSteps', () => {
  it('skips logging when no stored session is expected', () => {
    const pushStep = vi.fn();

    pushPlaywrightStoredSessionLoadingSteps({
      hasStoredSession: false,
      storageState: null,
      pushStep,
      loadedDetail: 'Stored session loaded',
      missingDetail: 'Failed to load session',
    });

    expect(pushStep).not.toHaveBeenCalled();
  });

  it('logs pending and success steps when stored session loads', () => {
    const pushStep = vi.fn();

    pushPlaywrightStoredSessionLoadingSteps({
      hasStoredSession: true,
      storageState: { cookies: [], origins: [] },
      pushStep,
      loadedDetail: 'Stored session loaded',
      missingDetail: 'Failed to load session',
    });

    expect(pushStep).toHaveBeenNthCalledWith(
      1,
      'Loading session',
      'pending',
      'Loading stored Playwright session'
    );
    expect(pushStep).toHaveBeenNthCalledWith(
      2,
      'Loading session',
      'ok',
      'Stored session loaded'
    );
  });

  it('supports non-failing missing-session details', () => {
    const pushStep = vi.fn();

    pushPlaywrightStoredSessionLoadingSteps({
      hasStoredSession: true,
      storageState: null,
      pushStep,
      loadedDetail: 'Stored session loaded successfully',
      missingDetail: 'Stored session was corrupt or invalid (skipped)',
      missingStatus: 'ok',
    });

    expect(pushStep).toHaveBeenNthCalledWith(
      2,
      'Loading session',
      'ok',
      'Stored session was corrupt or invalid (skipped)'
    );
  });
});

describe('pushPlaywrightBrowserSelectionSteps', () => {
  it('logs fallback messages followed by the final browser label', () => {
    const pushStep = vi.fn();

    pushPlaywrightBrowserSelectionSteps({
      fallbackMessages: ['Brave unavailable', 'Chrome unavailable'],
      launchLabel: 'Chromium (bundled)',
      pushStep,
    });

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
      'Chrome unavailable'
    );
    expect(pushStep).toHaveBeenNthCalledWith(
      3,
      'Browser selection',
      'ok',
      'Using Chromium (bundled).'
    );
  });
});
