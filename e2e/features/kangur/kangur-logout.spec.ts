import { expect, test, type Page } from '@playwright/test';

const ROUTE_INITIAL_GOTO_TIMEOUT_MS = 90_000;
const ROUTE_BOOT_TIMEOUT_MS = 45_000;
const UNAUTHORIZED_RESPONSE = JSON.stringify({ message: 'Unauthorized' });
const LOGOUT_SUCCESS_RESPONSE = JSON.stringify({ ok: true });
const EMPTY_SCORES_RESPONSE = JSON.stringify([]);
const EMPTY_PROGRESS_RESPONSE = JSON.stringify({
  totalXp: 0,
  gamesPlayed: 0,
  perfectGames: 0,
  lessonsCompleted: 0,
  clockPerfect: 0,
  calendarPerfect: 0,
  geometryPerfect: 0,
  badges: [],
  operationsPlayed: [],
  lessonMastery: {},
});

const buildManagerUser = () => {
  const nowIso = new Date('2026-03-08T10:00:00.000Z').toISOString();

  return {
    id: 'parent-001',
    full_name: 'Parent Demo',
    email: 'parent@example.com',
    role: 'user',
    actorType: 'parent',
    canManageLearners: true,
    ownerUserId: 'parent-001',
    ownerEmailVerified: true,
    activeLearner: {
      id: 'learner-001',
      ownerUserId: 'parent-001',
      displayName: 'Jan',
      loginName: 'jan-demo',
      status: 'active',
      legacyUserKey: null,
      aiTutor: {
        currentMoodId: 'supportive',
        baselineMoodId: 'calm',
        confidence: 0.67,
        lastComputedAt: nowIso,
        lastReasonCode: 'steady_progress',
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    learners: [
      {
        id: 'learner-001',
        ownerUserId: 'parent-001',
        displayName: 'Jan',
        loginName: 'jan-demo',
        status: 'active',
        legacyUserKey: null,
        aiTutor: {
          currentMoodId: 'supportive',
          baselineMoodId: 'calm',
          confidence: 0.67,
          lastComputedAt: nowIso,
          lastReasonCode: 'steady_progress',
        },
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
  };
};

const gotoKangurProfile = async (page: Page): Promise<void> => {
  await page.goto('/kangur/profile', {
    waitUntil: 'commit',
    timeout: ROUTE_INITIAL_GOTO_TIMEOUT_MS,
  });

  await expect(page.getByTestId('kangur-route-shell')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByTestId('kangur-route-content')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByTestId('kangur-learner-profile-hero')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
};

test.describe('Kangur logout', () => {
  test('returns the UI to anonymous mode after clicking Wyloguj', async ({ page }) => {
    let isLoggedOut = false;
    let authMeRequests = 0;
    let logoutRequests = 0;
    const managerUserResponse = JSON.stringify(buildManagerUser());

    await page.route('**/api/kangur/auth/me**', async (route) => {
      authMeRequests += 1;

      if (isLoggedOut) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: UNAUTHORIZED_RESPONSE,
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: managerUserResponse,
      });
    });

    await page.route('**/api/kangur/auth/logout**', async (route) => {
      logoutRequests += 1;
      isLoggedOut = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: LOGOUT_SUCCESS_RESPONSE,
      });
    });

    await page.route('**/api/kangur/scores**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: EMPTY_SCORES_RESPONSE,
      });
    });

    await page.route('**/api/kangur/progress**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: EMPTY_PROGRESS_RESPONSE,
      });
    });

    await gotoKangurProfile(page);

    const navigation = page.getByRole('navigation', { name: 'Glowna nawigacja Kangur' });
    await expect(navigation.getByRole('button', { name: 'Wyloguj' })).toBeVisible();
    await expect(navigation.getByRole('button', { name: 'Zaloguj się' })).toHaveCount(0);

    await navigation.getByRole('button', { name: 'Wyloguj' }).click();

    await expect.poll(() => logoutRequests).toBe(1);
    await expect
      .poll(() => authMeRequests, {
        message: 'expected Kangur auth to be revalidated after logout',
      })
      .toBeGreaterThan(1);
    await expect(navigation.getByRole('button', { name: 'Wyloguj' })).toHaveCount(0);
    await expect(navigation.getByRole('button', { name: 'Zaloguj się' })).toBeVisible();
  });
});
