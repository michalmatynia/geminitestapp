import { expect, test, type Page, type Request, type Route } from '@playwright/test';

type ClockProgressState = Record<string, unknown>;

const NOW_ISO = '2026-03-09T12:00:00.000Z';
const ROUTE_BOOT_TIMEOUT_MS = 45_000;
const ROUTE_INITIAL_GOTO_TIMEOUT_MS = 90_000;
const KANGUR_LESSONS_SETTING_KEY = 'kangur_lessons_v1';
const KANGUR_LESSON_DOCUMENTS_SETTING_KEY = 'kangur_lesson_documents_v1';

const createDefaultProgress = (): ClockProgressState => ({
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

const gotoKangurLessonsRoute = async (page: Page): Promise<void> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto('/kangur/lessons', {
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
  await expect(page.getByTestId('kangur-lessons-list-heading')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
};

const mockKangurClockLessonEnvironment = async (page: Page): Promise<void> => {
  const learner = {
    id: 'learner-clock',
    ownerUserId: 'parent-clock',
    displayName: 'Ada',
    loginName: 'ada',
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  };
  const authUser = {
    id: 'parent-clock',
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
          id: 'kangur-lesson-clock',
          componentId: 'clock',
          contentMode: 'component',
          title: 'Nauka zegara',
          description: 'Przecwicz odczytywanie godzin na zegarze.',
          emoji: 'Clock',
          color: 'from-indigo-400 to-sky-400',
          activeBg: 'bg-indigo-500',
          sortOrder: 1000,
          enabled: true,
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
          ...(nextProgress as ClockProgressState),
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
        dateKey: '2026-03-09',
        messageCount: 0,
        dailyMessageLimit: null,
        remainingMessages: null,
      },
    });
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

const openClockTraining = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Nauka zegara' }).click();
  await expect(page.getByTestId('active-lesson-header')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await page.getByTestId('lesson-hub-section-game_minutes').click();
  await expect(page.getByTestId('clock-lesson-training-shell')).toBeVisible();
  await expect(page.getByTestId('clock-time-display')).toHaveText('12:00');
};

const ensureScrollableViewport = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const existingSpacer = document.querySelector('[data-playwright-clock-scroll-spacer]');
    if (!existingSpacer) {
      const spacer = document.createElement('div');
      spacer.setAttribute('data-playwright-clock-scroll-spacer', 'true');
      spacer.style.height = '1200px';
      document.body.appendChild(spacer);
    }
  });

  await page.getByTestId('clock-time-display').evaluate((element) => {
    element.scrollIntoView({ block: 'center', inline: 'center' });
  });

  await expect
    .poll(() => page.evaluate(() => window.scrollY), {
      timeout: 5_000,
    })
    .toBeGreaterThan(0);
};

const getMinuteHandDragPoints = async (
  page: Page
): Promise<{ start: { x: number; y: number }; end: { x: number; y: number } }> =>
  page.getByTestId('clock-minute-hand').evaluate((element) => {
    if (!(element instanceof SVGLineElement)) {
      throw new Error('Minute hand is not an SVG line.');
    }

    const svg = element.ownerSVGElement;
    if (!(svg instanceof SVGSVGElement)) {
      throw new Error('Minute hand SVG is missing.');
    }

    const svgRect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    const scaleX = svgRect.width / viewBox.width;
    const scaleY = svgRect.height / viewBox.height;
    const x1 = Number.parseFloat(element.getAttribute('x1') ?? '0');
    const y1 = Number.parseFloat(element.getAttribute('y1') ?? '0');
    const x2 = Number.parseFloat(element.getAttribute('x2') ?? '0');
    const y2 = Number.parseFloat(element.getAttribute('y2') ?? '0');
    const radius = Math.hypot(x2 - x1, y2 - y1);
    const toViewportPoint = (x: number, y: number) => ({
      x: svgRect.left + (x - viewBox.x) * scaleX,
      y: svgRect.top + (y - viewBox.y) * scaleY,
    });

    return {
      start: toViewportPoint(x2, y2),
      end: toViewportPoint(x1, y1 + radius),
    };
  });

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
};

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});

test.describe.configure({ timeout: 90_000 });

test.describe('Kangur clock lesson mobile drag', () => {
  test('keeps the page fixed while a clock hand is dragged with touch input', async ({
    page,
  }) => {
    await mockKangurClockLessonEnvironment(page);
    await gotoKangurLessonsRoute(page);
    await openClockTraining(page);
    await ensureScrollableViewport(page);

    const { start, end } = await getMinuteHandDragPoints(page);
    const initialScrollY = await page.evaluate(() => window.scrollY);

    expect(initialScrollY).toBeGreaterThan(0);

    await dispatchTouchDrag(page, start, end);

    await expect(page.getByTestId('clock-time-display')).toHaveText('12:30');

    const finalScrollY = await page.evaluate(() => window.scrollY);

    expect(Math.abs(finalScrollY - initialScrollY)).toBeLessThanOrEqual(4);
  });
});
