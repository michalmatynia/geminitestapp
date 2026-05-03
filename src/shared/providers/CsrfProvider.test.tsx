import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CsrfProvider,
  shouldInstallGlobalCsrfFetchPatch,
} from '@/shared/providers/CsrfProvider';
import { CSRF_HEADER_NAME } from '@/shared/lib/security/csrf-client';

type TestCsrfWindow = Window &
  typeof globalThis & {
    __csrfFetchPatched?: boolean;
    __csrfOriginalFetch?: typeof window.fetch;
  };

const csrfWindow = (): TestCsrfWindow => window as TestCsrfWindow;

const clearCsrfCookie = (): void => {
  document.cookie = 'csrf-token=; Path=/; Max-Age=0';
};

describe('shouldInstallGlobalCsrfFetchPatch', () => {
  it('does not install the global fetch patch during development by default', () => {
    expect(shouldInstallGlobalCsrfFetchPatch('development')).toBe(false);
    expect(shouldInstallGlobalCsrfFetchPatch('development', 'false')).toBe(false);
  });

  it('allows explicitly enabling the development fetch patch', () => {
    expect(shouldInstallGlobalCsrfFetchPatch('development', 'true')).toBe(true);
  });

  it('keeps the global fetch patch outside development', () => {
    expect(shouldInstallGlobalCsrfFetchPatch('test')).toBe(true);
    expect(shouldInstallGlobalCsrfFetchPatch('production')).toBe(true);
  });
});

describe('CsrfProvider', () => {
  let originalFetch: typeof window.fetch;

  beforeEach(() => {
    originalFetch = window.fetch;
    clearCsrfCookie();
    delete csrfWindow().__csrfFetchPatched;
    delete csrfWindow().__csrfOriginalFetch;
  });

  afterEach(() => {
    window.fetch = originalFetch;
    clearCsrfCookie();
    delete csrfWindow().__csrfFetchPatched;
    delete csrfWindow().__csrfOriginalFetch;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('seeds the CSRF cookie but leaves fetch unwrapped during development by default', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    window.fetch = fetchMock;

    render(<CsrfProvider />);

    await waitFor(() => {
      expect(document.cookie).toContain('csrf-token=');
    });

    expect(csrfWindow().__csrfFetchPatched).not.toBe(true);
    expect(window.fetch).toBe(fetchMock);
  });

  it('adds the CSRF header to unsafe same-origin fetches when the patch is installed', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    window.fetch = fetchMock as typeof window.fetch;
    document.cookie = 'csrf-token=token-a; Path=/';

    render(<CsrfProvider />);

    await waitFor(() => {
      expect(csrfWindow().__csrfFetchPatched).toBe(true);
    });

    await window.fetch('/api/example', { method: 'POST' });

    const [, init] = fetchMock.mock.calls.at(-1) ?? [];
    expect(init?.method).toBe('POST');
    expect(init?.headers).toBeInstanceOf(Headers);
    expect((init?.headers as Headers).get(CSRF_HEADER_NAME)).toBe('token-a');
  });
});
