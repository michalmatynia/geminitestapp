import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { isSensitiveKey } from '@/shared/lib/observability/log-redaction';
import {
  logClientError,
  setClientErrorBaseContext,
} from '@/shared/utils/observability/client-error-logger';

// Mock dependencies
vi.mock('@/shared/lib/observability/log-redaction', () => ({
  isSensitiveKey: vi.fn(() => false),
  REDACTED_VALUE: '[REDACTED]',
  truncateString: vi.fn((s) => s),
}));

describe('client-error-logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock navigator and window
    vi.stubGlobal('navigator', {
      userAgent: 'TestAgent',
      sendBeacon: vi.fn(() => true),
    });
    vi.stubGlobal('window', {
      location: { href: 'http://localhost/test' },
      addEventListener: vi.fn(),
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds correct payload for Error object and sends via beacon', () => {
    const error = new Error('Client side crash');
    error.stack = 'test stack';

    logClientError(error);

    expect(navigator.sendBeacon).toHaveBeenCalled();
    const [url] = vi.mocked(navigator.sendBeacon).mock.calls[0]!;
    expect(url).toBe('/api/client-errors');
  });

  it('includes extra context and base context in payload', () => {
    setClientErrorBaseContext({ appVersion: '1.0.0' });

    // Switch to fetch by making sendBeacon fail
    vi.stubGlobal('navigator', {
      ...navigator,
      sendBeacon: undefined,
    });

    logClientError('String error', { context: { component: 'Header' } });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/client-errors',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"message":"String error"'),
      })
    );

    const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0]![1]!.body as string);
    expect(body.context).toMatchObject({
      appVersion: '1.0.0',
      component: 'Header',
    });
  });

  it('redacts sensitive keys in context', () => {
    const mockedIsSensitive = vi.mocked(isSensitiveKey);
    mockedIsSensitive.mockImplementation((key: string) => key === 'password');

    vi.stubGlobal('navigator', {
      ...navigator,
      sendBeacon: undefined,
    }); // Force fetch

    logClientError('Login fail', { context: { password: 'secret123', user: 'admin' } });

    const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0]![1]!.body as string);
    expect(body.context.password).toBe('[REDACTED]');
    expect(body.context.user).toBe('admin');
  });
});
