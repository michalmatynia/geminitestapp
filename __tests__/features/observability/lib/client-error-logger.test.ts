/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setClientLoggingControls } from '@/shared/lib/observability/logging-controls-client';
import {
  logClientError,
  resetClientErrorLoggerStateForTests,
} from '@/shared/utils/observability/client-error-logger';

describe('client-error-logger', () => {
  beforeEach(() => {
    resetClientErrorLoggerStateForTests();
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    Object.defineProperty(window.navigator, 'sendBeacon', {
      configurable: true,
      value: vi.fn().mockReturnValue(true),
    });
  });

  it('does not send client errors when error logging is disabled', () => {
    setClientLoggingControls({
      infoEnabled: true,
      activityEnabled: true,
      errorEnabled: false,
    });

    logClientError(new Error('suppressed client error'));

    expect(window.navigator.sendBeacon).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends client errors when error logging is enabled', () => {
    setClientLoggingControls({
      infoEnabled: true,
      activityEnabled: true,
      errorEnabled: true,
    });

    logClientError(new Error('reported client error'));

    expect(window.navigator.sendBeacon).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not send info-level client reports when info logging is disabled', () => {
    setClientLoggingControls({
      infoEnabled: false,
      activityEnabled: true,
      errorEnabled: true,
    });

    logClientError(new Error('suppressed info report'), {
      context: {
        level: 'info',
        source: 'useAiPathTriggerEvent',
      },
    });

    expect(window.navigator.sendBeacon).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not send warn-level client reports when error logging is disabled', () => {
    setClientLoggingControls({
      infoEnabled: true,
      activityEnabled: true,
      errorEnabled: false,
    });

    logClientError(new Error('suppressed warn report'), {
      context: {
        level: 'warn',
        source: 'query-middleware',
      },
    });

    expect(window.navigator.sendBeacon).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
