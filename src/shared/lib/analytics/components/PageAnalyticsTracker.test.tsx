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
    mutateMock.mockImplementation((_event, options) => {
      options?.onSettled?.();
    });
  });

  it('tracks a public pageview when analytics are enabled', async () => {
    process.env['NEXT_PUBLIC_ENABLE_PAGE_ANALYTICS'] = 'true';
    process.env['NEXT_PUBLIC_ENABLE_ADMIN_PAGE_ANALYTICS'] = 'false';
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
        title: 'Kangur',
        visitorId: 'uuid-1',
        sessionId: 'uuid-1',
        utm: {
          source: 'google',
          campaign: 'spring',
        },
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
});
