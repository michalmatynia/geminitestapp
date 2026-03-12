import type { Page } from '@playwright/test';

type EnsureAdminSessionOptions = {
  initialNavigationTimeoutMs?: number;
  destinationNavigationTimeoutMs?: number;
  transitionTimeoutMs?: number;
};

const AUTH_SESSION_COOKIE_NAMES = new Set([
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
]);

const credentialCandidates = [
  {
    email: process.env['PLAYWRIGHT_E2E_ADMIN_EMAIL'],
    password: process.env['PLAYWRIGHT_E2E_ADMIN_PASSWORD'],
  },
  {
    email: process.env['E2E_ADMIN_EMAIL'],
    password: process.env['E2E_ADMIN_PASSWORD'],
  },
  {
    email: 'admin@example.com',
    password: 'admin123',
  },
  {
    email: 'e2e.admin@example.com',
    password: 'E2eAdmin!123',
  },
].filter(
  (
    candidate
  ): candidate is {
    email: string;
    password: string;
  } => Boolean(candidate.email && candidate.password)
);

export async function ensureAdminSession(
  page: Page,
  destination = '/admin',
  options: EnsureAdminSessionOptions = {}
): Promise<void> {
  const {
    initialNavigationTimeoutMs = 60_000,
    destinationNavigationTimeoutMs = 60_000,
    transitionTimeoutMs = 30_000,
  } = options;
  const authRequestTimeoutMs = Math.max(initialNavigationTimeoutMs, transitionTimeoutMs);
  const destinationUrl = new URL(destination, 'http://localhost');
  const matchesDestination = (url: URL): boolean =>
    url.pathname === destinationUrl.pathname &&
    (destinationUrl.search ? url.search === destinationUrl.search : true);
  const getCurrentUrl = (): URL => new URL(page.url(), 'http://localhost');
  const hasSessionCookie = async (): Promise<boolean> => {
    const cookies = await page.context().cookies();
    return cookies.some(
      (cookie) => AUTH_SESSION_COOKIE_NAMES.has(cookie.name) && cookie.value.trim().length > 0
    );
  };
  const waitForSessionCookie = async (): Promise<boolean> => {
    const deadline = Date.now() + transitionTimeoutMs;

    do {
      if (await hasSessionCookie()) {
        return true;
      }

      if (Date.now() >= deadline) {
        return false;
      }

      await page.waitForTimeout(250);
    } while (true);
  };
  const navigateToDestination = async (): Promise<void> => {
    if (!matchesDestination(getCurrentUrl())) {
      await page.goto(destination, {
        waitUntil: 'domcontentloaded',
        timeout: destinationNavigationTimeoutMs,
      });
    }

    if (!matchesDestination(getCurrentUrl())) {
      await page.waitForURL(
        (url) =>
          url.pathname === destinationUrl.pathname &&
          (destinationUrl.search ? url.search === destinationUrl.search : true),
        { timeout: transitionTimeoutMs }
      );
    }
  };
  const fetchCsrfToken = async (): Promise<{
    csrfToken: string;
    origin: string;
    signInUrl: string;
  }> => {
    const response = await page.context().request.get('/api/auth/csrf', {
      failOnStatusCode: false,
      timeout: authRequestTimeoutMs,
    });

    if (!response.ok()) {
      throw new Error(`Unable to load auth CSRF token for ${destination}: ${response.status()}.`);
    }

    const body = (await response.json().catch(() => null)) as { csrfToken?: unknown } | null;
    const csrfToken = typeof body?.csrfToken === 'string' ? body.csrfToken.trim() : '';

    if (!csrfToken) {
      throw new Error(`Missing auth CSRF token for ${destination}.`);
    }

    const responseUrl = new URL(response.url());
    const signInUrl = new URL('/auth/signin', responseUrl.origin);
    signInUrl.searchParams.set('callbackUrl', destination);

    return {
      csrfToken,
      origin: responseUrl.origin,
      signInUrl: signInUrl.toString(),
    };
  };
  const signInWithCandidate = async (candidate: { email: string; password: string }): Promise<boolean> => {
    const { csrfToken, origin, signInUrl } = await fetchCsrfToken();
    await page.context().request.post('/api/auth/callback/credentials', {
      failOnStatusCode: false,
      form: {
        email: candidate.email,
        password: candidate.password,
        csrfToken,
        callbackUrl: destination,
      },
      headers: {
        Origin: origin,
        Referer: signInUrl,
        'X-Auth-Return-Redirect': '1',
        'X-CSRF-Token': csrfToken,
      },
      timeout: authRequestTimeoutMs,
    });

    return waitForSessionCookie();
  };

  if (await hasSessionCookie()) {
    await navigateToDestination();
    return;
  }

  for (const candidate of credentialCandidates) {
    if (await signInWithCandidate(candidate)) {
      await navigateToDestination();
      return;
    }
  }

  throw new Error(`Unable to establish an admin session for ${destination}.`);
}
