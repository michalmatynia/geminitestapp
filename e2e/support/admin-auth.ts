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
const SIGN_IN_PATHNAME = '/auth/signin';

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
  const destinationUrl = new URL(destination, 'http://localhost');
  const invalidCredentialsAlert = page
    .getByRole('alert')
    .filter({ hasText: /invalid (email or password|credentials)\.?/i })
    .first();
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
  const waitForNonSignInUrl = async (timeoutMs: number): Promise<URL | null> => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const currentUrl = getCurrentUrl();
      if (currentUrl.pathname !== SIGN_IN_PATHNAME) {
        return currentUrl;
      }

      await page.waitForTimeout(250);
    }

    return null;
  };
  const isNavigationRaceError = (error: unknown): boolean => {
    if (!(error instanceof Error)) {
      return false;
    }

    return (
      error.message.includes('net::ERR_ABORTED') ||
      error.message.toLowerCase().includes('frame was detached')
    );
  };
  const ensureDestinationUrl = async (): Promise<void> => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (matchesDestination(getCurrentUrl())) {
        return;
      }

      try {
        await page.goto(destination, {
          waitUntil: 'domcontentloaded',
          timeout: destinationNavigationTimeoutMs,
        });
      } catch (error) {
        if (!isNavigationRaceError(error)) {
          throw error;
        }
      }

      if (matchesDestination(getCurrentUrl())) {
        return;
      }

      const settledUrl = await waitForNonSignInUrl(Math.min(transitionTimeoutMs, 5_000));
      if (settledUrl && matchesDestination(settledUrl)) {
        return;
      }
    }

    await page.waitForURL(
      (url) =>
        url.pathname === destinationUrl.pathname &&
        (destinationUrl.search ? url.search === destinationUrl.search : true),
      { timeout: transitionTimeoutMs }
    );
  };
  const waitForSessionCookieOrNavigation = async (): Promise<{
    hasSessionCookie: boolean;
    invalidCredentials: boolean;
    landingUrl: URL | null;
  }> => {
    const deadline = Date.now() + transitionTimeoutMs;

    while (Date.now() < deadline) {
      const currentUrl = getCurrentUrl();
      if (currentUrl.pathname !== SIGN_IN_PATHNAME) {
        return {
          hasSessionCookie: true,
          invalidCredentials: false,
          landingUrl: currentUrl,
        };
      }

      if (await hasSessionCookie()) {
        return {
          hasSessionCookie: true,
          invalidCredentials: false,
          landingUrl: null,
        };
      }

      if (await invalidCredentialsAlert.isVisible().catch(() => false)) {
        return {
          hasSessionCookie: false,
          invalidCredentials: true,
          landingUrl: null,
        };
      }

      await page.waitForTimeout(250);
    }

    return {
      hasSessionCookie: false,
      invalidCredentials: false,
      landingUrl: null,
    };
  };

  await page.goto(`/auth/signin?callbackUrl=${encodeURIComponent(destination)}`, {
    waitUntil: 'domcontentloaded',
    timeout: initialNavigationTimeoutMs,
  });
  const signInHeading = page.getByRole('heading', { name: /sign in/i });
  if (!(await signInHeading.isVisible().catch(() => false))) {
    return;
  }

  for (const candidate of credentialCandidates) {
    await page.getByRole('textbox', { name: /email/i }).waitFor({ state: 'visible', timeout: 20_000 });
    await page.getByRole('textbox', { name: /email/i }).fill(candidate.email);
    await page.getByRole('textbox', { name: /password/i }).fill(candidate.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    const {
      hasSessionCookie: sessionReady,
      invalidCredentials,
      landingUrl,
    } = await waitForSessionCookieOrNavigation();

    if (landingUrl && matchesDestination(landingUrl)) {
      return;
    }

    if (invalidCredentials) {
      continue;
    }

    if (sessionReady) {
      const settledUrl = landingUrl ?? (await waitForNonSignInUrl(Math.min(transitionTimeoutMs, 10_000)));
      if (settledUrl && matchesDestination(settledUrl)) {
        return;
      }

      if (settledUrl || (await hasSessionCookie())) {
        await ensureDestinationUrl();
      }

      return;
    }
  }

  throw new Error(`Unable to establish an admin session for ${destination}.`);
}
