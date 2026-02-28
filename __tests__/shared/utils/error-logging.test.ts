import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  logClientError,
  initClientErrorReporting,
} from '@/shared/utils/observability/client-error-logger';

describe('Centralized Error Logging', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    vi.stubGlobal('navigator', {
      userAgent: 'test-agent',
      sendBeacon: vi.fn().mockReturnValue(true),
    });
    vi.stubGlobal('window', {
      location: { href: 'http://localhost/test' },
      addEventListener: vi.fn(),
    });
    // Mock Blob since it's used in logClientError
    vi.stubGlobal(
      'Blob',
      class {
        parts: string[];
        options: BlobPropertyBag | undefined;
        constructor(parts: string[], options?: BlobPropertyBag) {
          this.parts = parts;
          this.options = options;
        }
        async text() {
          return this.parts.join('');
        }
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should log an Error object to the centralized endpoint', async () => {
    const error = new Error('Test error message');
    logClientError(error);

    expect(navigator.sendBeacon).toHaveBeenCalled();
    const [url, blob] = vi.mocked(navigator.sendBeacon).mock.calls[0] as [string, Blob];
    expect(url).toBe('/api/client-errors');

    // Convert blob back to text to verify payload
    const data = await blob.text();
    const payload = JSON.parse(data);
    expect(payload.message).toBe('Test error message');
    expect(payload.name).toBe('Error');
    expect(payload.url).toBe('http://localhost/test');
    expect(payload.userAgent).toBe('test-agent');
  });

  it('should log a string error message', async () => {
    logClientError('Simple string error');

    const blob = vi.mocked(navigator.sendBeacon).mock.calls[0]?.[1] as Blob;
    const data = await blob.text();
    const payload = JSON.parse(data);
    expect(payload.message).toBe('Simple string error');
  });

  it('should include additional context in the log', async () => {
    const error = new Error('Context test');
    const context = { userId: 'user-123', feature: 'test-feature' };
    logClientError(error, { context });

    const blob = vi.mocked(navigator.sendBeacon).mock.calls[0]?.[1] as Blob;
    const data = await blob.text();
    const payload = JSON.parse(data);
    expect(payload.context).toMatchObject(context);
  });

  it('should fall back to fetch if sendBeacon is unavailable or fails', () => {
    (navigator as unknown as { sendBeacon: undefined }).sendBeacon = undefined;

    logClientError('Fetch fallback test');

    expect(fetch).toHaveBeenCalledWith(
      '/api/client-errors',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      })
    );
  });

  it('should attach global error listeners and ignore opaque window errors', () => {
    initClientErrorReporting();
    expect(window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith(
      'unhandledrejection',
      expect.any(Function)
    );

    const errorHandler = vi
      .mocked(window.addEventListener)
      .mock.calls.find(([eventName]) => eventName === 'error')?.[1] as
      | ((event: ErrorEvent) => void)
      | undefined;

    expect(errorHandler).toBeTypeOf('function');

    errorHandler?.({
      message: 'Script error.',
      filename: 'http://cdn.example.com/app.js',
      lineno: 0,
      colno: 0,
      error: undefined,
    } as ErrorEvent);

    expect(navigator.sendBeacon).not.toHaveBeenCalled();
  });
});
