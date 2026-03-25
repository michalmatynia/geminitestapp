import { expect, test, type Page, type Request, type Route } from '@playwright/test';

type ProgressState = Record<string, unknown>;

const NOW_ISO = '2026-03-25T12:00:00.000Z';
const ROUTE_BOOT_TIMEOUT_MS = 45_000;
const ROUTE_INITIAL_GOTO_TIMEOUT_MS = 90_000;
const KANGUR_LESSONS_SETTING_KEY = 'kangur_lessons_v1';
const KANGUR_LESSON_DOCUMENTS_SETTING_KEY = 'kangur_lesson_documents_v1';

const createDefaultProgress = (): ProgressState => ({
  totalXp: 0,
  gamesPlayed: 0,
  perfectGames: 0,
  lessonsCompleted: 0,
  lessonMastery: {},
  operationsPlayed: [],
  badges: [],
});

const readJsonBody = (request: Request): unknown => {
  try {
    return request.postDataJSON();
  } catch {
    const raw = request.postData();
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as unknown;
  }
};

const fulfillJson = async (route: Route, body: unknown, status = 200): Promise<void> => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
};

const mockAddingLessonEnvironment = async (page: Page): Promise<void> => {
  const learner = {
    id: 'learner-adding',
    ownerUserId: 'parent-adding',
    displayName: 'Ada',
    loginName: 'ada',
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  };
  const authUser = {
    id: 'parent-adding',
    full_name: 'Parent Ada',
    email: 'parent@example.com',
    role: 'user',
    actorType: 'parent',
    canManageLearners: true,
    ownerUserId: null,
    ownerEmailVerified: true,
    activeLearner: learner,
    learners: [learner],
  };
  let progress = createDefaultProgress();
  const settingsLite = [
    {
      key: KANGUR_LESSONS_SETTING_KEY,
      value: JSON.stringify([
        {
          id: 'kangur-lesson-adding',
          componentId: 'adding',
          contentMode: 'component',
          title: 'Dodawanie',
          description: 'Przecwicz dodawanie przesuwając piłki.',
          emoji: 'Plus',
          color: 'from-amber-400 to-orange-400',
          activeBg: 'bg-orange-500',
          sortOrder: 1000,
          enabled: true,
          subject: 'maths',
          ageGroup: '6-8',
        },
      ]),
    },
    {
      key: KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
      value: JSON.stringify({}),
    },
  ];

  await page.route('**/api/auth/session**', async (route) => {
    await fulfillJson(route, null);
  });

  await page.route('**/api/settings/lite**', async (route) => {
    await fulfillJson(route, settingsLite);
  });

  await page.route(/\/api\/settings\?scope=heavy(?:&.*)?$/, async (route) => {
    await fulfillJson(route, []);
  });

  await page.route('**/api/kangur/auth/me**', async (route) => {
    await fulfillJson(route, authUser);
  });

  await page.route('**/api/kangur/progress**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await fulfillJson(route, progress);
      return;
    }

    if (request.method() === 'PUT') {
      const nextProgress = readJsonBody(request);
      if (nextProgress && typeof nextProgress === 'object') {
        progress = {
          ...progress,
          ...(nextProgress as ProgressState),
        };
      }
      await fulfillJson(route, progress);
      return;
    }

    await fulfillJson(route, progress);
  });

  await page.route('**/api/kangur/assignments**', async (route) => {
    await fulfillJson(route, []);
  });

  await page.route('**/api/kangur/ai-tutor/usage**', async (route) => {
    await fulfillJson(route, {
      usage: {
        dateKey: '2026-03-25',
        messageCount: 0,
        dailyMessageLimit: null,
        remainingMessages: null,
      },
    });
  });

  await page.route('**/api/user/preferences**', async (route) => {
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
};

const gotoAddingLesson = async (page: Page): Promise<void> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto('/kangur/lessons?focus=adding', {
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
  await expect(page.getByRole('button', { name: /back to lessons/i })).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await page.getByRole('button', { name: /ball game/i }).click();
  await expect(page.getByTestId('adding-lesson-game-shell')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByTestId('adding-ball-round-shell')).toBeVisible();
};

const getCenter = async (
  page: Page,
  testId: string
): Promise<{ x: number; y: number }> => {
  const box = await page.getByTestId(testId).boundingBox();
  if (!box) {
    throw new Error(`Missing bounding box for ${testId}.`);
  }

  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
};

const getBallCenter = async (
  page: Page,
  index = 0
): Promise<{ x: number; y: number }> => {
  const box = await page.getByRole('button', { name: 'Piłka: 1' }).nth(index).boundingBox();
  if (!box) {
    throw new Error(`Missing ball bounding box at index ${index}.`);
  }

  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
};

const dispatchTouchDrag = async (
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number }
): Promise<void> => {
  const session = await page.context().newCDPSession(page);
  const steps = 8;

  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      {
        x: start.x,
        y: start.y,
        radiusX: 8,
        radiusY: 8,
        force: 1,
        id: 0,
      },
    ],
  });

  for (let step = 1; step <= steps; step += 1) {
    const progress = step / steps;
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          x: start.x + (end.x - start.x) * progress,
          y: start.y + (end.y - start.y) * progress,
          radiusX: 8,
          radiusY: 8,
          force: 1,
          id: 0,
        },
      ],
    });
  }

  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });

  await session.detach();
};

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});

test.describe.configure({ timeout: 90_000 });

test.describe('Kangur adding-ball mobile drag physics', () => {
  test('settles into the target zone before the ball commits', async ({ page }) => {
    await mockAddingLessonEnvironment(page);
    await gotoAddingLesson(page);

    const start = await getBallCenter(page, 0);
    const end = await getCenter(page, 'adding-ball-slotA');

    await dispatchTouchDrag(page, start, end);

    const settlingOverlay = page.locator(
      '[data-testid="adding-ball-drag-overlay"][data-phase="settling"]'
    );
    await expect(settlingOverlay).toBeVisible({ timeout: 2_000 });
    await expect(settlingOverlay).toBeHidden({ timeout: 3_000 });
    await expect(page.getByTestId('adding-ball-slotA').getByRole('button', { name: 'Piłka: 1' })).toBeVisible();
  });

  test('returns the ball to the pool after an invalid drop', async ({ page }) => {
    await mockAddingLessonEnvironment(page);
    await gotoAddingLesson(page);

    const poolButtonsBefore = await page
      .getByTestId('adding-ball-pool')
      .getByRole('button', { name: 'Piłka: 1' })
      .count();

    const start = await getBallCenter(page, 0);
    const invalidEnd = { x: start.x, y: start.y + 260 };

    await dispatchTouchDrag(page, start, invalidEnd);

    const returningOverlay = page.locator(
      '[data-testid="adding-ball-drag-overlay"][data-phase="returning"]'
    );
    await expect(returningOverlay).toBeVisible({ timeout: 2_000 });
    await expect(returningOverlay).toBeHidden({ timeout: 3_000 });

    await expect(page.getByTestId('adding-ball-slotA').getByRole('button', { name: 'Piłka: 1' })).toHaveCount(0);
    await expect(page.getByTestId('adding-ball-pool').getByRole('button', { name: 'Piłka: 1' })).toHaveCount(poolButtonsBefore);
  });
});
