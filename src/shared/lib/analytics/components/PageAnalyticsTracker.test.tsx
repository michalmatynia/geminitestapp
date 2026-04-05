// @vitest-environment jsdom

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { usePathnameMock, useSearchParamsMock, mutateMock, logClientCatchMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  mutateMock: vi.fn(),
  logClientCatchMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock('@/shared/lib/analytics/hooks/useAnalyticsQueries', () => ({
  useTrackEventMutation: () => ({
    mutate: mutateMock,
  }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: logClientCatchMock,
}));

describe('PageAnalyticsTracker', () => {
  beforeEach(() => {
    vi.resetModules();
    usePathnameMock.mockReset();
    useSearchParamsMock.mockReset();
    mutateMock.mockReset();
    logClientCatchMock.mockReset();
    document.cookie = 'pa_vid=; Max-Age=0; Path=/';
    sessionStorage.clear();
    document.title = 'Kangur';
    window.history.replaceState({}, '', '/');
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value: '',
    });
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { randomUUID: () => 'uuid-1' },
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: query.includes('dark') || query.includes('coarse'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    Object.defineProperty(window.navigator, 'connection', {
      configurable: true,
      value: {
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false,
      },
    });
    Object.defineProperty(window.navigator, 'deviceMemory', {
      configurable: true,
      value: 8,
    });
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'en-US',
    });
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      value: ['en-US', 'pl-PL'],
    });
    Object.defineProperty(window.navigator, 'hardwareConcurrency', {
      configurable: true,
      value: 8,
    });
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      configurable: true,
      value: 5,
    });
    Object.defineProperty(window.navigator, 'vendor', {
      configurable: true,
      value: 'TestVendor',
    });
    Object.defineProperty(window.navigator, 'platform', {
      configurable: true,
      value: 'MacIntel',
    });
    Object.defineProperty(window.navigator, 'doNotTrack', {
      configurable: true,
      value: '1',
    });
    Object.defineProperty(window.navigator, 'webdriver', {
      configurable: true,
      value: false,
    });
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(window.navigator, 'cookieEnabled', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(window, 'outerWidth', {
      configurable: true,
      value: 1440,
    });
    Object.defineProperty(window, 'outerHeight', {
      configurable: true,
      value: 900,
    });
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 720,
    });
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 2,
    });
    Object.defineProperty(window.screen, 'width', {
      configurable: true,
      value: 1920,
    });
    Object.defineProperty(window.screen, 'height', {
      configurable: true,
      value: 1080,
    });
    Object.defineProperty(window.screen, 'orientation', {
      configurable: true,
      value: { type: 'landscape-primary' },
    });
    Object.defineProperty(window.performance, 'getEntriesByType', {
      configurable: true,
      value: vi.fn(() => [
        {
          type: 'navigate',
          redirectCount: 1,
          responseEnd: 120.4,
          domContentLoadedEventEnd: 240.7,
          loadEventEnd: 360.2,
          duration: 400.5,
          transferSize: 1234,
          encodedBodySize: 2345,
          decodedBodySize: 3456,
        },
      ]),
    });
    mutateMock.mockImplementation((_event, options) => {
      options?.onSettled?.();
    });
  });

  it('tracks a public pageview when analytics are enabled', async () => {
    process.env['NEXT_PUBLIC_ENABLE_PAGE_ANALYTICS'] = 'true';
    process.env['NEXT_PUBLIC_ENABLE_ADMIN_PAGE_ANALYTICS'] = 'false';
    document.cookie = 'pa_vid=cookie-id; Path=/';
    sessionStorage.setItem('pa_sid', 'session-1');
    document.title = 'Kangur Products';
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value: 'https://google.com',
    });
    usePathnameMock.mockReturnValue('/products/kangur');
    useSearchParamsMock.mockReturnValue(new URLSearchParams('utm_source=google&utm_campaign=spring'));
    window.history.replaceState({}, '', '/products/kangur?utm_source=google&utm_campaign=spring');

    const { default: PageAnalyticsTracker } = await import('./PageAnalyticsTracker');

    render(<PageAnalyticsTracker />);

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'pageview',
        scope: 'public',
        path: '/products/kangur',
        search: '?utm_source=google&utm_campaign=spring',
        url: 'http://localhost:3000/products/kangur?utm_source=google&utm_campaign=spring',
        title: 'Kangur Products',
        visitorId: 'cookie-id',
        sessionId: 'session-1',
        referrer: 'https://google.com',
        language: 'en-US',
        languages: ['en-US', 'pl-PL'],
        timeZone: expect.any(String),
        utm: {
          source: 'google',
          campaign: 'spring',
        },
        viewport: { width: 1280, height: 720 },
        screen: { width: 1920, height: 1080, dpr: 2 },
        connection: {
          effectiveType: '4g',
          downlink: 10,
          rtt: 50,
          saveData: false,
        },
        meta: expect.objectContaining({
          client: expect.objectContaining({
            historyLength: expect.any(Number),
            onLine: true,
            cookieEnabled: true,
            platform: 'MacIntel',
            vendor: 'TestVendor',
            hardwareConcurrency: 8,
            deviceMemory: 8,
            maxTouchPoints: 5,
            doNotTrack: '1',
            webdriver: false,
          }),
          document: expect.objectContaining({
            visibilityState: expect.any(String),
            readyState: expect.any(String),
          }),
          window: {
            outerWidth: 1440,
            outerHeight: 900,
            screenOrientation: 'landscape-primary',
          },
          preferences: {
            colorScheme: 'dark',
            reducedMotion: false,
            contrast: 'no-preference',
            pointer: 'coarse',
          },
          performance: {
            navigationType: 'navigate',
            redirectCount: 1,
            responseEndMs: 120,
            domContentLoadedMs: 241,
            loadEventMs: 360,
            durationMs: 401,
            transferSize: 1234,
            encodedBodySize: 2345,
            decodedBodySize: 3456,
          },
        }),
      }),
      expect.objectContaining({
        onError: expect.any(Function),
        onSettled: expect.any(Function),
      })
    );
  });

  it('does not track admin pageviews when admin analytics are disabled', async () => {
    process.env['NEXT_PUBLIC_ENABLE_PAGE_ANALYTICS'] = 'true';
    process.env['NEXT_PUBLIC_ENABLE_ADMIN_PAGE_ANALYTICS'] = 'false';
    usePathnameMock.mockReturnValue('/admin/analytics');
    useSearchParamsMock.mockReturnValue(new URLSearchParams(''));

    const { default: PageAnalyticsTracker } = await import('./PageAnalyticsTracker');

    render(<PageAnalyticsTracker />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('tracks in development only when the dev analytics flag enables the client', async () => {
    delete process.env['NEXT_PUBLIC_ENABLE_PAGE_ANALYTICS'];
    process.env['NEXT_PUBLIC_ENABLE_PAGE_ANALYTICS_IN_DEV'] = 'true';
    process.env['NODE_ENV'] = 'development';
    usePathnameMock.mockReturnValue('/playground');
    useSearchParamsMock.mockReturnValue(new URLSearchParams(''));

    const { default: PageAnalyticsTracker } = await import('./PageAnalyticsTracker');
    render(<PageAnalyticsTracker />);

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'public',
        path: '/playground',
      }),
      expect.any(Object)
    );
  });

  it('deduplicates repeated pageviews within the dedupe window and while a pageview is inflight', async () => {
    process.env['NEXT_PUBLIC_ENABLE_PAGE_ANALYTICS'] = 'true';
    process.env['NEXT_PUBLIC_ENABLE_ADMIN_PAGE_ANALYTICS'] = 'true';
    process.env['NODE_ENV'] = 'production';
    usePathnameMock.mockReturnValue('/admin/analytics');
    useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=summary'));
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(2_000)
      .mockReturnValueOnce(5_000);

    const { default: PageAnalyticsTracker } = await import('./PageAnalyticsTracker');

    const firstMutate = vi.fn();
    firstMutate.mockImplementationOnce(() => {});
    mutateMock.mockImplementation(firstMutate);

    const firstRender = render(<PageAnalyticsTracker />);
    await waitFor(() => expect(firstMutate).toHaveBeenCalledTimes(1));
    firstRender.unmount();

    render(<PageAnalyticsTracker />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(firstMutate).toHaveBeenCalledTimes(1);
  });

  it('logs time zone resolution failures and still tracks the pageview without timeZone metadata', async () => {
    process.env['NEXT_PUBLIC_ENABLE_PAGE_ANALYTICS'] = 'true';
    process.env['NEXT_PUBLIC_ENABLE_ADMIN_PAGE_ANALYTICS'] = 'false';
    process.env['NODE_ENV'] = 'production';
    usePathnameMock.mockReturnValue('/products/tz');
    useSearchParamsMock.mockReturnValue(new URLSearchParams(''));

    const originalDateTimeFormat = Intl.DateTimeFormat;
    Intl.DateTimeFormat = vi.fn(() => {
      throw new Error('timezone unavailable');
    }) as unknown as typeof Intl.DateTimeFormat;

    try {
      const { default: PageAnalyticsTracker } = await import('./PageAnalyticsTracker');
      render(<PageAnalyticsTracker />);

      await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
      expect(logClientCatchMock).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          source: 'page-analytics-tracker',
          action: 'readTimeZone',
        })
      );
      expect(mutateMock).toHaveBeenCalledWith(
        expect.not.objectContaining({
          timeZone: expect.anything(),
        }),
        expect.any(Object)
      );
    } finally {
      Intl.DateTimeFormat = originalDateTimeFormat;
    }
  });

  it('does not track when analytics are explicitly disabled or the pathname is blank', async () => {
    process.env['NEXT_PUBLIC_ENABLE_PAGE_ANALYTICS'] = 'false';
    process.env['NODE_ENV'] = 'production';
    usePathnameMock.mockReturnValue('/products/disabled');
    useSearchParamsMock.mockReturnValue(new URLSearchParams(''));

    const disabledImport = await import('./PageAnalyticsTracker');
    render(<disabledImport.default />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mutateMock).not.toHaveBeenCalled();

    vi.resetModules();
    usePathnameMock.mockReturnValue('');
    useSearchParamsMock.mockReturnValue(new URLSearchParams(''));
    process.env['NEXT_PUBLIC_ENABLE_PAGE_ANALYTICS'] = 'true';

    const blankPathImport = await import('./PageAnalyticsTracker');
    render(<blankPathImport.default />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('generates fallback visitor and session ids when crypto UUIDs are unavailable', async () => {
    process.env['NEXT_PUBLIC_ENABLE_PAGE_ANALYTICS'] = 'true';
    process.env['NODE_ENV'] = 'production';
    usePathnameMock.mockReturnValue('/products/fallback-id');
    useSearchParamsMock.mockReturnValue(new URLSearchParams(''));
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {},
    });
    vi.spyOn(Date, 'now').mockReturnValue(12_345);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456);
    Object.defineProperty(window.navigator, 'connection', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window.performance, 'getEntriesByType', {
      configurable: true,
      value: undefined,
    });

    const { default: PageAnalyticsTracker } = await import('./PageAnalyticsTracker');
    render(<PageAnalyticsTracker />);

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        visitorId: '9ix-4fzyo82mvyq',
        sessionId: '9ix-4fzyo82mvyq',
        meta: expect.objectContaining({
          client: expect.objectContaining({
            webdriver: false,
          }),
          preferences: {
            colorScheme: null,
            reducedMotion: null,
            contrast: null,
            pointer: null,
          },
          performance: null,
        }),
      }),
      expect.any(Object)
    );
    expect(document.cookie).toContain('pa_vid=9ix-4fzyo82mvyq');
    expect(sessionStorage.getItem('pa_sid')).toBe('9ix-4fzyo82mvyq');
  });
});
