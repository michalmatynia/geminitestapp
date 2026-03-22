import { expect, test } from '@playwright/test';

const DOCUMENT_LOAD_COUNT_KEY = '__kangurE2eDocumentLoadCount';

const buildLearnerUser = () => {
  const nowIso = new Date('2026-03-08T10:00:00.000Z').toISOString();

  return {
    id: 'learner-001',
    full_name: 'Jan',
    email: null,
    role: 'user',
    actorType: 'learner',
    canManageLearners: false,
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

test.describe.configure({ timeout: 300_000 });

test.beforeEach(async ({ page }) => {
  await page.addInitScript((storageKey) => {
    const rawValue = window.localStorage.getItem(storageKey);
    const parsedValue = Number.parseInt(rawValue ?? '0', 10);
    const nextValue = Number.isFinite(parsedValue) ? parsedValue + 1 : 1;
    window.localStorage.setItem(storageKey, String(nextValue));
  }, DOCUMENT_LOAD_COUNT_KEY);

  await page.route('**/api/auth/session**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(null),
    });
  });

  await page.route('**/api/kangur/scores**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/kangur/assignments**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/kangur/auth/me**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildLearnerUser()),
    });
  });
});

test('opens lessons from the home lessons action on the first click', async ({ page }) => {
  await page.goto('/kangur/game', { waitUntil: 'commit', timeout: 240_000 });

  const lessonsAction = page.locator('[data-doc-id="home_lessons_action"]');
  await expect(lessonsAction).toBeVisible({ timeout: 180_000 });

  await lessonsAction.click();

  await expect(page).toHaveURL(/\/(?:[a-z]{2}\/)?kangur\/lessons$/, {
    timeout: 60_000,
  });
  await expect(page.getByTestId('lessons-list-transition')).toBeVisible({
    timeout: 60_000,
  });
});
