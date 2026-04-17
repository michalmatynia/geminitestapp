import type { Page } from '@playwright/test';

type EnsureAdminSessionOptions = {
  initialNavigationTimeoutMs?: number;
  destinationNavigationTimeoutMs?: number;
  transitionTimeoutMs?: number;
  sessionCookieTimeoutMs?: number;
};

const AUTH_SESSION_COOKIE_NAMES = new Set([
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
]);

const isRecoverableNavigationAbort = (error: unknown): boolean => {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return (
    message.includes('net::ERR_ABORTED') ||
    message.includes('frame was detached') ||
    message.includes('Timeout') ||
    message.includes('timed out')
  );
};

const isRecoverableAuthRequestError = (error: unknown): boolean => {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return (
    message.includes('ECONNRESET') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ERR_CONNECTION_RESET') ||
    message.includes('socket hang up') ||
    message.includes('Timeout') ||
    message.includes('timed out')
  );
};

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
    initialNavigationTimeoutMs = 180_000,
    destinationNavigationTimeoutMs = 180_000,
    transitionTimeoutMs = 90_000,
    sessionCookieTimeoutMs = 5_000,
  } = options;
  const authRequestTimeoutMs = Math.min(
    Math.max(initialNavigationTimeoutMs, transitionTimeoutMs),
    90_000
  );
  const testAuthIp = `203.0.113.${Math.floor(Math.random() * 200) + 20}`;
  const destinationUrl = new URL(destination, 'http://localhost');
  const matchesDestination = (url: URL): boolean =>
    url.pathname === destinationUrl.pathname &&
    (destinationUrl.search ? url.search === destinationUrl.search : true);
  const getCurrentUrl = (): URL => new URL(page.url(), 'http://localhost');
  const getCsrfCookieValue = async (): Promise<string> => {
    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find((cookie) => cookie.name === 'csrf-token');
    return csrfCookie?.value?.trim() ?? '';
  };
  const hasSessionCookie = async (): Promise<boolean> => {
    const cookies = await page.context().cookies();
    return cookies.some(
      (cookie) => AUTH_SESSION_COOKIE_NAMES.has(cookie.name) && cookie.value.trim().length > 0
    );
  };
  const waitForSessionCookie = async (timeoutMs = sessionCookieTimeoutMs): Promise<boolean> => {
    const deadline = Date.now() + timeoutMs;

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
      let lastError: unknown = null;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          await page.goto(destination, {
            waitUntil: 'domcontentloaded',
            timeout: destinationNavigationTimeoutMs,
          });
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          if (!isRecoverableNavigationAbort(error) || attempt === 2) {
            throw error;
          }
          await page.waitForTimeout(500 * attempt);
        }
      }
      if (lastError) {
        throw lastError;
      }
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
  const withAuthRequestRetry = async <T>(task: () => Promise<T>, attemptLimit = 3): Promise<T> => {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= attemptLimit; attempt += 1) {
      try {
        return await task();
      } catch (error) {
        lastError = error;
        if (!isRecoverableAuthRequestError(error) || attempt === attemptLimit) {
          throw error;
        }

        await page.waitForTimeout(250 * attempt);
      }
    }

    throw lastError ?? new Error('Unable to complete auth request.');
  };
  const fetchCsrfToken = async (): Promise<{
    csrfToken: string;
    origin: string;
    signInUrl: string;
  }> => {
    const response = await withAuthRequestRetry(
      () =>
        page.context().request.get('/api/auth/csrf', {
          failOnStatusCode: false,
          headers: {
            'x-forwarded-for': testAuthIp,
            'x-real-ip': testAuthIp,
          },
          timeout: authRequestTimeoutMs,
        }),
      3
    );

    const body = response.ok()
      ? ((await response.json().catch(() => null)) as { csrfToken?: unknown } | null)
      : null;
    const csrfTokenFromBody = typeof body?.csrfToken === 'string' ? body.csrfToken.trim() : '';
    const csrfToken = csrfTokenFromBody || (response.status() === 429 ? await getCsrfCookieValue() : '');

    if (!csrfToken) {
      if (!response.ok()) {
        throw new Error(`Unable to load auth CSRF token for ${destination}: ${response.status()}.`);
      }
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
    await withAuthRequestRetry(
      () =>
        page.context().request.post('/api/auth/callback/credentials', {
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
            'x-forwarded-for': testAuthIp,
            'x-real-ip': testAuthIp,
          },
          timeout: authRequestTimeoutMs,
        }),
      3
    );

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
