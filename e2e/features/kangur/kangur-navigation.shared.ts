import { expect, type Locator, type Page } from '@playwright/test';

export const DOCUMENT_LOAD_COUNT_KEY = '__kangurE2eDocumentLoadCount';
export const ROUTE_SHELL_MONITOR_KEY = '__kangurRouteShellMonitor';
export const ROUTE_SHELL_MARKER_KEY = '__kangurE2eShellMarker';
export const ROUTE_LAYOUT_MONITOR_KEY = '__kangurRouteLayoutMonitor';
export const ROUTE_SCROLL_MONITOR_KEY = '__kangurRouteScrollMonitor';
export const ROUTE_BOOT_TIMEOUT_MS = 45_000;
export const ROUTE_INITIAL_GOTO_TIMEOUT_MS = 90_000;
export const HOME_LESSONS_ACTION_SOURCE_ID = 'game-home-action:lessons';
export const PRIMARY_NAV_HOME_SOURCE_ID = 'kangur-primary-nav:home';
export const PRIMARY_NAV_LESSONS_SOURCE_ID = 'kangur-primary-nav:lessons';
export const LESSONS_LIST_BACK_SOURCE_ID = 'lessons:list-back';
export const HOME_ROUTE_PATH_PATTERN = /^\/(?:[a-z]{2}(?:\/kangur)?|kangur)$/;
export const HOME_ROUTE_URL_PATTERN = /\/(?:[a-z]{2}(?:\/kangur)?|kangur)$/;
export const HOME_HISTORY_RETURN_ROUTE_URL_PATTERN =
  /\/(?:[a-z]{2}(?:\/kangur(?:\/game)?)?|kangur(?:\/game)?)$/;
export const PROFILE_ROUTE_URL_PATTERN = /\/(?:kangur|[a-z]{2})\/profile$/;
export const LESSONS_ROUTE_PATH_PATTERN = /^\/(?:(?:[a-z]{2})\/)?(?:kangur\/)?lessons$/;
export const LESSONS_ROUTE_URL_PATTERN = /\/(?:(?:[a-z]{2})\/)?(?:kangur\/)?lessons$/;
export const LESSONS_HEADING_PATTERN = /^(?:Lekcje|Lessons)$/;
export const PARENT_DASHBOARD_HEADING_PATTERN = /^(?:Panel Rodzica|Parent dashboard)$/i;
export const PAGE_BACK_BUTTON_LABEL_PATTERN = /(?:wróć do poprzedniej strony|go back to previous page)/i;
export const TOPICS_BACK_BUTTON_LABEL_PATTERN = /(?:wróć do tematów|back to topics)/i;
export const PASSWORD_LABEL_PATTERN = /(?:hasło|password)/i;
export const HOME_LABEL_PATTERN = /(?:strona główna|home page)/i;
export const MAGIC_LINK_DEPRECATED_NOTICE_PATTERN =
  /(?:Email link sign-in is no longer available\. Sign in with email and password or create an account\.|Logowanie linkiem z e-maila nie jest już dostępne\. Zaloguj się e-mailem i hasłem albo utwórz konto\.)/i;
export const LOGIN_IDENTIFIER_LABEL_PATTERN =
  /Email rodzica (albo|lub) nick ucznia|Parent email or learner username/i;

export type RouteShellMonitorSample = {
  hasShell: boolean;
  routeShellCount: number;
  routeContentCount: number;
  backgroundImage: string | null;
  bodyBackgroundImage: string | null;
  appContentBackgroundImage: string | null;
};

export type KangurSurfaceMonitorSample = {
  hasRouteShell: boolean;
  routeShellBackgroundImage: string | null;
  hasFeaturePageShell: boolean;
  featurePageShellBackgroundImage: string | null;
  hasLoginShell: boolean;
  loginShellBackgroundImage: string | null;
  bodyBackgroundImage: string | null;
  appContentBackgroundImage: string | null;
};

export type RouteLayoutMonitorSample = {
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

export type GameHomeLayoutSnapshot = {
  actionsVisible: boolean;
  leaderboardTop: number | null;
  progressTop: number | null;
};

export type LessonsTransitionSnapshot = {
  opacity: number | null;
  transform: string | null;
};

export type RouteScrollMonitorSample = {
  path: string;
  scrollY: number;
  hasSkeleton: boolean;
  skeletonTop: number | null;
  skeletonLessonsLibraryTop: number | null;
  skeletonHomeLayoutTop: number | null;
  skeletonHomeActionsTop: number | null;
  topBarBottom: number | null;
  hasAppLoader: boolean;
  transitionPhase: string | null;
  activeTransitionSourceId: string | null;
  homeLessonsNavState: string | null;
  homeLayoutTop: number | null;
  homeActionsTop: number | null;
};

export type TopNavLayoutSnapshot = {
  viewportWidth: number;
  topBarTop: number | null;
  topBarWidth: number | null;
  topBarPosition: string | null;
  navTop: number | null;
  navLeft: number | null;
  navRight: number | null;
  navWidth: number | null;
  utilityLeft: number | null;
  utilityRight: number | null;
  lessonsRight: number | null;
  parentRight: number | null;
  logoutRight: number | null;
};

export const expectGameRouteReady = async (page: Page, navTestId: string): Promise<void> => {
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

export const expectLessonsLibraryReady = async (page: Page): Promise<void> => {
  await expect(page.getByTestId('kangur-page-transition-skeleton')).toHaveCount(0, {
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByTestId('kangur-route-content')).not.toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByTestId('lessons-list-intro-card')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const isVisible = (element: Element | null): boolean => {
            if (!(element instanceof HTMLElement)) {
              return false;
            }

            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          };

          return (
            isVisible(document.querySelector('[data-doc-id="lessons_library_entry"]')) ||
            isVisible(document.querySelector('button[id^="kangur-lesson-group-trigger-"]'))
          );
        }),
      {
        message: 'expected the Lessons catalog to render visible groups or lesson entries',
        timeout: ROUTE_BOOT_TIMEOUT_MS,
      }
    )
    .toBe(true);
};

export const ensureVisibleLessonEntry = async (page: Page): Promise<Locator> => {
  const visibleLessonEntry = page.locator('[data-doc-id="lessons_library_entry"]:visible').first();

  if ((await visibleLessonEntry.count()) === 0) {
    const firstVisibleGroupTrigger = page
      .locator('button[id^="kangur-lesson-group-trigger-"]:visible')
      .first();

    await expect(firstVisibleGroupTrigger).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await firstVisibleGroupTrigger.click();
    await expect(visibleLessonEntry).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
  }

  return visibleLessonEntry;
};

export const getVisibleTopBarNavAction = (page: Page, testId: string): Locator =>
  testId === 'kangur-primary-nav-home'
    ? page
        .getByTestId('kangur-page-top-bar')
        .getByRole('link', { name: HOME_LABEL_PATTERN })
        .last()
    : page.getByTestId('kangur-page-top-bar').locator(`[data-testid="${testId}"]:visible`).last();

export const getVisibleTopBarProfileAction = (page: Page): Locator =>
  page.getByTestId('kangur-page-top-bar').locator('[data-doc-id="top_nav_profile"]:visible').last();

export const expectLocatorToHaveClassToken = async (
  locator: Locator,
  classToken: string
): Promise<void> => {
  await expect
    .poll(
      () =>
        locator.evaluate(
          (element, expectedClassToken) => element.classList.contains(expectedClassToken),
          classToken
        ),
      {
        message: `expected element to include class token "${classToken}"`,
      }
    )
    .toBe(true);
};

export const expectLearnerProfileRouteReady = async (page: Page): Promise<void> => {
  const profileMain = page.locator('#kangur-learner-profile-main');
  const statsHeading = page.locator('#kangur-learner-profile-stats-heading');
  const tablist = page.getByRole('tablist');

  await expect(page.getByTestId('kangur-route-shell')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(profileMain).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(statsHeading).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(tablist).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
};

export const expectParentDashboardRouteReady = async (page: Page): Promise<void> => {
  const hero = page.getByTestId('kangur-parent-dashboard-hero');

  await expect(hero).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByRole('heading', { name: PARENT_DASHBOARD_HEADING_PATTERN })).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
};

export const expectKangurLoginReady = async (page: Page): Promise<void> => {
  await expect(getKangurLoginDialog(page)).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByTestId('kangur-login-form')).toHaveAttribute('data-hydrated', 'true', {
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByTestId('kangur-login-form')).toHaveAttribute('data-login-kind', 'unknown', {
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(getKangurLoginIdentifierField(page)).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
};

export const getKangurLoginDialog = (page: Page): Locator =>
  page.getByRole('dialog', { name: /(?:sign in|zaloguj)/i });

export const getKangurLoginIdentifierField = (page: Page): Locator =>
  page.getByTestId('kangur-login-form').getByLabel(LOGIN_IDENTIFIER_LABEL_PATTERN);

export const getKangurLoginPasswordField = (page: Page): Locator =>
  page.getByTestId('kangur-login-form').getByRole('textbox', {
    name: PASSWORD_LABEL_PATTERN,
  });

export const getKangurLoginSubmitButton = (page: Page): Locator =>
  page.getByTestId('kangur-login-form').locator('button[type="submit"]');

export const gotoKangurPath = async (page: Page, path: string): Promise<void> => {
  await page.goto(path, {
    waitUntil: 'commit',
    timeout: ROUTE_INITIAL_GOTO_TIMEOUT_MS,
  });
};

export const matchesRoutePath = (path: string, targetPath: string | RegExp): boolean =>
  typeof targetPath === 'string' ? path === targetPath : targetPath.test(path);

export const startRouteShellMonitor = async (page: Page): Promise<void> => {
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
      const routeShellCount = document.querySelectorAll('[data-testid="kangur-route-shell"]').length;
      const routeContentCount =
        document.querySelectorAll('[data-testid="kangur-route-content"]').length;
      const shellStyles = shell ? window.getComputedStyle(shell) : null;
      const bodyStyles = window.getComputedStyle(document.body);
      const appContent = document.getElementById('app-content');
      const appContentStyles = appContent ? window.getComputedStyle(appContent) : null;
      samples.push({
        hasShell: Boolean(shell),
        routeShellCount,
        routeContentCount,
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

export const stopRouteShellMonitor = async (page: Page): Promise<RouteShellMonitorSample[]> =>
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

export const expectRouteShellContinuity = (
  samples: RouteShellMonitorSample[],
  stepLabel: string
): void => {
  expect(samples.length, `${stepLabel}: expected animation-frame samples`).toBeGreaterThan(0);
  expect(
    samples.every((sample) => sample.hasShell),
    `${stepLabel}: route shell disappeared during navigation`
  ).toBe(true);
  expect(
    samples.every((sample) => sample.routeShellCount <= 1),
    `${stepLabel}: duplicate Kangur route shells rendered during navigation`
  ).toBe(true);
  expect(
    samples.every((sample) => sample.routeContentCount <= 1),
    `${stepLabel}: duplicate Kangur route content wrappers rendered during navigation`
  ).toBe(true);
  expect(
    samples.every((sample) => sample.backgroundImage?.includes('radial-gradient') === true),
    `${stepLabel}: route shell lost the Kangur premium background`
  ).toBe(true);
  expect(
    samples.every((sample) => sample.bodyBackgroundImage?.includes('radial-gradient') === true),
    `${stepLabel}: document body lost the Kangur premium background`
  ).toBe(true);
  expect(
    samples.every(
      (sample) =>
        sample.appContentBackgroundImage === null ||
        sample.appContentBackgroundImage === 'none' ||
        sample.appContentBackgroundImage.includes('radial-gradient')
    ),
    `${stepLabel}: app content lost the Kangur premium background`
  ).toBe(true);
};

export const startKangurSurfaceMonitor = async (page: Page): Promise<void> => {
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
      const featurePageShellStyles = featurePageShell
        ? window.getComputedStyle(featurePageShell)
        : null;
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

export const stopKangurSurfaceMonitor = async (
  page: Page
): Promise<KangurSurfaceMonitorSample[]> =>
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

export const expectKangurSurfaceContinuity = (
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
        sample.routeShellBackgroundImage?.includes('radial-gradient') === true
    ),
    `${stepLabel}: visible route shell lost the premium background`
  ).toBe(true);
  expect(
    samples.every(
      (sample) =>
        !sample.hasFeaturePageShell ||
        sample.featurePageShellBackgroundImage?.includes('radial-gradient') === true
    ),
    `${stepLabel}: visible feature-page shell lost the premium background`
  ).toBe(true);
  expect(
    samples.every((sample) => sample.bodyBackgroundImage?.includes('radial-gradient') === true),
    `${stepLabel}: document body lost the Kangur premium background`
  ).toBe(true);
  expect(
    samples.every(
      (sample) =>
        sample.appContentBackgroundImage === null ||
        sample.appContentBackgroundImage === 'none' ||
        sample.appContentBackgroundImage.includes('radial-gradient')
    ),
    `${stepLabel}: app content lost the Kangur premium background`
  ).toBe(true);
};

export const expectKangurAppShellVisible = async (
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

export const startRouteLayoutMonitor = async (page: Page): Promise<void> => {
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

export const stopRouteLayoutMonitor = async (
  page: Page
): Promise<RouteLayoutMonitorSample[]> =>
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

export const expectRouteLayoutStability = (
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
