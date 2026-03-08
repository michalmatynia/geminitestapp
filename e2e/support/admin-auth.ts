import type { Page } from '@playwright/test';

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
    email: 'e2e.admin@example.com',
    password: 'E2eAdmin!123',
  },
  {
    email: 'admin@example.com',
    password: 'admin123',
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
  destination = '/admin'
): Promise<void> {
  const destinationUrl = new URL(destination, 'http://localhost');

  await page.goto(`/auth/signin?callbackUrl=${encodeURIComponent(destination)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
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

    const landingPath = await page
      .waitForURL(
        (url) => url.pathname !== '/auth/signin',
        { timeout: 30_000 }
      )
      .then(() => new URL(page.url(), 'http://localhost').pathname)
      .catch(() => null);

    if (landingPath === destinationUrl.pathname) {
      return;
    }

    if (landingPath === '/admin') {
      await page.goto(destination, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      await page.waitForURL(
        (url) =>
          url.pathname === destinationUrl.pathname &&
          (destinationUrl.search ? url.search === destinationUrl.search : true),
        { timeout: 30_000 }
      );
      return;
    }
  }

  throw new Error(`Unable to establish an admin session for ${destination}.`);
}
