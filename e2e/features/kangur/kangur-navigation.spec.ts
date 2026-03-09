import { expect, test, type Page } from '@playwright/test';

const DOCUMENT_LOAD_COUNT_KEY = '__kangurE2eDocumentLoadCount';
const ROUTE_SHELL_MONITOR_KEY = '__kangurRouteShellMonitor';
const ROUTE_SHELL_MARKER_KEY = '__kangurE2eShellMarker';
const ROUTE_LAYOUT_MONITOR_KEY = '__kangurRouteLayoutMonitor';
const ROUTE_SCROLL_MONITOR_KEY = '__kangurRouteScrollMonitor';
const ROUTE_BOOT_TIMEOUT_MS = 45_000;
const ROUTE_INITIAL_GOTO_TIMEOUT_MS = 90_000;

type RouteShellMonitorSample = {
  hasShell: boolean;
  backgroundImage: string | null;
  bodyBackgroundImage: string | null;
  appContentBackgroundImage: string | null;
};

type KangurSurfaceMonitorSample = {
  hasRouteShell: boolean;
  routeShellBackgroundImage: string | null;
  hasFeaturePageShell: boolean;
  featurePageShellBackgroundImage: string | null;
  hasLoginShell: boolean;
  loginShellBackgroundImage: string | null;
  bodyBackgroundImage: string | null;
  appContentBackgroundImage: string | null;
};

type RouteLayoutMonitorSample = {
  hasShell: boolean;
  routeShellLeft: number | null;
  routeShellWidth: number | null;
  homeButtonLeft: number | null;
  clientWidth: number;
  innerWidth: number;
  scrollbarGap: number;
  hasHorizontalOverflow: boolean;
  rootOverflowY: string;
  bodyOverflowY: string;
  routeTransitionScrollLockActive: boolean;
};

type GameHomeLayoutSnapshot = {
  actionsVisible: boolean;
  leaderboardTop: number | null;
  progressTop: number | null;
};

type LessonsTransitionSnapshot = {
  opacity: number | null;
  transform: string | null;
};

type RouteScrollMonitorSample = {
  path: string;
  scrollY: number;
  hasSkeleton: boolean;
};

const expectGameRouteReady = async (page: Page, navTestId: string): Promise<void> => {
  await expect(page.getByTestId('kangur-route-shell')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByTestId('kangur-route-content')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByTestId(navTestId)).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
};

const expectLearnerProfileRouteReady = async (page: Page): Promise<void> => {
  await expect(page.getByTestId('kangur-route-shell')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByTestId('kangur-learner-profile-hero')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
};

const expectParentDashboardRouteReady = async (page: Page): Promise<void> => {
  await expect(page.getByTestId('kangur-parent-dashboard-hero')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByRole('heading', { name: /^Panel Rodzica$/ })).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
};

const expectKangurLoginReady = async (page: Page): Promise<void> => {
  await expect(page.getByTestId('kangur-login-modal')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByTestId('kangur-login-form')).toHaveAttribute('data-hydrated', 'true', {
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByTestId('kangur-login-form')).toHaveAttribute('data-login-kind', 'unknown', {
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(
    page.getByTestId('kangur-login-form').getByLabel('Email rodzica lub nick ucznia')
  ).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
};

const gotoKangurPath = async (page: Page, path: string): Promise<void> => {
  await page.goto(path, {
    waitUntil: 'commit',
    timeout: ROUTE_INITIAL_GOTO_TIMEOUT_MS,
  });
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
      const featurePageShell = document.querySelector('[data-testid="kangur-feature-page-shell"]');
      const loginShell = document.querySelector('[data-testid="kangur-login-shell"]');
      const routeShellStyles = routeShell ? window.getComputedStyle(routeShell) : null;
      const featurePageShellStyles = featurePageShell ? window.getComputedStyle(featurePageShell) : null;
      const loginShellStyles = loginShell ? window.getComputedStyle(loginShell) : null;
      const bodyStyles = window.getComputedStyle(document.body);
      const appContent = document.getElementById('app-content');
      const appContentStyles = appContent ? window.getComputedStyle(appContent) : null;

      samples.push({
        hasRouteShell: Boolean(routeShell),
        routeShellBackgroundImage: routeShellStyles?.backgroundImage ?? null,
        hasFeaturePageShell: Boolean(featurePageShell),
        featurePageShellBackgroundImage: featurePageShellStyles?.backgroundImage ?? null,
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
    samples.some(
      (sample) => sample.hasRouteShell || sample.hasFeaturePageShell || sample.hasLoginShell
    ),
    `${stepLabel}: Kangur shell was never visible during navigation`
  ).toBe(true);
  expect(
    samples.every(
      (sample) =>
        !sample.hasRouteShell ||
        (sample.routeShellBackgroundImage !== null &&
          sample.routeShellBackgroundImage.includes('radial-gradient'))
    ),
    `${stepLabel}: visible route shell lost the premium background`
  ).toBe(true);
  expect(
    samples.every(
      (sample) =>
        !sample.hasFeaturePageShell ||
        (sample.featurePageShellBackgroundImage !== null &&
          sample.featurePageShellBackgroundImage.includes('radial-gradient'))
    ),
    `${stepLabel}: visible feature-page shell lost the premium background`
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

const expectKangurAppShellVisible = async (
  page: Page,
  timeout = 5_000
): Promise<void> => {
  await expect
    .poll(
      async () =>
        (await page.getByTestId('kangur-route-shell').count()) +
        (await page.getByTestId('kangur-feature-page-shell').count()),
      {
        timeout,
      }
    )
    .toBeGreaterThan(0);
};

const startRouteLayoutMonitor = async (page: Page): Promise<void> => {
  await page.evaluate((monitorKey) => {
    const globalWindow = window as Window & {
      [key: string]:
        | {
            stop: () => RouteLayoutMonitorSample[];
          }
        | undefined;
    };
    const samples: RouteLayoutMonitorSample[] = [];
    let running = true;

    const sample = (): void => {
      const shell = document.querySelector('[data-testid="kangur-route-shell"]');
      const shellRect = shell?.getBoundingClientRect() ?? null;
      const homeButton = document.querySelector('[data-testid="kangur-primary-nav-home"]');
      const homeButtonRect = homeButton?.getBoundingClientRect() ?? null;
      const clientWidth = document.documentElement.clientWidth;
      const innerWidth = window.innerWidth;
      const scrollWidth = document.documentElement.scrollWidth;
      const rootStyles = window.getComputedStyle(document.documentElement);
      const bodyStyles = window.getComputedStyle(document.body);

      samples.push({
        hasShell: Boolean(shellRect),
        routeShellLeft: shellRect?.left ?? null,
        routeShellWidth: shellRect?.width ?? null,
        homeButtonLeft: homeButtonRect?.left ?? null,
        clientWidth,
        innerWidth,
        scrollbarGap: innerWidth - clientWidth,
        hasHorizontalOverflow: scrollWidth > clientWidth + 1,
        rootOverflowY: rootStyles.overflowY,
        bodyOverflowY: bodyStyles.overflowY,
        routeTransitionScrollLockActive: document.documentElement.classList.contains(
          'kangur-route-transition-active'
        ),
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
  }, ROUTE_LAYOUT_MONITOR_KEY);
};

const stopRouteLayoutMonitor = async (page: Page): Promise<RouteLayoutMonitorSample[]> =>
  page.evaluate((monitorKey) => {
    const globalWindow = window as Window & {
      [key: string]:
        | {
            stop: () => RouteLayoutMonitorSample[];
          }
        | undefined;
    };

    return globalWindow[monitorKey]?.stop() ?? [];
  }, ROUTE_LAYOUT_MONITOR_KEY);

const expectRouteLayoutStability = (
  samples: RouteLayoutMonitorSample[],
  stepLabel: string
): void => {
  expect(samples.length, `${stepLabel}: expected animation-frame samples`).toBeGreaterThan(0);
  expect(
    samples.every((sample) => sample.hasShell),
    `${stepLabel}: route shell disappeared during layout monitoring`
  ).toBe(true);
  expect(
    samples.every((sample) => !sample.hasHorizontalOverflow),
    `${stepLabel}: horizontal overflow appeared during navigation`
  ).toBe(true);

  const scrollbarGaps = samples.map((sample) => sample.scrollbarGap);
  const shellWidths = samples
    .map((sample) => sample.routeShellWidth)
    .filter((value): value is number => value !== null);
  const shellLefts = samples
    .map((sample) => sample.routeShellLeft)
    .filter((value): value is number => value !== null);
  const homeButtonLefts = samples
    .map((sample) => sample.homeButtonLeft)
    .filter((value): value is number => value !== null);

  expect(
    Math.max(...scrollbarGaps) - Math.min(...scrollbarGaps),
    `${stepLabel}: scrollbar gutter changed during navigation`
  ).toBeLessThanOrEqual(1);
  expect(
    Math.max(...shellWidths) - Math.min(...shellWidths),
    `${stepLabel}: route shell width shifted during navigation`
  ).toBeLessThanOrEqual(1.5);
  expect(
    Math.max(...shellLefts) - Math.min(...shellLefts),
    `${stepLabel}: route shell horizontal position shifted during navigation`
  ).toBeLessThanOrEqual(1);
  expect(
    Math.max(...homeButtonLefts) - Math.min(...homeButtonLefts),
    `${stepLabel}: top navigation jumped horizontally during navigation`
  ).toBeLessThanOrEqual(1.5);
};

const getGameHomeLayoutSnapshot = async (page: Page): Promise<GameHomeLayoutSnapshot> =>
  page.evaluate(() => {
    const isVisible = (element: Element | null): boolean => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }

      const styles = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        styles.display !== 'none' &&
        styles.visibility !== 'hidden' &&
        styles.opacity !== '0' &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    const actions = document.querySelector('[data-testid="kangur-home-actions-shell"]');
    const leaderboard = document.querySelector('[data-testid="leaderboard-shell"]');
    const progress = document.querySelector('[data-testid="player-progress-shell"]');

    return {
      actionsVisible: isVisible(actions),
      leaderboardTop: leaderboard?.getBoundingClientRect().top ?? null,
      progressTop: progress?.getBoundingClientRect().top ?? null,
    };
  });

const captureLessonsTransitionSnapshot = async (
  page: Page,
  selector: '[data-testid="lessons-list-transition"]' | '[data-testid="lessons-active-transition"]'
): Promise<LessonsTransitionSnapshot> =>
  page.evaluate(async (targetSelector) => {
    const waitForElement = async (elementSelector: string): Promise<HTMLElement> =>
      new Promise<HTMLElement>((resolve) => {
        const existingElement = document.querySelector<HTMLElement>(elementSelector);
        if (existingElement) {
          resolve(existingElement);
          return;
        }

        const observer = new MutationObserver(() => {
          const nextElement = document.querySelector<HTMLElement>(elementSelector);
          if (!nextElement) {
            return;
          }

          observer.disconnect();
          resolve(nextElement);
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      });

    const element = await waitForElement(targetSelector);

    return new Promise<LessonsTransitionSnapshot>((resolve) => {
      window.requestAnimationFrame(() => {
        const styles = window.getComputedStyle(element);
        const opacityValue = Number.parseFloat(styles.opacity);
        resolve({
          opacity: Number.isFinite(opacityValue) ? opacityValue : null,
          transform: styles.transform,
        });
      });
    });
  }, selector);

const expectAnimatedTransitionSnapshot = (
  snapshot: LessonsTransitionSnapshot,
  stepLabel: string
): void => {
  const isAnimatingOpacity = snapshot.opacity !== null && snapshot.opacity < 0.999;
  const isAnimatingTransform = snapshot.transform !== null && snapshot.transform !== 'none';

  expect(
    isAnimatingOpacity || isAnimatingTransform,
    `${stepLabel}: expected a non-instant lessons transition on the first animation frame`
  ).toBe(true);
};

const startRouteScrollMonitor = async (page: Page): Promise<void> => {
  await page.evaluate((monitorKey) => {
    const globalWindow = window as Window & {
      [key: string]:
        | {
            stop: () => RouteScrollMonitorSample[];
          }
        | undefined;
    };
    const samples: RouteScrollMonitorSample[] = [];
    let running = true;

    const sample = (): void => {
      samples.push({
        path: `${window.location.pathname}${window.location.search}`,
        scrollY: window.scrollY,
        hasSkeleton: Boolean(document.querySelector('[data-testid="kangur-page-transition-skeleton"]')),
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
  }, ROUTE_SCROLL_MONITOR_KEY);
};

const stopRouteScrollMonitor = async (page: Page): Promise<RouteScrollMonitorSample[]> =>
  page.evaluate((monitorKey) => {
    const globalWindow = window as Window & {
      [key: string]:
        | {
            stop: () => RouteScrollMonitorSample[];
          }
        | undefined;
    };

    return globalWindow[monitorKey]?.stop() ?? [];
  }, ROUTE_SCROLL_MONITOR_KEY);

const expectRouteToResetScrollAfterCommit = (
  samples: RouteScrollMonitorSample[],
  targetPath: string,
  stepLabel: string
): void => {
  const matchingSamples = samples.filter((sample) => sample.path === targetPath);

  expect(matchingSamples.length, `${stepLabel}: expected monitor samples on the target route`).toBeGreaterThan(0);
  expect(
    matchingSamples.some((sample) => sample.scrollY <= 2),
    `${stepLabel}: target route never settled back at the top of the page`
  ).toBe(true);
};

const expectNoRouteSkeletonFlash = (
  samples: RouteScrollMonitorSample[],
  stepLabel: string
): void => {
  expect(
    samples.some((sample) => sample.hasSkeleton),
    `${stepLabel}: navigation showed the blocking route skeleton during a fast route hop`
  ).toBe(false);
};

const waitForAnimationFrames = async (page: Page, frameCount: number): Promise<void> => {
  await page.evaluate(async (frames) => {
    await new Promise<void>((resolve) => {
      let remainingFrames = frames;

      const step = () => {
        remainingFrames -= 1;
        if (remainingFrames <= 0) {
          resolve();
          return;
        }

        window.requestAnimationFrame(step);
      };

      window.requestAnimationFrame(step);
    });
  }, frameCount);
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
    ownerEmailVerified: true,
    activeLearner,
    learners,
  };
};

const buildCredentialsProviderResponse = (origin: string) => ({
  credentials: {
    id: 'credentials',
    name: 'Credentials',
    type: 'credentials',
    signinUrl: `${origin}/api/auth/signin/credentials`,
    callbackUrl: `${origin}/api/auth/callback/credentials`,
  },
});

test.describe('Kangur navigation continuity', () => {
  test.describe.configure({ timeout: 120_000 });

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
    await gotoKangurPath(page, '/kangur/game');
    await expectGameRouteReady(page, 'kangur-primary-nav-lessons');

    const routeShell = page.getByTestId('kangur-route-shell');

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

  test('routes back home from the tests intro-card top section without remounting the shell', async ({
    page,
  }) => {
    await gotoKangurPath(page, '/kangur/game');
    await expectGameRouteReady(page, 'kangur-primary-nav-tests');
    const routeShell = page.getByTestId('kangur-route-shell');
    await markRouteShellAsPersistent(page);

    await page.getByTestId('kangur-primary-nav-tests').click();
    await expect(page).toHaveURL(/\/kangur\/tests$/);
    await expect(page.getByTestId('kangur-tests-list-top-section')).toBeVisible();
    await expectRouteShellMarker(page);

    await startRouteShellMonitor(page);
    await page
      .getByTestId('kangur-tests-list-top-section')
      .getByRole('button', { name: 'Wróć do poprzedniej strony' })
      .click();
    await expect(page).toHaveURL(/\/kangur$/);
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
    await expectRouteShellMarker(page);
    await page.waitForTimeout(250);

    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'tests back button -> home');
  });

  test('keeps the viewport width stable during main-page navigation transitions', async ({
    page,
  }) => {
    await gotoKangurPath(page, '/kangur/game');
    await expectGameRouteReady(page, 'kangur-primary-nav-lessons');

    await startRouteLayoutMonitor(page);
    await page.getByTestId('kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(/\/kangur\/lessons$/);
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteLayoutStability(await stopRouteLayoutMonitor(page), 'game -> lessons');

    await startRouteLayoutMonitor(page);
    await page.getByTestId('kangur-primary-nav-tests').click();
    await expect(page).toHaveURL(/\/kangur\/tests$/);
    await expect(page.getByRole('heading', { name: /Testy Kangur/i })).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteLayoutStability(await stopRouteLayoutMonitor(page), 'lessons -> tests');

    await startRouteLayoutMonitor(page);
    await page.getByTestId('kangur-primary-nav-home').click();
    await expect(page).toHaveURL(/\/kangur$/);
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteLayoutStability(await stopRouteLayoutMonitor(page), 'tests -> home');
  });

  test('keeps the lessons route hop on-page without flashing the blocking transition skeleton', async ({ page }) => {
    await gotoKangurPath(page, '/kangur/game');
    await expectGameRouteReady(page, 'kangur-primary-nav-lessons');
    await expect(page.getByTestId('kangur-page-transition-skeleton')).toHaveCount(0);

    await startRouteScrollMonitor(page);
    await page.getByTestId('kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(/\/kangur\/lessons$/);
    await expect(page.getByTestId('lessons-list-transition')).toBeVisible();
    await expect(page.getByTestId('lessons-list-intro-card')).toBeVisible();
    await expect(page.getByTestId('kangur-lessons-heading-art')).toBeVisible();
    await expect(
      page.getByTestId('lessons-list-intro-card').getByRole('heading', { name: 'Lekcje' })
    ).toBeVisible();
    await page.waitForTimeout(120);
    const samples = await stopRouteScrollMonitor(page);

    expectRouteToResetScrollAfterCommit(samples, '/kangur/lessons', 'game -> lessons');
    expectNoRouteSkeletonFlash(samples, 'game -> lessons');
  });

  test('animates the lessons surface smoothly on entry and when opening a lesson', async ({
    page,
  }) => {
    await gotoKangurPath(page, '/kangur/game');
    await expectGameRouteReady(page, 'kangur-primary-nav-lessons');

    const lessonsEntrySnapshotPromise = captureLessonsTransitionSnapshot(
      page,
      '[data-testid="lessons-list-transition"]'
    );

    await page.getByTestId('kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(/\/kangur\/lessons$/);
    await expect(page.getByTestId('lessons-list-transition')).toBeVisible();

    expectAnimatedTransitionSnapshot(await lessonsEntrySnapshotPromise, 'game -> lessons');

    const activeLessonSnapshotPromise = captureLessonsTransitionSnapshot(
      page,
      '[data-testid="lessons-active-transition"]'
    );

    await page.locator('[data-doc-id="lessons_library_entry"]').first().click();
    await expect(page.getByTestId('lessons-active-transition')).toBeVisible();

    expectAnimatedTransitionSnapshot(
      await activeLessonSnapshotPromise,
      'lessons library -> active lesson'
    );
  });

  test('keeps route navigation smooth when opening Lekcje and returning home through the StudiQ logo', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 560 });
    await gotoKangurPath(page, '/kangur/game');
    await expectGameRouteReady(page, 'kangur-primary-nav-lessons');
    await expect(page.getByTestId('kangur-page-transition-skeleton')).toHaveCount(0);

    await startRouteScrollMonitor(page);
    await page.getByTestId('kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(/\/kangur\/lessons$/);
    await expect(page.getByTestId('lessons-list-transition')).toBeVisible();
    await page.waitForTimeout(120);

    const gameToLessonsSamples = await stopRouteScrollMonitor(page);

    expectRouteToResetScrollAfterCommit(gameToLessonsSamples, '/kangur/lessons', 'game -> lessons');
    expectNoRouteSkeletonFlash(gameToLessonsSamples, 'game -> lessons');

    await page.evaluate(() => window.scrollTo({ top: 420, left: 0, behavior: 'auto' }));
    await expect
      .poll(() => page.evaluate(() => window.scrollY), {
        message: 'expected the Lessons page to become scrollable before returning home',
      })
      .toBeGreaterThan(140);

    await expect(page.getByTestId('kangur-page-transition-skeleton')).toHaveCount(0);
    await startRouteScrollMonitor(page);
    await page.getByTestId('kangur-primary-nav-home').click();
    await expect(page).toHaveURL(/\/kangur$/);
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
    await page.waitForTimeout(120);

    const lessonsToHomeSamples = await stopRouteScrollMonitor(page);

    expectRouteToResetScrollAfterCommit(lessonsToHomeSamples, '/kangur', 'lessons -> home');
    expectNoRouteSkeletonFlash(lessonsToHomeSamples, 'lessons -> home');
  });

  test('keeps game entry screens and quick-practice flows on the same route with consistent back navigation', async ({
    page,
  }) => {
    await gotoKangurPath(page, '/kangur/game');
    await expectGameRouteReady(page, 'kangur-primary-nav-home');
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });

    const routeShell = page.getByTestId('kangur-route-shell');
    await markRouteShellAsPersistent(page);

    await page.getByRole('button', { name: /grajmy/i }).click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(page.getByTestId('kangur-game-operation-top-section')).toBeVisible();
    await expect(page.getByTestId('kangur-grajmy-heading-art')).toBeVisible();
    await expect(
      page.getByTestId('kangur-game-operation-top-section').getByRole('heading', { name: 'Grajmy!' })
    ).toBeVisible();
    await expectRouteShellMarker(page);

    await page
      .getByTestId('kangur-game-operation-top-section')
      .getByRole('button', { name: 'Wróć do poprzedniej strony' })
      .click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
    await expectRouteShellMarker(page);

    await page.getByRole('button', { name: /trening mieszany/i }).click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(page.getByTestId('kangur-game-training-top-section')).toBeVisible();
    await expect(page.getByTestId('kangur-training-heading-art')).toBeVisible();
    await expect(
      page
        .getByTestId('kangur-game-training-top-section')
        .getByRole('heading', { name: 'Trening' })
    ).toBeVisible();
    await expectRouteShellMarker(page);

    await page
      .getByTestId('kangur-game-training-top-section')
      .getByRole('button', { name: 'Wróć do poprzedniej strony' })
      .click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
    await expectRouteShellMarker(page);

    await page.getByRole('button', { name: /kangur matematyczny/i }).click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(page.getByTestId('kangur-game-kangur-setup-top-section')).toBeVisible();
    await expect(page.getByTestId('kangur-kangur-heading-art')).toBeVisible();
    await expect(
      page
        .getByTestId('kangur-game-kangur-setup-top-section')
        .getByRole('heading', { name: 'Kangur' })
    ).toBeVisible();
    await expectRouteShellMarker(page);

    await page
      .getByTestId('kangur-game-kangur-setup-top-section')
      .getByRole('button', { name: 'Wróć do poprzedniej strony' })
      .click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
    await expectRouteShellMarker(page);

    await page.getByRole('button', { name: /grajmy/i }).click();
    await expect(page.getByTestId('kangur-game-operation-top-section')).toBeVisible();

    await page.evaluate(() => {
      window.scrollTo({ top: 320, left: 0, behavior: 'auto' });
    });
    await page.getByRole('button', { name: /ćwiczenia z kalendarzem/i }).click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(page.getByTestId('kangur-calendar-training-top-section')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Wróć do poprzedniej strony' })).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(48);
    await expect(page.getByTestId('kangur-primary-nav-home')).toBeVisible();
    await expectRouteShellMarker(page);

    await page.getByRole('button', { name: 'Wróć do poprzedniej strony' }).click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(page.getByTestId('kangur-game-operation-top-section')).toBeVisible();
    await expectRouteShellMarker(page);

    await page.evaluate(() => {
      window.scrollTo({ top: 320, left: 0, behavior: 'auto' });
    });
    await page.getByRole('button', { name: /ćwiczenia z figurami/i }).click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(page.getByTestId('kangur-geometry-training-top-section')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Wróć do poprzedniej strony' })).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(48);
    await expect(page.getByTestId('kangur-primary-nav-home')).toBeVisible();
    await expectRouteShellMarker(page);

    await page.getByRole('button', { name: 'Wróć do poprzedniej strony' }).click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(page.getByTestId('kangur-game-operation-top-section')).toBeVisible();
    await expectRouteShellMarker(page);
  });

  test('keeps the home action panel mounted while the leaderboard and progress stack exit to Grajmy', async ({
    page,
  }) => {
    await gotoKangurPath(page, '/kangur/game');
    await expectGameRouteReady(page, 'kangur-primary-nav-home');

    const actionsShell = page.getByTestId('kangur-home-actions-shell');
    const leaderboard = page.getByTestId('leaderboard-shell');
    const progressCard = page.getByTestId('player-progress-shell');

    await expect(actionsShell).toBeVisible({ timeout: ROUTE_BOOT_TIMEOUT_MS });
    await expect(leaderboard).toBeVisible({ timeout: ROUTE_BOOT_TIMEOUT_MS });
    await expect(progressCard).toBeVisible({ timeout: ROUTE_BOOT_TIMEOUT_MS });

    const initialLayout = await getGameHomeLayoutSnapshot(page);

    await page.getByRole('button', { name: /grajmy/i }).click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await waitForAnimationFrames(page, 2);

    const transitionLayout = await getGameHomeLayoutSnapshot(page);

    expect(transitionLayout.actionsVisible).toBe(true);
    expect(initialLayout.leaderboardTop).not.toBeNull();
    expect(initialLayout.progressTop).not.toBeNull();
    expect(transitionLayout.leaderboardTop).not.toBeNull();
    expect(transitionLayout.progressTop).not.toBeNull();
    expect(
      Math.abs((transitionLayout.leaderboardTop ?? 0) - (initialLayout.leaderboardTop ?? 0))
    ).toBeLessThan(60);
    expect(
      Math.abs((transitionLayout.progressTop ?? 0) - (initialLayout.progressTop ?? 0))
    ).toBeLessThan(60);

    await expect(page.getByTestId('kangur-game-operation-top-section')).toBeVisible();
    await expect(actionsShell).toHaveCount(0);
  });

  test('keeps the parent dashboard entry hidden for learner sessions across page navigation', async ({
    page,
  }) => {
    await page.route('**/api/kangur/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildLearnerUser()),
      });
    });

    await gotoKangurPath(page, '/kangur/game');
    await expectGameRouteReady(page, 'kangur-primary-nav-tests');
    await expect(page.getByRole('link', { name: /profil/i })).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(page.getByTestId('kangur-primary-nav-parent-dashboard')).toHaveCount(0);

    await page.getByTestId('kangur-primary-nav-tests').click();
    await expect(page).toHaveURL(/\/kangur\/tests$/);
    await expect(page.getByRole('heading', { name: /testy kangur/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /profil/i })).toBeVisible();
    await expect(page.getByTestId('kangur-primary-nav-parent-dashboard')).toHaveCount(0);
  });

  test('keeps the persistent shell mounted for parent-dashboard navigation', async ({ page }) => {
    await page.route('**/api/kangur/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildManagerUser()),
      });
    });

    await gotoKangurPath(page, '/kangur/profile');
    await expectLearnerProfileRouteReady(page);

    const routeShell = page.getByTestId('kangur-route-shell');
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

  test('routes back to the learner profile from the parent-dashboard intro-card top section', async ({
    page,
  }) => {
    await page.route('**/api/kangur/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildManagerUser()),
      });
    });

    await gotoKangurPath(page, '/kangur/parent-dashboard');
    await expectParentDashboardRouteReady(page);
    await markRouteShellAsPersistent(page);

    await startRouteShellMonitor(page);
    await page
      .getByTestId('kangur-parent-dashboard-hero')
      .getByRole('button', { name: 'Wróć do poprzedniej strony' })
      .click();
    await expect(page).toHaveURL(/\/kangur\/profile$/);
    await expect(page.getByTestId('kangur-learner-profile-hero')).toBeVisible();
    await expectRouteShellMarker(page);
    await page.waitForTimeout(250);

    expectRouteShellContinuity(
      await stopRouteShellMonitor(page),
      'parent-dashboard back button -> profile'
    );
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

    await gotoKangurPath(page, '/kangur/parent-dashboard');
    await expectParentDashboardRouteReady(page);

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

    await gotoKangurPath(page, '/kangur/parent-dashboard');
    await expectParentDashboardRouteReady(page);

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

    await gotoKangurPath(page, '/kangur/parent-dashboard');
    await expectParentDashboardRouteReady(page);
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
    await gotoKangurPath(page, '/kangur/game');
    await expectGameRouteReady(page, 'kangur-primary-nav-home');

    await startKangurSurfaceMonitor(page);
    await page
      .getByLabel('Glowna nawigacja Kangur')
      .getByRole('button', { name: 'Zaloguj się' })
      .click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expectKangurLoginReady(page);
    await page.waitForTimeout(250);
    expectKangurSurfaceContinuity(await stopKangurSurfaceMonitor(page), 'game -> login modal');

    await startKangurSurfaceMonitor(page);
    await page.getByTestId('kangur-login-modal-close').click();
    await expect(page).toHaveURL(/\/kangur\/game$/, { timeout: ROUTE_BOOT_TIMEOUT_MS });
    await expectGameRouteReady(page, 'kangur-primary-nav-home');
    await page.waitForTimeout(250);
    expectKangurSurfaceContinuity(await stopKangurSurfaceMonitor(page), 'login modal -> game');

    const documentLoadCount = await page.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      DOCUMENT_LOAD_COUNT_KEY
    );
    expect(documentLoadCount).toBe('1');
  });

  test('renders the standalone Kangur login route on the shared premium surface', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await gotoKangurPath(page, '/kangur/login?callbackUrl=%2Fkangur%2Fprofile');

    await expectKangurLoginReady(page);
    await expectKangurAppShellVisible(page, ROUTE_BOOT_TIMEOUT_MS);
    await expect(page.getByTestId('kangur-primary-nav-home')).toBeVisible();
    await expect(page.getByLabel('Email rodzica lub nick ucznia')).toBeVisible();

    const [bodyBackgroundImage, appContentBackgroundImage] = await page.evaluate(() => {
      const bodyStyles = window.getComputedStyle(document.body);
      const appContent = document.getElementById('app-content');
      const appContentStyles = appContent ? window.getComputedStyle(appContent) : null;
      return [bodyStyles.backgroundImage, appContentStyles?.backgroundImage ?? null];
    });

    expect(bodyBackgroundImage).toContain('radial-gradient');
    expect(appContentBackgroundImage).toContain('radial-gradient');

    await startKangurSurfaceMonitor(page);
    await page.getByTestId('kangur-login-modal-close').click();
    await expect(page).toHaveURL(/\/(?:kangur)?$/, { timeout: ROUTE_BOOT_TIMEOUT_MS });
    await expectKangurAppShellVisible(page, ROUTE_BOOT_TIMEOUT_MS);
    await page.waitForTimeout(250);
    expectKangurSurfaceContinuity(await stopKangurSurfaceMonitor(page), 'direct login modal -> kangur');

    const documentLoadCount = await page.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      DOCUMENT_LOAD_COUNT_KEY
    );
    expect(documentLoadCount).toBe('1');
  });

  test('submits parent credentials from the unified Kangur login page and returns to the callback route', async ({
    page,
  }) => {
    let callbackPayload: URLSearchParams | null = null;

    await page.route('**/api/auth/providers**', async (route) => {
      const origin = new URL(route.request().url()).origin;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildCredentialsProviderResponse(origin)),
      });
    });

    await page.route('**/api/auth/csrf**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ csrfToken: 'kangur-parent-csrf' }),
      });
    });

    await page.route('**/api/auth/callback/credentials**', async (route) => {
      callbackPayload = new URLSearchParams(route.request().postData() ?? '');
      const origin = new URL(route.request().url()).origin;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: `${origin}/kangur?login=parent` }),
      });
    });

    await page.route('**/api/kangur/auth/learner-signout**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await gotoKangurPath(page, '/kangur/login?callbackUrl=%2Fkangur%3Flogin%3Dparent');
    await expectKangurLoginReady(page);

    const identifierField = page
      .getByTestId('kangur-login-form')
      .getByLabel('Email rodzica lub nick ucznia');
    const parentPasswordField = page.getByTestId('kangur-login-form').getByLabel('Haslo');

    await identifierField.fill('parent@example.com');
    await parentPasswordField.fill('secret123');
    await expect(identifierField).toHaveValue('parent@example.com');
    await expect(parentPasswordField).toHaveValue('secret123');
    await expect(page.getByTestId('kangur-login-form')).toHaveAttribute('data-login-kind', 'parent');
    await page.getByRole('button', { name: 'Zaloguj haslem' }).click();

    await expect(page).toHaveURL(/\/kangur\?login=parent$/);
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
    expect(callbackPayload?.get('email')).toBe('parent@example.com');
    expect(callbackPayload?.get('password')).toBe('secret123');
    expect(callbackPayload?.get('callbackUrl')).toBe('/kangur?login=parent');
  });

  test('prompts a magic-link-created parent to set a password before completing login', async ({
    page,
  }) => {
    let exchangePayload: { token?: string } | null = null;
    let callbackPayload: URLSearchParams | null = null;
    let parentPasswordPayload: { password?: string } | null = null;
    let parentSignedIn = false;

    await page.route('**/api/auth/providers**', async (route) => {
      const origin = new URL(route.request().url()).origin;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildCredentialsProviderResponse(origin)),
      });
    });

    await page.route('**/api/auth/csrf**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ csrfToken: 'kangur-magic-parent-csrf' }),
      });
    });

    await page.route('**/api/kangur/auth/learner-signout**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.route('**/api/kangur/auth/parent-magic-link/exchange**', async (route) => {
      exchangePayload = JSON.parse(route.request().postData() ?? '{}') as { token?: string };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          email: 'parent@example.com',
          challengeId: 'magic-challenge-1',
          callbackUrl: '/kangur?login=magic-parent',
          emailVerified: false,
          hasPassword: false,
        }),
      });
    });

    await page.route('**/api/auth/callback/credentials**', async (route) => {
      callbackPayload = new URLSearchParams(route.request().postData() ?? '');
      parentSignedIn = true;
      const origin = new URL(route.request().url()).origin;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: `${origin}/kangur?login=magic-parent` }),
      });
    });

    await page.route('**/api/kangur/auth/parent-password**', async (route) => {
      parentPasswordPayload = JSON.parse(route.request().postData() ?? '{}') as {
        password?: string;
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          email: 'parent@example.com',
          hasPassword: true,
          message:
            'Haslo rodzica zostalo ustawione. Od teraz mozesz logowac sie emailem i haslem.',
        }),
      });
    });

    await page.route('**/api/kangur/auth/me**', async (route) => {
      if (!parentSignedIn) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              message: 'Authentication required.',
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildManagerUserWithLearnerMood('learner-001')),
      });
    });

    await gotoKangurPath(
      page,
      '/kangur/login?callbackUrl=%2Fkangur%3Flogin%3Dmagic-parent&magicLinkToken=magic-link-1'
    );

    await expect(page.getByTestId('kangur-login-modal')).toBeVisible();
    await expect(page.getByText('Ustaw haslo rodzica')).toBeVisible();
    await expect(page.getByText('parent@example.com')).toBeVisible();

    await page.getByLabel('Nowe haslo').fill('Magic123!');
    await page.getByLabel('Powtorz haslo').fill('Magic123!');
    await page.getByRole('button', { name: 'Ustaw haslo i przejdz dalej' }).click();

    await expect(page).toHaveURL(/\/kangur\?login=magic-parent$/);
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
    expect(exchangePayload?.token).toBe('magic-link-1');
    expect(callbackPayload?.get('challengeId')).toBe('magic-challenge-1');
    expect(callbackPayload?.get('email')).toBe('parent@example.com');
    expect(callbackPayload?.get('callbackUrl')).toBe('/kangur?login=magic-parent');
    expect(parentPasswordPayload).toEqual({
      password: 'Magic123!',
    });
  });

  test('submits student nickname credentials from the unified Kangur login page and returns to the callback route', async ({
    page,
  }) => {
    let learnerSignInPayload: Record<string, string> | null = null;
    let learnerSignedIn = false;

    await page.route('**/api/auth/csrf**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ csrfToken: 'kangur-student-csrf' }),
      });
    });

    await page.route('**/api/auth/signout**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: '/kangur/login' }),
      });
    });

    await page.route('**/api/kangur/auth/learner-signout**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.route('**/api/kangur/auth/learner-signin**', async (route) => {
      learnerSignInPayload = JSON.parse(route.request().postData() ?? '{}') as Record<string, string>;
      learnerSignedIn = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          learnerId: 'learner-001',
          ownerEmail: 'parent@example.com',
        }),
      });
    });

    await page.route('**/api/kangur/auth/me**', async (route) => {
      if (!learnerSignedIn) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unauthorized' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildLearnerUser()),
      });
    });

    await gotoKangurPath(page, '/kangur/login?callbackUrl=%2Fkangur%3Flogin%3Dstudent');
    await expectKangurLoginReady(page);

    const studentNicknameField = page
      .getByTestId('kangur-login-form')
      .getByLabel('Email rodzica lub nick ucznia');
    const studentPasswordField = page.getByTestId('kangur-login-form').getByLabel('Haslo');

    await studentNicknameField.fill('janek123');
    await studentPasswordField.fill('secret123');
    await expect(studentNicknameField).toHaveValue('janek123');
    await expect(studentPasswordField).toHaveValue('secret123');
    await expect(page.getByTestId('kangur-login-form')).toHaveAttribute(
      'data-login-kind',
      'student'
    );
    await page.getByRole('button', { name: 'Zaloguj sie' }).click();

    await expect(page).toHaveURL(/\/kangur\?login=student$/);
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => window.localStorage.getItem('kangur.activeLearnerId'))
      )
      .toBe('learner-001');
    expect(learnerSignInPayload).toEqual({
      loginName: 'janek123',
      password: 'secret123',
    });
  });
});
