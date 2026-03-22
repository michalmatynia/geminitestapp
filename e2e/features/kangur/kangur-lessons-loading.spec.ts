import { expect, test, type Route } from '@playwright/test';

const lessonsPayload = [
  {
    id: 'lesson-clock',
    componentId: 'clock',
    subject: 'maths',
    ageGroup: 'ten_year_old',
    enabled: true,
    sortOrder: 1,
    title: 'Clock Practice',
    description: '',
    emoji: '🕒',
    color: 'indigo',
    activeBg: 'bg-indigo-50',
    contentMode: 'component',
  },
];

const lessonSectionsPayload = [
  {
    id: 'clock-focus',
    subject: 'maths',
    ageGroup: 'ten_year_old',
    enabled: true,
    sortOrder: 1,
    label: 'Clock Focus',
    typeLabel: 'featured',
    componentIds: ['clock'],
    subsections: [],
  },
];

const createDefaultProgress = () => ({
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
  openedTasks: [],
  lessonPanelProgress: {},
  totalCorrectAnswers: 0,
  totalQuestionsAnswered: 0,
  currentWinStreak: 0,
  bestWinStreak: 0,
  dailyQuestsCompleted: 0,
  recommendedSessionsCompleted: 0,
  currentActivityRepeatStreak: 0,
  lastRewardedActivityKey: null,
  activityStats: {},
});

const fulfillJson = async (route: Route, body: unknown, status = 200): Promise<void> => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
};

const delay = async (ms: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, ms));

test.describe.configure({ timeout: 300_000 });

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/session**', async (route) => {
    await fulfillJson(route, null);
  });

  await page.route('**/api/kangur/scores**', async (route) => {
    await fulfillJson(route, []);
  });

  await page.route('**/api/kangur/assignments**', async (route) => {
    await fulfillJson(route, []);
  });

  await page.route('**/api/kangur/auth/me**', async (route) => {
    await fulfillJson(route, { error: 'Not authenticated.' }, 401);
  });

  await page.route('**/api/kangur/progress**', async (route) => {
    await fulfillJson(route, createDefaultProgress());
  });

  await page.route('**/api/kangur/subject-focus**', async (route) => {
    await fulfillJson(route, { subject: 'maths' });
  });

  await page.route('**/api/settings/lite**', async (route) => {
    await fulfillJson(route, []);
  });

  await page.route(/\/api\/settings\?scope=heavy(?:&.*)?$/, async (route) => {
    await fulfillJson(route, []);
  });

  await page.route('**/api/kangur/lesson-documents**', async (route) => {
    await fulfillJson(route, {});
  });

  await page.route('**/api/analytics/events**', async (route) => {
    await fulfillJson(route, { ok: true });
  });

  await page.route('**/api/client-errors**', async (route) => {
    await fulfillJson(route, { ok: true });
  });

  await page.route('**/api/query-telemetry**', async (route) => {
    await fulfillJson(route, { ok: true });
  });
});

test('shows a lessons section skeleton while the lesson catalog is loading', async ({ page }) => {
  await page.route('**/api/kangur/lessons**', async (route) => {
    await delay(1_500);
    await fulfillJson(route, lessonsPayload);
  });

  await page.route('**/api/kangur/lesson-sections**', async (route) => {
    await delay(2_500);
    await fulfillJson(route, lessonSectionsPayload);
  });

  await page.goto('/kangur/duels', { waitUntil: 'commit', timeout: 240_000 });

  await expect(page.getByTestId('kangur-route-shell')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('link', { name: 'Lessons' })).toBeVisible({ timeout: 60_000 });

  await page.getByRole('link', { name: 'Lessons' }).click();

  await expect(page).toHaveURL(/\/(?:[a-z]{2}\/)?kangur\/lessons$/, {
    timeout: 60_000,
  });
  await expect(page.getByTestId('kangur-route-content')).toBeVisible({ timeout: 60_000 });

  const introCard = page.getByTestId('lessons-list-intro-card');
  const listTransition = page.getByTestId('lessons-list-transition');
  const catalogSkeleton = page.getByTestId('lessons-catalog-skeleton');

  await expect(introCard).toBeVisible({ timeout: 60_000 });
  await expect(listTransition).toBeVisible({ timeout: 60_000 });
  await expect(catalogSkeleton).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText('Lessons will be ready shortly.')).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText('No active lessons')).toHaveCount(0);
  await expect(page.getByTestId('lesson-card-lesson-clock')).toHaveCount(0);

  const [introBox, listBox, skeletonBox] = await Promise.all([
    introCard.boundingBox(),
    listTransition.boundingBox(),
    catalogSkeleton.boundingBox(),
  ]);

  expect(introBox).not.toBeNull();
  expect(listBox).not.toBeNull();
  expect(skeletonBox).not.toBeNull();

  expect(listBox!.y).toBeGreaterThan(introBox!.y + introBox!.height - 8);
  expect(skeletonBox!.y).toBeGreaterThan(introBox!.y + introBox!.height - 8);
  expect(Math.abs(skeletonBox!.y - listBox!.y)).toBeLessThanOrEqual(8);

  const openingSectionButton = page.getByRole('button', { name: /clock focus/i });
  await expect(openingSectionButton).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('lessons-catalog-skeleton')).toHaveCount(0);
});
