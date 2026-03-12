import { expect, test, type Locator, type Page } from '@playwright/test';

const KANGUR_PROGRESS_STORAGE_KEY = 'sprycio_progress';
const ROUTE_INITIAL_GOTO_TIMEOUT_MS = 90_000;
const ROUTE_BOOT_TIMEOUT_MS = 45_000;
const MOBILE_VIEWPORTS = [
  { label: 'iphone-se', width: 320, height: 568 },
  { label: 'iphone-13', width: 390, height: 844 },
] as const;

const PROGRESS_FIXTURE = {
  totalXp: 620,
  gamesPlayed: 22,
  perfectGames: 6,
  lessonsCompleted: 9,
  clockPerfect: 2,
  calendarPerfect: 1,
  geometryPerfect: 1,
  badges: ['first_game', 'perfect_10', 'lesson_hero', 'ten_games'],
  operationsPlayed: ['addition', 'multiplication', 'division'],
  lessonMastery: {},
  totalCorrectAnswers: 18,
  totalQuestionsAnswered: 20,
  currentWinStreak: 2,
  bestWinStreak: 4,
  activityStats: {},
} as const;

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const toBottom = (box: Box): number => box.y + box.height;
const toRight = (box: Box): number => box.x + box.width;

async function expectLocatorsNotToOverlap(
  first: Locator,
  second: Locator,
  message: string
): Promise<void> {
  const [firstBox, secondBox] = await Promise.all([first.boundingBox(), second.boundingBox()]);

  expect(firstBox, `${message}: first locator was not measurable`).not.toBeNull();
  expect(secondBox, `${message}: second locator was not measurable`).not.toBeNull();

  if (!firstBox || !secondBox) {
    return;
  }

  const overlapsHorizontally = firstBox.x < toRight(secondBox) && toRight(firstBox) > secondBox.x;
  const overlapsVertically = firstBox.y < toBottom(secondBox) && toBottom(firstBox) > secondBox.y;

  expect(overlapsHorizontally && overlapsVertically, message).toBe(false);
}

async function expectVerticalOrder(
  upper: Locator,
  lower: Locator,
  message: string,
  tolerance = 2
): Promise<void> {
  const [upperBox, lowerBox] = await Promise.all([upper.boundingBox(), lower.boundingBox()]);

  expect(upperBox, `${message}: upper locator was not measurable`).not.toBeNull();
  expect(lowerBox, `${message}: lower locator was not measurable`).not.toBeNull();

  if (!upperBox || !lowerBox) {
    return;
  }

  expect(lowerBox.y, message).toBeGreaterThanOrEqual(toBottom(upperBox) - tolerance);
}

const gotoKangurPath = async (page: Page, path: string): Promise<void> => {
  await page.goto(path, {
    waitUntil: 'commit',
    timeout: ROUTE_INITIAL_GOTO_TIMEOUT_MS,
  });
};

const expectLearnerProfileReady = async (page: Page): Promise<void> => {
  await expect(page.getByTestId('kangur-route-shell')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByTestId('kangur-learner-profile-hero')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByRole('heading', { name: /Profil ucznia/i })).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
};

const buildManagerUser = () => {
  const nowIso = '2026-03-08T10:00:00.000Z';

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

const mockKangurAuthMe = async (page: Page): Promise<void> => {
  await page.route('**/api/kangur/auth/me**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildManagerUser()),
    });
  });
};

const mockKangurScores = async (page: Page): Promise<void> => {
  await page.route('**/api/kangur/scores**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'score-1',
          player_name: 'Jan',
          score: 8,
          operation: 'addition',
          total_questions: 10,
          correct_answers: 8,
          time_taken: 42,
          created_date: '2026-03-08T10:00:00.000Z',
          created_by: 'jan@example.com',
        },
        {
          id: 'score-2',
          player_name: 'Jan',
          score: 10,
          operation: 'multiplication',
          total_questions: 10,
          correct_answers: 10,
          time_taken: 38,
          created_date: '2026-03-07T10:00:00.000Z',
          created_by: 'jan@example.com',
        },
      ]),
    });
  });
};

const mockKangurProgress = async (page: Page): Promise<void> => {
  await page.route('**/api/kangur/progress**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(PROGRESS_FIXTURE),
    });
  });
};

const seedKangurProgress = async (page: Page): Promise<void> => {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    {
      key: KANGUR_PROGRESS_STORAGE_KEY,
      value: PROGRESS_FIXTURE,
    }
  );
};

for (const viewport of MOBILE_VIEWPORTS) {
  test.describe(`Kangur learner profile badge tracks ${viewport.label}`, () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await mockKangurAuthMe(page);
      await mockKangurProgress(page);
      await mockKangurScores(page);
      await seedKangurProgress(page);
    });

    test('keeps the badge-track heading and percentage pills separated', async ({ page }) => {
      await gotoKangurPath(page, '/kangur/profile');
      await expectLearnerProfileReady(page);

      const heading = page.getByText('Ścieżki odznak').first();
      const cards = page.locator(
        '[data-testid^="learner-profile-badge-track-"]:not([data-testid$="-bar"])'
      );

      await expect(heading).toBeVisible();
      await expect(cards.first()).toBeVisible();
      await heading.scrollIntoViewIfNeeded();

      await expectVerticalOrder(
        heading,
        cards.first(),
        'mobile badge-track heading should stay above the first badge card'
      );

      const cardCount = await cards.count();

      for (let index = 0; index < cardCount; index += 1) {
        const card = cards.nth(index);
        const title = card.locator('p').nth(1);
        const chip = card.locator('span').last();

        await expect(title).toBeVisible();
        await expect(chip).toBeVisible();
        await expect(chip).toContainText('%');

        await expectLocatorsNotToOverlap(
          title,
          chip,
          `mobile badge-track title and chip should not overlap on card ${index + 1}`
        );
        await expectVerticalOrder(
          title,
          chip,
          `mobile badge-track chip should stay below the title on card ${index + 1}`
        );
      }
    });
  });
}
