import { expect, test, type Page } from '@playwright/test';

const DOCUMENT_LOAD_COUNT_KEY = '__kangurE2eDocumentLoadCount';
const ROUTE_SHELL_MONITOR_KEY = '__kangurRouteShellMonitor';
const ROUTE_SHELL_MARKER_KEY = '__kangurE2eShellMarker';

type RouteShellMonitorSample = {
  hasShell: boolean;
  backgroundImage: string | null;
  bodyBackgroundImage: string | null;
  appContentBackgroundImage: string | null;
};

type KangurSurfaceMonitorSample = {
  hasRouteShell: boolean;
  routeShellBackgroundImage: string | null;
  hasLoginShell: boolean;
  loginShellBackgroundImage: string | null;
  bodyBackgroundImage: string | null;
  appContentBackgroundImage: string | null;
};

const startRouteShellMonitor = async (page: Page): Promise<void> => {
  await page.evaluate((monitorKey) => {
    const globalWindow = window as Window & {
      [key: string]:
        | {
          stop: () => RouteShellMonitorSample[];
        }
        | undefined;
    };
    const samples: RouteShellMonitorSample[] = [];
    let running = true;

    const sample = (): void => {
      const shell = document.querySelector('[data-testid="kangur-route-shell"]');
      const shellStyles = shell ? window.getComputedStyle(shell) : null;
      const bodyStyles = window.getComputedStyle(document.body);
      const appContent = document.getElementById('app-content');
      const appContentStyles = appContent ? window.getComputedStyle(appContent) : null;
      samples.push({
        hasShell: Boolean(shell),
        backgroundImage: shellStyles?.backgroundImage ?? null,
        bodyBackgroundImage: bodyStyles.backgroundImage ?? null,
        appContentBackgroundImage: appContentStyles?.backgroundImage ?? null,
      });

      if (running) {
        window.requestAnimationFrame(sample);
      }
    };

    window.requestAnimationFrame(sample);
    globalWindow[monitorKey] = {
      stop: () => {
        running = false;
        return samples;
      },
    };
  }, ROUTE_SHELL_MONITOR_KEY);
};

const stopRouteShellMonitor = async (page: Page): Promise<RouteShellMonitorSample[]> =>
  page.evaluate((monitorKey) => {
    const globalWindow = window as Window & {
      [key: string]:
        | {
          stop: () => RouteShellMonitorSample[];
        }
        | undefined;
    };

    return globalWindow[monitorKey]?.stop() ?? [];
  }, ROUTE_SHELL_MONITOR_KEY);

const expectRouteShellContinuity = (
  samples: RouteShellMonitorSample[],
  stepLabel: string
): void => {
  expect(samples.length, `${stepLabel}: expected animation-frame samples`).toBeGreaterThan(0);
  expect(
    samples.every((sample) => sample.hasShell),
    `${stepLabel}: route shell disappeared during navigation`
  ).toBe(true);
  expect(
    samples.every(
      (sample) =>
        sample.backgroundImage !== null && sample.backgroundImage.includes('radial-gradient')
    ),
    `${stepLabel}: route shell lost the Kangur premium background`
  ).toBe(true);
  expect(
    samples.every(
      (sample) =>
        sample.bodyBackgroundImage !== null &&
        sample.bodyBackgroundImage.includes('radial-gradient')
    ),
    `${stepLabel}: document body lost the Kangur premium background`
  ).toBe(true);
  expect(
    samples.every(
      (sample) =>
        sample.appContentBackgroundImage !== null &&
        sample.appContentBackgroundImage.includes('radial-gradient')
    ),
    `${stepLabel}: app content lost the Kangur premium background`
  ).toBe(true);
};

const startKangurSurfaceMonitor = async (page: Page): Promise<void> => {
  await page.evaluate((monitorKey) => {
    const globalWindow = window as Window & {
      [key: string]:
        | {
            stop: () => KangurSurfaceMonitorSample[];
          }
        | undefined;
    };
    const samples: KangurSurfaceMonitorSample[] = [];
    let running = true;

    const sample = (): void => {
      const routeShell = document.querySelector('[data-testid="kangur-route-shell"]');
      const loginShell = document.querySelector('[data-testid="kangur-login-shell"]');
      const routeShellStyles = routeShell ? window.getComputedStyle(routeShell) : null;
      const loginShellStyles = loginShell ? window.getComputedStyle(loginShell) : null;
      const bodyStyles = window.getComputedStyle(document.body);
      const appContent = document.getElementById('app-content');
      const appContentStyles = appContent ? window.getComputedStyle(appContent) : null;

      samples.push({
        hasRouteShell: Boolean(routeShell),
        routeShellBackgroundImage: routeShellStyles?.backgroundImage ?? null,
        hasLoginShell: Boolean(loginShell),
        loginShellBackgroundImage: loginShellStyles?.backgroundImage ?? null,
        bodyBackgroundImage: bodyStyles.backgroundImage ?? null,
        appContentBackgroundImage: appContentStyles?.backgroundImage ?? null,
      });

      if (running) {
        window.requestAnimationFrame(sample);
      }
    };

    window.requestAnimationFrame(sample);
    globalWindow[monitorKey] = {
      stop: () => {
        running = false;
        return samples;
      },
    };
  }, ROUTE_SHELL_MONITOR_KEY);
};

const stopKangurSurfaceMonitor = async (page: Page): Promise<KangurSurfaceMonitorSample[]> =>
  page.evaluate((monitorKey) => {
    const globalWindow = window as Window & {
      [key: string]:
        | {
            stop: () => KangurSurfaceMonitorSample[];
          }
        | undefined;
    };

    return globalWindow[monitorKey]?.stop() ?? [];
  }, ROUTE_SHELL_MONITOR_KEY);

const expectKangurSurfaceContinuity = (
  samples: KangurSurfaceMonitorSample[],
  stepLabel: string
): void => {
  expect(samples.length, `${stepLabel}: expected animation-frame samples`).toBeGreaterThan(0);
  expect(
    samples.every((sample) => sample.hasRouteShell || sample.hasLoginShell),
    `${stepLabel}: no Kangur shell was visible during navigation`
  ).toBe(true);
  expect(
    samples.every((sample) => {
      if (sample.hasRouteShell) {
        return (
          sample.routeShellBackgroundImage !== null &&
          sample.routeShellBackgroundImage.includes('radial-gradient')
        );
      }
      if (sample.hasLoginShell) {
        return (
          sample.loginShellBackgroundImage !== null &&
          sample.loginShellBackgroundImage.includes('radial-gradient')
        );
      }
      return false;
    }),
    `${stepLabel}: visible Kangur shell lost the premium background`
  ).toBe(true);
  expect(
    samples.every(
      (sample) =>
        sample.bodyBackgroundImage !== null &&
        sample.bodyBackgroundImage.includes('radial-gradient')
    ),
    `${stepLabel}: document body lost the Kangur premium background`
  ).toBe(true);
  expect(
    samples.every(
      (sample) =>
        sample.appContentBackgroundImage !== null &&
        sample.appContentBackgroundImage.includes('radial-gradient')
    ),
    `${stepLabel}: app content lost the Kangur premium background`
  ).toBe(true);
};

const markRouteShellAsPersistent = async (page: Page): Promise<void> => {
  await page.getByTestId('kangur-route-shell').evaluate((element, markerKey) => {
    (
      element as HTMLElement & {
        [key: string]: string | undefined;
      }
    )[markerKey] = 'persist';
  }, ROUTE_SHELL_MARKER_KEY);
};

const expectRouteShellMarker = async (page: Page): Promise<void> => {
  await expect
    .poll(
      () =>
        page.getByTestId('kangur-route-shell').evaluate((element, markerKey) => {
          return (
            (
              element as HTMLElement & {
                [key: string]: string | undefined;
              }
            )[markerKey] ?? null
          );
        }, ROUTE_SHELL_MARKER_KEY),
      {
        message: 'expected the Kangur route shell instance to persist',
      }
    )
    .toBe('persist');
};

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

const buildManagerUserWithLearnerMood = (
  learnerId: 'learner-001' | 'learner-002'
) => {
  const nowIso = new Date('2026-03-08T10:00:00.000Z').toISOString();
  const learners = [
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
    {
      id: 'learner-002',
      ownerUserId: 'parent-001',
      displayName: 'Ola',
      loginName: 'ola-demo',
      status: 'active',
      legacyUserKey: null,
      aiTutor: {
        currentMoodId: 'reflective',
        baselineMoodId: 'patient',
        confidence: 0.58,
        lastComputedAt: nowIso,
        lastReasonCode: 'post_answer_review',
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
  const activeLearner = learners.find((learner) => learner.id === learnerId) ?? learners[0]!;

  return {
    id: 'parent-001',
    full_name: 'Parent Demo',
    email: 'parent@example.com',
    role: 'user',
    actorType: 'parent',
    canManageLearners: true,
    ownerUserId: 'parent-001',
    activeLearner,
    learners,
  };
};

test.describe('Kangur navigation continuity', () => {
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
  });

  test('keeps the persistent shell mounted across main-page navigation', async ({ page }) => {
    await page.goto('/kangur/game');

    const routeShell = page.getByTestId('kangur-route-shell');
    await expect(routeShell).toBeVisible();
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();

    const routeShellBackground = await routeShell.evaluate(
      (element) => getComputedStyle(element).backgroundImage
    );
    expect(routeShellBackground).toContain('radial-gradient');

    await markRouteShellAsPersistent(page);

    await startRouteShellMonitor(page);
    await page.getByTestId('kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(/\/kangur\/lessons$/);
    await expectRouteShellMarker(page);
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'game -> lessons');

    await startRouteShellMonitor(page);
    await page.getByTestId('kangur-primary-nav-home').click();
    await expect(page).toHaveURL(/\/kangur$/);
    await expectRouteShellMarker(page);
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'lessons -> home');

    await startRouteShellMonitor(page);
    await page.getByTestId('kangur-primary-nav-tests').click();
    await expect(page).toHaveURL(/\/kangur\/tests$/);
    await expectRouteShellMarker(page);
    await expect(page.getByRole('heading', { name: /Testy Kangur/i })).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'home -> tests');

    await startRouteShellMonitor(page);
    await page.getByTestId('kangur-primary-nav-home').click();
    await expect(page).toHaveURL(/\/kangur$/);
    await expectRouteShellMarker(page);
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'tests -> home');

    const documentLoadCount = await page.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      DOCUMENT_LOAD_COUNT_KEY
    );
    expect(documentLoadCount).toBe('1');
  });

  test('keeps the persistent shell mounted for parent-dashboard navigation', async ({ page }) => {
    await page.route('**/api/kangur/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildManagerUser()),
      });
    });

    await page.goto('/kangur/profile');

    const routeShell = page.getByTestId('kangur-route-shell');
    await expect(routeShell).toBeVisible();
    await markRouteShellAsPersistent(page);

    await startRouteShellMonitor(page);
    await page.getByTestId('kangur-primary-nav-parent-dashboard').click();
    await expect(page).toHaveURL(/\/kangur\/parent-dashboard$/);
    await expectRouteShellMarker(page);
    await expect(page.getByRole('heading', { name: /^Panel Rodzica$/ })).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'profile -> parent-dashboard');

    await startRouteShellMonitor(page);
    await page.getByTestId('kangur-primary-nav-home').click();
    await expect(page).toHaveURL(/\/kangur$/);
    await expectRouteShellMarker(page);
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'parent-dashboard -> home');

    await startRouteShellMonitor(page);
    await page.getByTestId('kangur-primary-nav-parent-dashboard').click();
    await expect(page).toHaveURL(/\/kangur\/parent-dashboard$/);
    await expectRouteShellMarker(page);
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'home -> parent-dashboard');

    const documentLoadCount = await page.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      DOCUMENT_LOAD_COUNT_KEY
    );
    expect(documentLoadCount).toBe('1');
  });

  test('keeps the parent-dashboard scroll position stable when switching tabs', async ({
    page,
  }) => {
    await page.route('**/api/kangur/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildManagerUser()),
      });
    });

    await page.goto('/kangur/parent-dashboard');
    await expect(page.getByRole('heading', { name: /^Panel Rodzica$/ })).toBeVisible();

    const scoresTab = page.getByRole('button', { name: /wyniki gier/i });
    const tabTop = await scoresTab.evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY
    );

    await page.evaluate((targetTop) => {
      window.scrollTo({ top: Math.max(0, targetTop - 24), left: 0 });
    }, tabTop);

    const beforeScrollY = await page.evaluate(() => window.scrollY);

    const scoresTabBox = await scoresTab.boundingBox();
    expect(scoresTabBox).not.toBeNull();
    if (!scoresTabBox) {
      return;
    }

    await page.mouse.click(
      scoresTabBox.x + scoresTabBox.width / 2,
      scoresTabBox.y + scoresTabBox.height / 2
    );

    await expect(scoresTab).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Brak zapisanych wynikow.')).toBeVisible();

    const afterScoresScrollY = await page.evaluate(() => window.scrollY);
    expect(Math.abs(afterScoresScrollY - beforeScrollY)).toBeLessThan(48);

    const progressTab = page.getByRole('button', { name: /postep/i });
    const beforeProgressScrollY = await page.evaluate(() => window.scrollY);

    const progressTabBox = await progressTab.boundingBox();
    expect(progressTabBox).not.toBeNull();
    if (!progressTabBox) {
      return;
    }

    await page.mouse.click(
      progressTabBox.x + progressTabBox.width / 2,
      progressTabBox.y + progressTabBox.height / 2
    );

    await expect(progressTab).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/Poziom i doswiadczenie/i)).toBeVisible();

    const afterProgressScrollY = await page.evaluate(() => window.scrollY);
    expect(Math.abs(afterProgressScrollY - beforeProgressScrollY)).toBeLessThan(48);
  });

  test('shows the learner-specific tutor mood in the parent-dashboard AI Tutor tab', async ({
    page,
  }) => {
    test.setTimeout(45_000);

    await page.route('**/api/kangur/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildManagerUser()),
      });
    });

    await page.goto('/kangur/parent-dashboard');
    await expect(page.getByRole('heading', { name: /^Panel Rodzica$/ })).toBeVisible();

    await page.getByRole('button', { name: /ai tutor/i }).click();

    await expect(page.getByTestId('parent-dashboard-ai-tutor-mood')).toBeVisible();
    await expect(page.getByTestId('parent-dashboard-ai-tutor-mood-current')).toContainText(
      'Wspierajacy'
    );
    await expect(page.getByTestId('parent-dashboard-ai-tutor-mood-current')).toHaveAttribute(
      'data-mood-id',
      'supportive'
    );
    await expect(page.getByTestId('parent-dashboard-ai-tutor-mood-baseline')).toContainText(
      'Spokojny'
    );
    await expect(page.getByTestId('parent-dashboard-ai-tutor-mood-confidence')).toContainText(
      '67%'
    );
  });

  test('switches the parent-dashboard tutor mood summary with the active learner', async ({
    page,
  }) => {
    test.setTimeout(45_000);

    await page.route('**/api/kangur/auth/me', async (route) => {
      const activeLearnerId = route.request().headers()['x-kangur-learner-id'];
      const user = buildManagerUserWithLearnerMood(
        activeLearnerId === 'learner-002' ? 'learner-002' : 'learner-001'
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(user),
      });
    });

    await page.goto('/kangur/parent-dashboard');
    await expect(page.getByRole('heading', { name: /^Panel Rodzica$/ })).toBeVisible();
    await page.getByRole('button', { name: /ai tutor/i }).click();

    await expect(page.getByTestId('parent-dashboard-ai-tutor-mood-current')).toContainText(
      'Wspierajacy'
    );

    await page.getByTestId('parent-dashboard-learner-card-learner-002').click();

    await expect(page.getByText('AI Tutor dla Ola')).toBeVisible();
    await expect(page.getByTestId('parent-dashboard-ai-tutor-mood-current')).toContainText(
      'Refleksyjny'
    );
    await expect(page.getByTestId('parent-dashboard-ai-tutor-mood-current')).toHaveAttribute(
      'data-mood-id',
      'reflective'
    );
    await expect(page.getByTestId('parent-dashboard-ai-tutor-mood-baseline')).toContainText(
      'Cierpliwy'
    );
    await expect(page.getByTestId('parent-dashboard-ai-tutor-mood-confidence')).toContainText(
      '58%'
    );
  });

  test('preserves the Kangur surface across login entry and return navigation', async ({ page }) => {
    await page.goto('/kangur/game');

    await expect(page.getByTestId('kangur-route-shell')).toBeVisible();

    await startKangurSurfaceMonitor(page);
    await page
      .getByLabel('Glowna nawigacja Kangur')
      .getByRole('button', { name: 'Zaloguj się' })
      .click();
    await expect(page).toHaveURL(/\/kangur\/login\?callbackUrl=/);
    await expect(page.getByTestId('kangur-login-shell')).toBeVisible();
    await page.waitForTimeout(250);
    expectKangurSurfaceContinuity(await stopKangurSurfaceMonitor(page), 'game -> login');

    await startKangurSurfaceMonitor(page);
    await page.getByRole('link', { name: 'Wroc do Kangura' }).click();
    await expect(page).toHaveURL(/\/kangur(?:\/game)?$/);
    await expect(page.getByTestId('kangur-route-shell')).toBeVisible();
    await page.waitForTimeout(250);
    expectKangurSurfaceContinuity(await stopKangurSurfaceMonitor(page), 'login -> kangur');

    const documentLoadCount = await page.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      DOCUMENT_LOAD_COUNT_KEY
    );
    expect(documentLoadCount).toBe('1');
  });

  test('renders the standalone Kangur login route on the shared premium surface', async ({
    page,
  }) => {
    await page.goto('/kangur/login?callbackUrl=%2Fkangur%2Fprofile');

    await expect(page.getByTestId('kangur-login-shell')).toBeVisible();
    await expect(page.getByTestId('kangur-route-shell')).toHaveCount(0);

    const [bodyBackgroundImage, appContentBackgroundImage] = await page.evaluate(() => {
      const bodyStyles = window.getComputedStyle(document.body);
      const appContent = document.getElementById('app-content');
      const appContentStyles = appContent ? window.getComputedStyle(appContent) : null;
      return [bodyStyles.backgroundImage, appContentStyles?.backgroundImage ?? null];
    });

    expect(bodyBackgroundImage).toContain('radial-gradient');
    expect(appContentBackgroundImage).toContain('radial-gradient');

    await startKangurSurfaceMonitor(page);
    await page.getByRole('link', { name: 'Wroc do Kangura' }).click();
    await expect(page).toHaveURL(/\/kangur(?:\/game)?$/);
    await expect(page.getByTestId('kangur-route-shell')).toBeVisible();
    await page.waitForTimeout(250);
    expectKangurSurfaceContinuity(await stopKangurSurfaceMonitor(page), 'direct login -> kangur');

    const documentLoadCount = await page.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      DOCUMENT_LOAD_COUNT_KEY
    );
    expect(documentLoadCount).toBe('1');
  });
});
