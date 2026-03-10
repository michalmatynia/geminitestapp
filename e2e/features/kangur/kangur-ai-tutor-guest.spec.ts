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
      guestAssistance.getByRole('button', { name: 'Create parent account' })
    ).toBeVisible();
    await expect(
      guestAssistance.getByRole('button', { name: 'Continue browsing' })
    ).toBeVisible();
    await expect.poll(() => readGuestIntroStatus(page)).toBe('accepted');
    await expect.poll(() => getGuestIntroChecks()).toBe(1);

    await guestAssistance.getByRole('button', { name: 'Open login' }).click();

    await expect(page.getByTestId('kangur-login-modal')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-avatar-placement',
      'guided'
    );
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-guidance-motion',
      'gentle'
    );
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-guidance-pointer',
      'rim-arrowhead'
    );
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-guidance-interaction',
      'suppressed'
    );
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-guidance-target',
      'login_action'
    );
    await expect(page.getByTestId('kangur-ai-tutor-guided-arrowhead')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-guided-login-help')).toHaveAttribute(
      'data-guidance-motion',
      'gentle'
    );
    await expect(page.getByTestId('kangur-ai-tutor-guided-login-help')).toContainText(
      'U góry kliknij „Zaloguj się”.'
    );

    await page.getByTestId('kangur-primary-nav-login').click();

    await expect(page.getByTestId('kangur-login-modal')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-guidance-target',
      'login_identifier_field'
    );
    await expect(page.getByTestId('kangur-ai-tutor-guided-login-help')).toContainText(
      'Tutaj wpisz email rodzica albo nick ucznia.'
    );
    await expect(page.getByTestId('kangur-login-identifier-input')).toBeVisible();
  });

  test('guides create-account through the top navigation first and then into the form', async ({
    page,
  }) => {
    const { getGuestIntroChecks } = await mockAnonymousGuestTutorIntro(page);

    await gotoGuestTutorRoute(page);

    await page
      .getByTestId('kangur-ai-tutor-guest-intro')
      .getByRole('button', { name: 'Yes' })
      .click();

    const guestAssistance = page.getByTestId('kangur-ai-tutor-guest-assistance');

    await expect(guestAssistance).toBeVisible();
    await expect.poll(() => readGuestIntroStatus(page)).toBe('accepted');
    await expect.poll(() => getGuestIntroChecks()).toBe(1);

    await guestAssistance.getByRole('button', { name: 'Create parent account' }).click();

    await expect(page.getByTestId('kangur-login-modal')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-guidance-target',
      'create_account_action'
    );
    await expect(page.getByTestId('kangur-ai-tutor-guided-login-help')).toContainText(
      'U góry kliknij „Utworz konto”.'
    );

    await page.getByTestId('kangur-primary-nav-create-account').click();

    await expect(page.getByTestId('kangur-login-modal')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-guidance-target',
      'login_identifier_field'
    );
    await expect(page.getByTestId('kangur-ai-tutor-guided-login-help')).toContainText(
      'Tutaj wpisz email rodzica.'
    );
    await expect(page.getByTestId('kangur-login-identifier-input')).toBeVisible();
  });

  test('shows the anonymous prompt on every entry when admin repeat mode is enabled', async ({
    page,
  }) => {
    let guestIntroChecks = 0;

    await page.addInitScript((storageKey) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          status: 'dismissed',
          version: 1,
          updatedAt: '2026-03-07T12:00:00.000Z',
        })
      );
    }, KANGUR_AI_TUTOR_GUEST_INTRO_STORAGE_KEY);

    await mockKangurTutorEnvironment(page, {
      guestIntroMode: 'every_visit',
    });

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
          shouldShow: false,
          reason: 'seen_before',
        }),
      });
    });

    await gotoGuestTutorRoute(page);

    const guestIntro = page.getByTestId('kangur-ai-tutor-guest-intro');

    await expect(guestIntro).toBeVisible();
    await expect(guestIntro).toContainText(
      'This helper appears on every anonymous page entry while AI Tutor onboarding is enabled.'
    );
    await expect.poll(() => readGuestIntroStatus(page)).toBe('shown');
    await expect.poll(() => guestIntroChecks).toBe(0);
  });

  test('uses the global AI Tutor persona avatar on the anonymous guest intro', async ({ page }) => {
    await mockKangurTutorEnvironment(page, {
      tutorPersonaImageUrl: '/uploads/agentcreator/personas/persona-mila/neutral/avatar.png',
    });

    await page.route('**/api/kangur/auth/me**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
    });

    await page.route('**/api/kangur/ai-tutor/guest-intro**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          shouldShow: true,
          reason: 'first_visit',
        }),
      });
    });

    await gotoGuestTutorRoute(page);

    const guestIntro = page.getByTestId('kangur-ai-tutor-guest-intro');
    const guestIntroAvatar = guestIntro.locator('img[alt="Mila"]');

    await expect(guestIntro).toBeVisible();
    await expect(guestIntroAvatar).toHaveAttribute(
      'src',
      /\/uploads\/agentcreator\/personas\/persona-mila\/neutral\/avatar\.png/
    );

    await page.getByTestId('kangur-ai-tutor-avatar').click();

    await expect(page.getByTestId('kangur-ai-tutor-header')).toContainText('Mila');
    await expect(
      page.getByTestId('kangur-ai-tutor-header-avatar-image').locator('img')
    ).toHaveAttribute('src', /\/uploads\/agentcreator\/personas\/persona-mila\/neutral\/avatar\.png/);
  });
});
