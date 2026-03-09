import { expect, test, type Page } from '@playwright/test';

import { KANGUR_AI_TUTOR_GUEST_INTRO_STORAGE_KEY } from '@/features/kangur/ui/components/KangurAiTutorWidget.shared';

import { mockKangurTutorEnvironment } from '../../support/kangur-tutor-fixtures';

type MockAnonymousGuestTutorIntroOptions = {
  shouldShow?: boolean;
};

const ROUTE_BOOT_TIMEOUT_MS = 45_000;
const ROUTE_INITIAL_GOTO_TIMEOUT_MS = 90_000;

const gotoGuestTutorRoute = async (page: Page): Promise<void> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto('/kangur', {
        waitUntil: 'commit',
        timeout: ROUTE_INITIAL_GOTO_TIMEOUT_MS,
      });
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      if (!(error instanceof Error) || !error.message.includes('ERR_ABORTED') || attempt > 0) {
        throw error;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  await expect(page.getByTestId('kangur-route-shell')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByTestId('kangur-route-content')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
};

const readGuestIntroStatus = async (page: Page): Promise<string | null> =>
  page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as { status?: unknown } | null;
      return typeof parsed?.status === 'string' ? parsed.status : null;
    } catch {
      return null;
    }
  }, KANGUR_AI_TUTOR_GUEST_INTRO_STORAGE_KEY);

async function mockAnonymousGuestTutorIntro(
  page: Page,
  options: MockAnonymousGuestTutorIntroOptions = {}
): Promise<{ getGuestIntroChecks: () => number }> {
  const { shouldShow = true } = options;
  let guestIntroChecks = 0;

  await mockKangurTutorEnvironment(page);

  await page.route('**/api/kangur/auth/me**', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unauthorized' }),
    });
  });

  await page.route('**/api/kangur/ai-tutor/guest-intro**', async (route) => {
    guestIntroChecks += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        shouldShow,
        reason: shouldShow ? 'first_visit' : 'seen_before',
      }),
    });
  });

  return {
    getGuestIntroChecks: () => guestIntroChecks,
  };
}

test.describe('Kangur AI Tutor guest intro', () => {
  test('shows the first-visit anonymous prompt with Yes and No actions', async ({ page }) => {
    const { getGuestIntroChecks } = await mockAnonymousGuestTutorIntro(page);

    await gotoGuestTutorRoute(page);

    const guestIntro = page.getByTestId('kangur-ai-tutor-guest-intro');

    await expect(guestIntro).toBeVisible();
    await expect(guestIntro).toContainText('Do you need help with the website?');
    await expect(guestIntro.getByRole('button', { name: 'Yes' })).toBeVisible();
    await expect(guestIntro.getByRole('button', { name: 'No' })).toBeVisible();
    await expect.poll(() => getGuestIntroChecks()).toBe(1);
    await expect.poll(() => readGuestIntroStatus(page)).toBe('shown');
  });

  test('dismisses the anonymous prompt and keeps it suppressed after reload', async ({ page }) => {
    const { getGuestIntroChecks } = await mockAnonymousGuestTutorIntro(page);

    await gotoGuestTutorRoute(page);

    const guestIntro = page.getByTestId('kangur-ai-tutor-guest-intro');
    await expect(guestIntro).toBeVisible();

    await guestIntro.getByRole('button', { name: 'No' }).click();

    await expect(guestIntro).toHaveCount(0);
    await expect.poll(() => readGuestIntroStatus(page)).toBe('dismissed');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('kangur-route-shell')).toBeVisible();
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-guest-assistance')).toHaveCount(0);
    await expect.poll(() => getGuestIntroChecks()).toBe(1);
  });

  test('opens guest assistance after Yes and can launch the login modal', async ({ page }) => {
    const { getGuestIntroChecks } = await mockAnonymousGuestTutorIntro(page);

    await gotoGuestTutorRoute(page);

    await page
      .getByTestId('kangur-ai-tutor-guest-intro')
      .getByRole('button', { name: 'Yes' })
      .click();

    const guestAssistance = page.getByTestId('kangur-ai-tutor-guest-assistance');

    await expect(guestAssistance).toBeVisible();
    await expect(guestAssistance).toContainText('I can help you get started.');
    await expect(guestAssistance.getByRole('button', { name: 'Open login' })).toBeVisible();
    await expect(
      guestAssistance.getByRole('button', { name: 'Continue browsing' })
    ).toBeVisible();
    await expect(guestAssistance.getByRole('link', { name: 'Login page' })).toBeVisible();
    await expect.poll(() => readGuestIntroStatus(page)).toBe('accepted');
    await expect.poll(() => getGuestIntroChecks()).toBe(1);

    await guestAssistance.getByRole('button', { name: 'Open login' }).click();

    await expect(page.getByTestId('kangur-login-modal')).toBeVisible();
  });
});
