import { expect, test, type Page } from '@playwright/test';

import { KANGUR_AI_TUTOR_GUEST_INTRO_STORAGE_KEY } from '@/features/kangur/ui/components/KangurAiTutorWidget.shared';

import {
  mockKangurTutorEnvironment,
} from '../../support/kangur-tutor-fixtures';

type MockAnonymousGuestTutorIntroOptions = {
  shouldShow?: boolean;
  narratorEngine?: 'server' | 'client';
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
  const { shouldShow = true, narratorEngine = 'server' } = options;
  let guestIntroChecks = 0;

  await mockKangurTutorEnvironment(page, {
    tutorPersonaImageUrl: '/uploads/agentcreator/personas/persona-mila/neutral/avatar.png',
    narratorEngine,
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
        shouldShow,
        reason: shouldShow ? 'first_visit' : 'seen_before',
      }),
    });
  });

  return {
    getGuestIntroChecks: () => guestIntroChecks,
  };
}

test.describe('Kangur tutor guest intro', () => {
  test('shows the first-visit anonymous minimalist prompt with a single primary action', async ({ page }) => {
    const { getGuestIntroChecks } = await mockAnonymousGuestTutorIntro(page);

    await gotoGuestTutorRoute(page);

    const guestIntro = page.getByTestId('kangur-ai-tutor-guest-intro');

    await expect(guestIntro).toBeVisible();
    await expect(guestIntro).toContainText('Mila');
    await expect(guestIntro).toContainText('Czy chcesz pomocy z logowaniem albo założeniem konta?');
    await expect(guestIntro).toHaveAttribute('data-modal-surface', 'canonical-onboarding');
    await expect(guestIntro).toHaveAttribute('data-modal-motion', 'fade-only');
    await expect(guestIntro).toHaveAttribute('data-modal-actions', 'single-primary');
    await expect(guestIntro.getByRole('button', { name: 'Tak' })).toBeVisible();
    await expect(guestIntro.getByRole('button', { name: 'Nie' })).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect.poll(() => getGuestIntroChecks()).toBe(1);
    await expect.poll(() => readGuestIntroStatus(page)).toBe('shown');
  });

  test('closes the anonymous card with X and lets the avatar reopen the minimalist tutor modal', async ({
    page,
  }) => {
    const { getGuestIntroChecks } = await mockAnonymousGuestTutorIntro(page);

    await gotoGuestTutorRoute(page);

    const guestIntro = page.getByTestId('kangur-ai-tutor-guest-intro');
    await expect(guestIntro).toBeVisible();

    await guestIntro.getByTestId('kangur-ai-tutor-guest-intro-close').click();

    await expect(guestIntro).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toBeVisible();

    await page.getByTestId('kangur-ai-tutor-avatar').click();

    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect.poll(() => getGuestIntroChecks()).toBe(1);

    await page.getByTestId('kangur-ai-tutor-guest-intro-close').click();

    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toBeVisible();

    await page.getByTestId('kangur-ai-tutor-avatar').click();

    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
  });

  test('dismisses the anonymous prompt and keeps it suppressed after reload', async ({ page }) => {
    const { getGuestIntroChecks } = await mockAnonymousGuestTutorIntro(page);

    await gotoGuestTutorRoute(page);

    const guestIntro = page.getByTestId('kangur-ai-tutor-guest-intro');
    await expect(guestIntro).toBeVisible();

    await guestIntro.getByTestId('kangur-ai-tutor-guest-intro-close').click();

    await expect(guestIntro).toHaveCount(0);
    await expect.poll(() => readGuestIntroStatus(page)).toBe('dismissed');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('kangur-route-shell')).toBeVisible();
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-guest-assistance')).toHaveCount(0);
    await expect.poll(() => getGuestIntroChecks()).toBe(1);
  });

  test('starts the minimalist guided login flow immediately after Yes', async ({ page }) => {
    const { getGuestIntroChecks } = await mockAnonymousGuestTutorIntro(page);

    await gotoGuestTutorRoute(page);

    await page
      .getByTestId('kangur-ai-tutor-guest-intro')
      .getByRole('button', { name: 'Tak' })
      .click();

    const guidedHelp = page.getByTestId('kangur-ai-tutor-guided-login-help');

    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-guest-assistance')).toHaveCount(0);
    await expect(guidedHelp).toBeVisible();
    await expect(guidedHelp).toContainText('U góry kliknij „Zaloguj się”.');
    await expect.poll(() => readGuestIntroStatus(page)).toBe('accepted');
    await expect.poll(() => getGuestIntroChecks()).toBe(1);

    await expect(page.getByTestId('kangur-login-modal')).toHaveCount(0);
    await expect(guidedHelp).toHaveAttribute('data-guidance-motion', 'gentle');
    await expect(page.getByTestId('kangur-ai-tutor-guided-arrowhead')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-avatar-placement',
      'guided'
    );
    await expect(page.getByTestId('kangur-ai-tutor-avatar-rim')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-avatar-rim')).toHaveCSS(
      'border-top-color',
      'rgb(120, 53, 15)'
    );
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveCSS(
      'border-top-color',
      'rgb(120, 53, 15)'
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
    await expect(page.getByTestId('kangur-primary-nav-login')).toBeVisible();
    await expect(page.getByTestId('kangur-primary-nav-login')).toBeInViewport();
    await expect(page.getByTestId('kangur-ai-tutor-guided-arrowhead')).toHaveAttribute(
      'data-guidance-rim-color',
      '#78350f'
    );
    await expect(page.getByTestId('kangur-ai-tutor-guided-arrowhead')).toHaveAttribute(
      'data-guidance-layer',
      'below-rim'
    );
    await expect(page.getByTestId('kangur-ai-tutor-guided-arrowhead')).toHaveAttribute(
      'data-guidance-angle',
      /^-?\d+(?:\.\d+)?$/
    );
    await expect(guidedHelp.getByRole('button', { name: 'Rozumiem' })).toBeVisible();
    await expect(guidedHelp.getByRole('button', { name: 'Zapytaj' })).toHaveCount(0);
  });

  test('reopens the minimalist tutor modal from the docked anonymous avatar without forcing auth navigation', async ({
    page,
  }) => {
    await mockAnonymousGuestTutorIntro(page);

    await gotoGuestTutorRoute(page);

    const guestIntro = page.getByTestId('kangur-ai-tutor-guest-intro');

    await expect(guestIntro).toBeVisible();
    await expect(guestIntro.getByRole('button', { name: 'Zapytaj' })).toHaveCount(0);

    await guestIntro.getByTestId('kangur-ai-tutor-guest-intro-close').click();
    await page.getByTestId('kangur-ai-tutor-avatar').click();

    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(page.getByTestId('kangur-login-modal')).toHaveCount(0);
  });

  test('acknowledges guided login help and lets the avatar reopen the minimalist tutor modal', async ({
    page,
  }) => {
    await mockAnonymousGuestTutorIntro(page);

    await gotoGuestTutorRoute(page);

    await page
      .getByTestId('kangur-ai-tutor-guest-intro')
      .getByRole('button', { name: 'Tak' })
      .click();

    const guidedHelp = page.getByTestId('kangur-ai-tutor-guided-login-help');

    await expect(guidedHelp).toBeVisible();
    await expect(guidedHelp.getByRole('button', { name: 'Zapytaj' })).toHaveCount(0);
    await expect(guidedHelp.getByRole('button', { name: 'Rozumiem' })).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-ask-modal')).toHaveCount(0);
    await expect(page.getByTestId('kangur-login-modal')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-guidance-target',
      'login_action'
    );

    await guidedHelp.getByRole('button', { name: 'Rozumiem' }).click();

    await expect(guidedHelp).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-avatar-placement',
      'floating'
    );
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute('data-anchor-kind', 'dock');

    await page.getByTestId('kangur-ai-tutor-avatar').click();

    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
  });

  test('closes guided login help with X and lets the avatar reopen the minimalist tutor modal', async ({
    page,
  }) => {
    await mockAnonymousGuestTutorIntro(page);

    await gotoGuestTutorRoute(page);

    await page
      .getByTestId('kangur-ai-tutor-guest-intro')
      .getByRole('button', { name: 'Tak' })
      .click();

    const guidedHelp = page.getByTestId('kangur-ai-tutor-guided-login-help');
    await expect(guidedHelp).toBeVisible();

    await guidedHelp.getByTestId('kangur-ai-tutor-guided-callout-close').click();

    await expect(guidedHelp).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-avatar-placement',
      'floating'
    );
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute('data-anchor-kind', 'dock');

    await page.getByTestId('kangur-ai-tutor-avatar').click();

    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
  });

  test('does not resurface the removed guest assistance or create-account chooser after Yes', async ({
    page,
  }) => {
    await mockAnonymousGuestTutorIntro(page);

    await gotoGuestTutorRoute(page);

    await page
      .getByTestId('kangur-ai-tutor-guest-intro')
      .getByRole('button', { name: 'Tak' })
      .click();

    await expect(page.getByTestId('kangur-ai-tutor-guest-assistance')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Pokaż logowanie' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Pokaż tworzenie konta' })).toHaveCount(0);
    await expect(page.getByTestId('kangur-login-modal')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-guidance-target',
      'login_action'
    );
    await expect(page.getByTestId('kangur-ai-tutor-guided-login-help')).toContainText(
      'U góry kliknij „Zaloguj się”.'
    );
    await expect(page.getByTestId('kangur-ai-tutor-guided-arrowhead')).toHaveAttribute(
      'data-guidance-angle',
      /^-?\d+(?:\.\d+)?$/
    );
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
      'Mogę pokazać, gdzie się zalogować albo jak założyć konto rodzica.'
    );
    await expect.poll(() => readGuestIntroStatus(page)).toBe('shown');
    await expect.poll(() => guestIntroChecks).toBe(0);
  });

  test('uses the global tutor persona avatar and name on the anonymous guest intro', async ({ page }) => {
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
    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar-image').locator('img');

    await expect(guestIntro).toBeVisible();
    await expect(guestIntro).toContainText('Mila');
    await expect(tutorAvatar).toHaveAttribute(
      'src',
      /\/uploads\/agentcreator\/personas\/persona-mila\/neutral\/avatar\.png/
    );

    await guestIntro.getByTestId('kangur-ai-tutor-guest-intro-close').click();
    await page.getByTestId('kangur-ai-tutor-avatar').click();

    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toContainText('Mila');
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(
      page.getByTestId('kangur-ai-tutor-avatar-image').locator('img').first()
    ).toHaveAttribute('src', /\/uploads\/agentcreator\/personas\/persona-mila\/neutral\/avatar\.png/);
  });
});
