import { expect, test, type Locator, type Page } from '@playwright/test';

const DOCUMENT_LOAD_COUNT_KEY = '__kangurE2eDocumentLoadCount';
const ROUTE_SHELL_MONITOR_KEY = '__kangurRouteShellMonitor';
const ROUTE_SHELL_MARKER_KEY = '__kangurE2eShellMarker';
const ROUTE_LAYOUT_MONITOR_KEY = '__kangurRouteLayoutMonitor';
const ROUTE_SCROLL_MONITOR_KEY = '__kangurRouteScrollMonitor';
const ROUTE_BOOT_TIMEOUT_MS = 45_000;
const ROUTE_INITIAL_GOTO_TIMEOUT_MS = 90_000;
const HOME_LESSONS_ACTION_SOURCE_ID = 'game-home-action:lessons';
const PRIMARY_NAV_HOME_SOURCE_ID = 'kangur-primary-nav:home';
const PRIMARY_NAV_LESSONS_SOURCE_ID = 'kangur-primary-nav:lessons';
const LESSONS_LIST_BACK_SOURCE_ID = 'lessons:list-back';
const HOME_ROUTE_PATH_PATTERN = /^\/(?:kangur|[a-z]{2})$/;
const HOME_ROUTE_URL_PATTERN = /\/(?:kangur|[a-z]{2})$/;
const HOME_HISTORY_RETURN_ROUTE_URL_PATTERN = /\/(?:kangur(?:\/game)?|[a-z]{2})$/;
const PROFILE_ROUTE_URL_PATTERN = /\/(?:kangur|[a-z]{2})\/profile$/;
const LESSONS_ROUTE_PATH_PATTERN = /^\/(?:[a-z]{2}\/)?lessons$/;
const LESSONS_ROUTE_URL_PATTERN = /\/(?:[a-z]{2}\/)?lessons$/;
const LESSONS_HEADING_PATTERN = /^(?:Lekcje|Lessons)$/;
const PAGE_BACK_BUTTON_LABEL_PATTERN = /(?:wróć do poprzedniej strony|go back to previous page)/i;

type RouteShellMonitorSample = {
  hasShell: boolean;
  routeShellCount: number;
  routeContentCount: number;
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
  skeletonTop: number | null;
  skeletonHomeLayoutTop: number | null;
  topBarBottom: number | null;
  hasAppLoader: boolean;
  transitionPhase: string | null;
  activeTransitionSourceId: string | null;
  homeLessonsNavState: string | null;
  homeLayoutTop: number | null;
};

type TopNavLayoutSnapshot = {
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

const getVisibleTopBarNavAction = (page: Page, testId: string): Locator =>
  page.getByTestId('kangur-page-top-bar').locator(`[data-testid="${testId}"]:visible`).last();

const expectLocatorToHaveClassToken = async (
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

const expectLearnerProfileRouteReady = async (page: Page): Promise<void> => {
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

const expectParentDashboardRouteReady = async (page: Page): Promise<void> => {
  const hero = page.getByTestId('kangur-parent-dashboard-hero');

  await expect(hero).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByRole('heading', { name: /^Panel Rodzica$/ })).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expectLocatorToHaveClassToken(hero, 'text-center');
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
    page
      .getByTestId('kangur-login-form')
      .getByLabel(/Email rodzica (albo|lub) nick ucznia/i)
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

const matchesRoutePath = (path: string, targetPath: string | RegExp): boolean =>
  typeof targetPath === 'string' ? path === targetPath : targetPath.test(path);

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
    samples.every((sample) => sample.routeShellCount <= 1),
    `${stepLabel}: duplicate Kangur route shells rendered during navigation`
  ).toBe(true);
  expect(
    samples.every((sample) => sample.routeContentCount <= 1),
    `${stepLabel}: duplicate Kangur route content wrappers rendered during navigation`
  ).toBe(true);
  expect(
    samples.every(
      (sample) =>
        sample.backgroundImage?.includes('radial-gradient') === true
    ),
    `${stepLabel}: route shell lost the Kangur premium background`
  ).toBe(true);
  expect(
    samples.every(
      (sample) =>
        sample.bodyBackgroundImage?.includes('radial-gradient') === true
    ),
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
    samples.every(
      (sample) =>
        sample.bodyBackgroundImage?.includes('radial-gradient') === true
    ),
    `${stepLabel}: document body lost the Kangur premium background`
  ).toBe(true);
  expect(
    samples.every(
      (sample) =>
        sample.appContentBackgroundImage?.includes('radial-gradient') === true
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
      const routeContent = document.querySelector('[data-testid="kangur-route-content"]');
      const homeLessonsAction = document.querySelector('[data-testid="kangur-home-action-lessons"]');
      const skeleton = document.querySelector('[data-testid="kangur-page-transition-skeleton"]');
      const skeletonHomeLayout = document.querySelector(
        '[data-testid="kangur-page-transition-skeleton-game-home-layout"]'
      );
      const homeLayout = document.querySelector('[data-testid="kangur-game-home-layout"]');
      const topBar = document.querySelector('[data-testid="kangur-page-top-bar"]');
      const skeletonRect = skeleton?.getBoundingClientRect() ?? null;
      const skeletonHomeLayoutRect = skeletonHomeLayout?.getBoundingClientRect() ?? null;
      const homeLayoutRect = homeLayout?.getBoundingClientRect() ?? null;
      const topBarRect = topBar?.getBoundingClientRect() ?? null;
      samples.push({
        path: `${window.location.pathname}${window.location.search}`,
        scrollY: window.scrollY,
        hasSkeleton: Boolean(skeletonRect),
        skeletonTop: skeletonRect?.top ?? null,
        skeletonHomeLayoutTop: skeletonHomeLayoutRect?.top ?? null,
        topBarBottom: topBarRect?.bottom ?? null,
        hasAppLoader: Boolean(document.querySelector('[data-testid="kangur-app-loader"]')),
        transitionPhase: routeContent?.getAttribute('data-route-transition-phase') ?? null,
        activeTransitionSourceId:
          routeContent?.getAttribute('data-route-transition-source-id') ?? null,
        homeLessonsNavState: homeLessonsAction?.getAttribute('data-nav-state') ?? null,
        homeLayoutTop: homeLayoutRect?.top ?? null,
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
  targetPath: string | RegExp,
  stepLabel: string
): void => {
  const matchingSamples = samples.filter((sample) => matchesRoutePath(sample.path, targetPath));

  expect(matchingSamples.length, `${stepLabel}: expected monitor samples on the target route`).toBeGreaterThan(0);
  expect(
    matchingSamples.some((sample) => sample.scrollY <= 2),
    `${stepLabel}: target route never settled back at the top of the page`
  ).toBe(true);
};

const expectNoAppLoaderFlash = (
  samples: RouteScrollMonitorSample[],
  stepLabel: string
): void => {
  expect(
    samples.some((sample) => sample.hasAppLoader),
    `${stepLabel}: navigation showed the global app loader instead of staying in-shell`
  ).toBe(false);
};

const expectLessonsSkeletonToStartBelowTopBar = (
  samples: RouteScrollMonitorSample[],
  stepLabel: string,
  tolerance = 2
): void => {
  const skeletonSamples = samples.filter(
    (sample) => sample.hasSkeleton && sample.skeletonTop !== null && sample.topBarBottom !== null
  );

  expect(
    skeletonSamples.length,
    `${stepLabel}: expected geometry samples while the lessons skeleton was visible`
  ).toBeGreaterThan(0);
  expect(
    skeletonSamples.every(
      (sample) => (sample.skeletonTop ?? Number.NEGATIVE_INFINITY) >= (sample.topBarBottom ?? 0) - tolerance
    ),
    `${stepLabel}: lessons skeleton rendered above the top bar before settling`
  ).toBe(true);
};

const expectHomeSkeletonToAlignWithLoadedHomeLayout = (
  samples: RouteScrollMonitorSample[],
  stepLabel: string,
  tolerance = 4
): void => {
  const skeletonSamples = samples.filter(
    (sample) =>
      sample.hasSkeleton &&
      sample.skeletonHomeLayoutTop !== null &&
      sample.topBarBottom !== null
  );
  const firstSkeletonTop = skeletonSamples[0]?.skeletonHomeLayoutTop ?? null;
  const finalHomeLayoutTop =
    [...samples].reverse().find((sample) => sample.homeLayoutTop !== null)?.homeLayoutTop ?? null;

  expect(
    skeletonSamples.length,
    `${stepLabel}: expected geometry samples while the home skeleton was visible`
  ).toBeGreaterThan(0);
  expect(
    skeletonSamples.every(
      (sample) =>
        (sample.skeletonHomeLayoutTop ?? Number.NEGATIVE_INFINITY) >=
        (sample.topBarBottom ?? 0) - tolerance
    ),
    `${stepLabel}: home skeleton rendered above the top bar before settling`
  ).toBe(true);
  expect(firstSkeletonTop, `${stepLabel}: missing the first home skeleton layout sample`).not.toBeNull();
  expect(finalHomeLayoutTop, `${stepLabel}: missing the final loaded home layout sample`).not.toBeNull();
  expect(
    Math.abs((firstSkeletonTop ?? 0) - (finalHomeLayoutTop ?? 0)),
    `${stepLabel}: home skeleton layout did not align with the loaded home layout`
  ).toBeLessThanOrEqual(tolerance);
};

const expectHomeActionSkeletonHandoff = (
  samples: RouteScrollMonitorSample[],
  targetPath: string | RegExp,
  stepLabel: string
): void => {
  const pressedIndex = samples.findIndex((sample) => sample.homeLessonsNavState === 'pressed');
  const transitioningIndex = samples.findIndex(
    (sample) =>
      sample.homeLessonsNavState === 'transitioning' ||
      sample.activeTransitionSourceId === HOME_LESSONS_ACTION_SOURCE_ID ||
      sample.transitionPhase === 'pending'
  );
  const skeletonIndex = samples.findIndex((sample) => sample.hasSkeleton);
  const targetRouteIndex = samples.findIndex((sample) => matchesRoutePath(sample.path, targetPath));

  expect(
    pressedIndex,
    `${stepLabel}: clicked action never entered the pressed acknowledgement state`
  ).toBeGreaterThan(-1);
  expect(
    skeletonIndex,
    `${stepLabel}: navigation never handed off through the page skeleton`
  ).toBeGreaterThan(-1);
  expect(targetRouteIndex, `${stepLabel}: route never committed to the target page`).toBeGreaterThan(-1);
  expect(
    skeletonIndex,
    `${stepLabel}: page skeleton appeared before the pressed acknowledgement state`
  ).toBeGreaterThan(pressedIndex);
  expect(
    targetRouteIndex,
    `${stepLabel}: target route committed before the page skeleton handoff appeared`
  ).toBeGreaterThanOrEqual(skeletonIndex);

  if (transitioningIndex > -1) {
    expect(
      transitioningIndex,
      `${stepLabel}: transition never advanced beyond the pressed acknowledgement state`
    ).toBeGreaterThanOrEqual(pressedIndex);
  }
};

const expectRouteSkeletonHandoff = ({
  samples,
  sourceId,
  stepLabel,
  targetPath,
}: {
  samples: RouteScrollMonitorSample[];
  sourceId: string;
  stepLabel: string;
  targetPath: string | RegExp;
}): void => {
  const acknowledgeIndex = samples.findIndex(
    (sample) =>
      sample.activeTransitionSourceId === sourceId && sample.transitionPhase === 'acknowledging'
  );
  const skeletonIndex = samples.findIndex((sample) => sample.hasSkeleton);
  const targetRouteIndex = samples.findIndex((sample) => matchesRoutePath(sample.path, targetPath));

  expect(
    acknowledgeIndex,
    `${stepLabel}: navigation never entered the acknowledgement phase for the clicked control`
  ).toBeGreaterThan(-1);
  expect(
    skeletonIndex,
    `${stepLabel}: navigation never handed off through the page skeleton`
  ).toBeGreaterThan(-1);
  expect(targetRouteIndex, `${stepLabel}: route never committed to the target page`).toBeGreaterThan(-1);
  expect(
    skeletonIndex,
    `${stepLabel}: page skeleton appeared before the acknowledgement phase`
  ).toBeGreaterThan(acknowledgeIndex);
  expect(
    targetRouteIndex,
    `${stepLabel}: target route committed before the page skeleton handoff appeared`
  ).toBeGreaterThanOrEqual(skeletonIndex);
};

const expectRouteSkeletonAcknowledgement = ({
  samples,
  sourceId,
  stepLabel,
}: {
  samples: RouteScrollMonitorSample[];
  sourceId: string;
  stepLabel: string;
}): void => {
  const acknowledgeIndex = samples.findIndex(
    (sample) =>
      sample.activeTransitionSourceId === sourceId && sample.transitionPhase === 'acknowledging'
  );
  const skeletonIndex = samples.findIndex((sample) => sample.hasSkeleton);

  expect(
    acknowledgeIndex,
    `${stepLabel}: navigation never entered the acknowledgement phase for the clicked control`
  ).toBeGreaterThan(-1);
  expect(
    skeletonIndex,
    `${stepLabel}: navigation never handed off through the page skeleton`
  ).toBeGreaterThan(-1);
  expect(
    skeletonIndex,
    `${stepLabel}: page skeleton appeared before the acknowledgement phase`
  ).toBeGreaterThan(acknowledgeIndex);
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

const getTopNavLayoutSnapshot = async (page: Page): Promise<TopNavLayoutSnapshot> =>
  page.evaluate(() => {
    const topBar = document.querySelector('[data-testid="kangur-page-top-bar"]');
    const nav = document.querySelector('nav[aria-label="Glowna nawigacja Kangur"]');
    const utility = document.querySelector('[data-testid="kangur-primary-nav-utility-actions"]');
    const lessons = document.querySelector('[data-testid="kangur-primary-nav-lessons"]');
    const parent = document.querySelector('[data-testid="kangur-primary-nav-parent-dashboard"]');
    const logout = document.querySelector('[data-testid="kangur-primary-nav-logout"]');

    const topBarRect = topBar?.getBoundingClientRect() ?? null;
    const navRect = nav?.getBoundingClientRect() ?? null;
    const utilityRect = utility?.getBoundingClientRect() ?? null;
    const lessonsRect = lessons?.getBoundingClientRect() ?? null;
    const parentRect = parent?.getBoundingClientRect() ?? null;
    const logoutRect = logout?.getBoundingClientRect() ?? null;
    const topBarStyles = topBar ? window.getComputedStyle(topBar) : null;

    return {
      viewportWidth: window.innerWidth,
      topBarTop: topBarRect?.top ?? null,
      topBarWidth: topBarRect?.width ?? null,
      topBarPosition: topBarStyles?.position ?? null,
      navTop: navRect?.top ?? null,
      navLeft: navRect?.left ?? null,
      navRight: navRect?.right ?? null,
      navWidth: navRect?.width ?? null,
      utilityLeft: utilityRect?.left ?? null,
      utilityRight: utilityRect?.right ?? null,
      lessonsRight: lessonsRect?.right ?? null,
      parentRight: parentRect?.right ?? null,
      logoutRight: logoutRect?.right ?? null,
    };
  });

  test('keeps the persistent shell mounted across main-page navigation', async ({ page }) => {
    await page.route('**/api/kangur/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildLearnerUser()),
      });
    });

    await gotoKangurPath(page, '/kangur/game');
    await expectGameRouteReady(page, 'kangur-primary-nav-lessons');
    await expect(page.getByRole('link', { name: /profil/i })).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });

    const routeShell = page.getByTestId('kangur-route-shell');

    const routeShellBackground = await routeShell.evaluate(
      (element) => getComputedStyle(element).backgroundImage
    );
    expect(routeShellBackground).toContain('radial-gradient');

    await markRouteShellAsPersistent(page);

    await startRouteShellMonitor(page);
    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(LESSONS_ROUTE_URL_PATTERN);
    await expectRouteShellMarker(page);
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'game -> lessons');

    await startRouteShellMonitor(page);
    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-home').click();
    await expect(page).toHaveURL(HOME_ROUTE_URL_PATTERN);
    await expectRouteShellMarker(page);
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'lessons -> home');

    await startRouteShellMonitor(page);
    await page.getByRole('link', { name: /profil/i }).click();
    await expect(page).toHaveURL(PROFILE_ROUTE_URL_PATTERN);
    await expectRouteShellMarker(page);
    await expectLearnerProfileRouteReady(page);
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'home -> profile');

    await startRouteShellMonitor(page);
    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-home').click();
    await expect(page).toHaveURL(HOME_ROUTE_URL_PATTERN);
    await expectRouteShellMarker(page);
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'profile -> home');

    const documentLoadCount = await page.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      DOCUMENT_LOAD_COUNT_KEY
    );
    expect(documentLoadCount).toBe('1');
  });

  test('routes back home from the learner-profile intro-card top section without remounting the shell', async ({
    page,
  }) => {
    await page.route('**/api/kangur/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildLearnerUser()),
      });
    });

    await gotoKangurPath(page, '/kangur/profile');
    await expectLearnerProfileRouteReady(page);
    await markRouteShellAsPersistent(page);

    await expectRouteShellMarker(page);

    await startRouteShellMonitor(page);
    await page
      .getByTestId('kangur-learner-profile-hero')
      .getByRole('button', { name: 'Wróć do poprzedniej strony' })
      .click();
    await expect(page).toHaveURL(HOME_ROUTE_URL_PATTERN);
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
    await expectRouteShellMarker(page);
    await page.waitForTimeout(250);

    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'profile back button -> home');
  });

  test('keeps the viewport width stable during main-page navigation transitions', async ({
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
    await expectGameRouteReady(page, 'kangur-primary-nav-lessons');
    await expect(page.getByRole('link', { name: /profil/i })).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });

    await startRouteLayoutMonitor(page);
    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(LESSONS_ROUTE_URL_PATTERN);
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteLayoutStability(await stopRouteLayoutMonitor(page), 'game -> lessons');

    await startRouteLayoutMonitor(page);
    await page.getByRole('link', { name: /profil/i }).click();
    await expect(page).toHaveURL(PROFILE_ROUTE_URL_PATTERN);
    await expectLearnerProfileRouteReady(page);
    await page.waitForTimeout(250);
    expectRouteLayoutStability(await stopRouteLayoutMonitor(page), 'lessons -> profile');

    await startRouteLayoutMonitor(page);
    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-home').click();
    await expect(page).toHaveURL(HOME_ROUTE_URL_PATTERN);
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteLayoutStability(await stopRouteLayoutMonitor(page), 'profile -> home');
  });

  test('hands the lessons nav item off through the page skeleton before reveal', async ({ page }) => {
    await gotoKangurPath(page, '/kangur/game');
    await expectGameRouteReady(page, 'kangur-primary-nav-lessons');
    await expect(page.getByTestId('kangur-app-loader')).toHaveCount(0);
    await expect(page.getByTestId('kangur-page-transition-skeleton')).toHaveCount(0);

    await startRouteScrollMonitor(page);
    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(LESSONS_ROUTE_URL_PATTERN);
    await expect(page.getByTestId('lessons-list-transition')).toBeVisible();
    await expect(page.getByTestId('lessons-list-intro-card')).toBeVisible();
    await expect(page.getByTestId('kangur-lessons-heading-art')).toBeVisible();
    await expectLocatorToHaveClassToken(page.getByTestId('lessons-list-intro-card'), 'text-center');
    await expect(
      page.getByTestId('lessons-list-intro-card').getByRole('heading', {
        name: LESSONS_HEADING_PATTERN,
      })
    ).toBeVisible();
    await page.waitForTimeout(120);
    const samples = await stopRouteScrollMonitor(page);

    expectRouteToResetScrollAfterCommit(samples, LESSONS_ROUTE_PATH_PATTERN, 'game -> lessons');
    expectRouteSkeletonHandoff({
      samples,
      sourceId: PRIMARY_NAV_LESSONS_SOURCE_ID,
      stepLabel: 'game -> lessons',
      targetPath: LESSONS_ROUTE_PATH_PATTERN,
    });
    expectNoAppLoaderFlash(samples, 'game -> lessons');
    expectLessonsSkeletonToStartBelowTopBar(samples, 'game -> lessons');
  });

  test('hands the home lessons action off through a pressed state and page skeleton before reveal', async ({
    page,
  }) => {
    await gotoKangurPath(page, '/kangur/game');
    await expectGameRouteReady(page, 'kangur-primary-nav-home');
    await expect(page.getByTestId('kangur-home-action-lessons')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(page.getByTestId('kangur-app-loader')).toHaveCount(0);
    await expect(page.getByTestId('kangur-page-transition-skeleton')).toHaveCount(0);

    await startRouteScrollMonitor(page);
    await page.locator('[data-doc-id="home_lessons_action"]').click();
    await expect(page).toHaveURL(LESSONS_ROUTE_URL_PATTERN);
    await expect(page.getByTestId('lessons-list-transition')).toBeVisible();
    await page.waitForTimeout(120);

    const samples = await stopRouteScrollMonitor(page);

    expectHomeActionSkeletonHandoff(
      samples,
      LESSONS_ROUTE_PATH_PATTERN,
      'home lessons action -> lessons'
    );
    expectNoAppLoaderFlash(samples, 'home lessons action -> lessons');
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

    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(LESSONS_ROUTE_URL_PATTERN);
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

  test('jumps back to the active lesson header when opening a lesson from the library', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 560 });
    await gotoKangurPath(page, '/kangur/game');
    await expectGameRouteReady(page, 'kangur-primary-nav-lessons');

    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(LESSONS_ROUTE_URL_PATTERN);
    await expect(page.getByTestId('lessons-list-transition')).toBeVisible();

    await page.evaluate(() => {
      window.scrollTo({ top: 420, left: 0, behavior: 'auto' });
    });

    await expect
      .poll(
        () => page.evaluate(() => window.scrollY > 140),
        {
          message: 'expected the Lessons library to be scrolled before opening a lesson',
        }
      )
      .toBe(true);
    const beforeOpenScrollY = await page.evaluate(() => window.scrollY);

    const clickedLessonLabel = await page.evaluate(() => {
      const target = Array.from(document.querySelectorAll('[data-doc-id="lessons_library_entry"]'))
        .filter((element): element is HTMLButtonElement => element instanceof HTMLButtonElement)
        .find((element) => {
          const rect = element.getBoundingClientRect();
          return rect.top >= 0 && rect.bottom <= window.innerHeight;
        });

      if (!target) {
        return null;
      }

      const lessonLabel =
        target.querySelector<HTMLElement>('.text-xl')?.textContent?.trim() ??
        target.textContent?.trim() ??
        null;

      target.click();
      return lessonLabel;
    });

    expect(clickedLessonLabel).not.toBeNull();

    await expect(page.getByTestId('lessons-active-transition')).toBeVisible();
    await expect(page.getByTestId('active-lesson-header')).toBeVisible();
    await expect
      .poll(
        () => page.evaluate((initialScrollY) => window.scrollY < initialScrollY - 120, beforeOpenScrollY),
        {
          message: 'expected opening a lesson to jump upward toward the header anchor',
        }
      )
      .toBe(true);
    await expect
      .poll(
        () =>
          page
            .getByTestId('active-lesson-header')
            .evaluate((element) => element.getBoundingClientRect().top < 180),
        {
          message: 'expected the active lesson header to land near the top of the viewport',
        }
      )
      .toBe(true);
  });

  test('keeps route navigation smooth when opening Lekcje and returning home through the StudiQ logo skeleton handoff', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 560 });
    await gotoKangurPath(page, '/kangur/game');
    await expectGameRouteReady(page, 'kangur-primary-nav-lessons');
    await expect(page.getByTestId('kangur-app-loader')).toHaveCount(0);
    await expect(page.getByTestId('kangur-page-transition-skeleton')).toHaveCount(0);

    await startRouteScrollMonitor(page);
    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(LESSONS_ROUTE_URL_PATTERN);
    await expect(page.getByTestId('lessons-list-transition')).toBeVisible();
    await page.waitForTimeout(120);

    const gameToLessonsSamples = await stopRouteScrollMonitor(page);

    expectRouteToResetScrollAfterCommit(
      gameToLessonsSamples,
      LESSONS_ROUTE_PATH_PATTERN,
      'game -> lessons'
    );
    expectRouteSkeletonHandoff({
      samples: gameToLessonsSamples,
      sourceId: PRIMARY_NAV_LESSONS_SOURCE_ID,
      stepLabel: 'game -> lessons',
      targetPath: LESSONS_ROUTE_PATH_PATTERN,
    });
    expectNoAppLoaderFlash(gameToLessonsSamples, 'game -> lessons');

    await page.evaluate(() => window.scrollTo({ top: 420, left: 0, behavior: 'auto' }));
    await expect
      .poll(() => page.evaluate(() => window.scrollY), {
        message: 'expected the Lessons page to become scrollable before returning home',
      })
      .toBeGreaterThan(140);

    await expect(page.getByTestId('kangur-page-transition-skeleton')).toHaveCount(0);
    await expect(page.getByTestId('kangur-app-loader')).toHaveCount(0);
    await startRouteScrollMonitor(page);
    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-home').click();
    await expect(page).toHaveURL(HOME_ROUTE_URL_PATTERN);
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
    await waitForAnimationFrames(page, 24);

    const lessonsToHomeSamples = await stopRouteScrollMonitor(page);

    expectRouteToResetScrollAfterCommit(
      lessonsToHomeSamples,
      HOME_ROUTE_PATH_PATTERN,
      'lessons -> home'
    );
    expectRouteSkeletonHandoff({
      samples: lessonsToHomeSamples,
      sourceId: PRIMARY_NAV_HOME_SOURCE_ID,
      stepLabel: 'lessons -> home',
      targetPath: HOME_ROUTE_PATH_PATTERN,
    });
    expectNoAppLoaderFlash(lessonsToHomeSamples, 'lessons -> home');
    expectHomeSkeletonToAlignWithLoadedHomeLayout(lessonsToHomeSamples, 'lessons -> home');
  });

  test('keeps the Lessons -> Home skeleton aligned on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoKangurPath(page, '/kangur/game');
    await expectGameRouteReady(page, 'kangur-primary-nav-mobile-toggle');
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await page.getByTestId('kangur-primary-nav-mobile-toggle').click();
    await expect(page.getByRole('dialog', { name: /menu kangur/i })).toBeVisible();
    await page.getByRole('dialog', { name: /menu kangur/i }).getByTestId('kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(LESSONS_ROUTE_URL_PATTERN);
    await expect(page.getByTestId('lessons-list-intro-card')).toBeVisible();
    await expect(
      page.getByTestId('lessons-list-intro-card').getByRole('heading', {
        name: LESSONS_HEADING_PATTERN,
      })
    ).toBeVisible();
    await expect(page.getByTestId('kangur-app-loader')).toHaveCount(0);
    await expect(page.getByTestId('kangur-page-transition-skeleton')).toHaveCount(0);

    await startRouteScrollMonitor(page);
    await page
      .getByTestId('lessons-list-intro-card')
      .getByRole('button', { name: PAGE_BACK_BUTTON_LABEL_PATTERN })
      .click();
    await expect(page).toHaveURL(HOME_HISTORY_RETURN_ROUTE_URL_PATTERN);
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
    await waitForAnimationFrames(page, 24);

    const lessonsToHomeSamples = await stopRouteScrollMonitor(page);

    expectRouteSkeletonAcknowledgement({
      samples: lessonsToHomeSamples,
      sourceId: LESSONS_LIST_BACK_SOURCE_ID,
      stepLabel: 'mobile lessons -> home',
    });
    expectNoAppLoaderFlash(lessonsToHomeSamples, 'mobile lessons -> home');
    expectHomeSkeletonToAlignWithLoadedHomeLayout(lessonsToHomeSamples, 'mobile lessons -> home');
  });

  test('keeps game entry screens and quick-practice flows on the same route with consistent back navigation', async ({
    page,
  }) => {
    await gotoKangurPath(page, '/kangur/game');
    await expectGameRouteReady(page, 'kangur-primary-nav-home');
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });

    await markRouteShellAsPersistent(page);

    await page.getByRole('button', { name: /grajmy/i }).click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(page.getByTestId('kangur-game-operation-top-section')).toBeVisible();
    await expect(page.getByTestId('kangur-grajmy-heading-art')).toBeVisible();
    await expectLocatorToHaveClassToken(
      page.getByTestId('kangur-game-operation-top-section'),
      'text-center'
    );
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
    await expectLocatorToHaveClassToken(
      page.getByTestId('kangur-game-training-top-section'),
      'text-center'
    );
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
    await expectLocatorToHaveClassToken(
      page.getByTestId('kangur-game-kangur-setup-top-section'),
      'text-center'
    );
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
    await expectGameRouteReady(page, 'kangur-primary-nav-lessons');
    await expect(page.getByRole('link', { name: /profil/i })).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(page.getByTestId('kangur-primary-nav-parent-dashboard')).toHaveCount(0);

    await page.getByRole('link', { name: /profil/i }).click();
    await expect(page).toHaveURL(/\/kangur\/profile$/);
    await expectLearnerProfileRouteReady(page);
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

    await markRouteShellAsPersistent(page);

    await startRouteShellMonitor(page);
    await page.getByTestId('kangur-primary-nav-parent-dashboard').click();
    await expect(page).toHaveURL(/\/kangur\/parent-dashboard$/);
    await expectRouteShellMarker(page);
    await expect(page.getByRole('heading', { name: /^Panel Rodzica$/ })).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'profile -> parent-dashboard');

    await startRouteShellMonitor(page);
    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-home').click();
    await expect(page).toHaveURL(HOME_ROUTE_URL_PATTERN);
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

  test('keeps the parent dashboard and logout actions inside a full-width sticky navbar', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.route('**/api/kangur/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildManagerUser()),
      });
    });

    await gotoKangurPath(page, '/kangur/parent-dashboard');
    await expectParentDashboardRouteReady(page);
    await expect(page.getByTestId('kangur-primary-nav-parent-dashboard')).toBeVisible();
    await expect(page.getByTestId('kangur-primary-nav-logout')).toBeVisible();

    const beforeScroll = await getTopNavLayoutSnapshot(page);

    expect(beforeScroll.topBarPosition).toBe('sticky');
    expect(beforeScroll.topBarWidth).not.toBeNull();
    expect(beforeScroll.navWidth).not.toBeNull();
    expect(beforeScroll.utilityLeft).not.toBeNull();
    expect(beforeScroll.utilityRight).not.toBeNull();
    expect(beforeScroll.lessonsRight).not.toBeNull();
    expect(beforeScroll.navRight).not.toBeNull();
    expect(beforeScroll.parentRight).not.toBeNull();
    expect(beforeScroll.logoutRight).not.toBeNull();
    expect(beforeScroll.topBarWidth as number).toBeGreaterThanOrEqual(beforeScroll.viewportWidth - 4);
    expect(beforeScroll.navWidth as number).toBeGreaterThanOrEqual(beforeScroll.viewportWidth - 80);
    expect(beforeScroll.utilityLeft as number).toBeGreaterThan(beforeScroll.lessonsRight as number);
    expect((beforeScroll.navRight as number) - (beforeScroll.utilityRight as number)).toBeLessThanOrEqual(
      28
    );
    expect((beforeScroll.parentRight as number) <= (beforeScroll.navRight as number)).toBe(true);
    expect((beforeScroll.logoutRight as number) <= (beforeScroll.navRight as number)).toBe(true);

    expect(beforeScroll.topBarTop).not.toBeNull();
    expect(beforeScroll.navTop).not.toBeNull();
    expect((beforeScroll.topBarTop as number) <= 16).toBe(true);
    expect((beforeScroll.navTop as number) <= 36).toBe(true);
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
    await scoresTab.click();

    await expect(scoresTab).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Brak zapisanych wyników.')).toBeVisible();

    const afterScoresScrollY = await page.evaluate(() => window.scrollY);
    expect(Math.abs(afterScoresScrollY - beforeScrollY)).toBeLessThan(48);

    const progressTab = page.getByRole('button', { name: /postęp/i });
    const beforeProgressScrollY = await page.evaluate(() => window.scrollY);
    await progressTab.click();

    await expect(progressTab).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/Poziom i doświadczenie/i)).toBeVisible();

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
    await page.getByTestId('kangur-primary-nav-login').click();
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
    await expect(page.getByLabel(/Email rodzica (albo|lub) nick ucznia/i)).toBeVisible();

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

    await page.route('**/api/auth/csrf**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ csrfToken: 'kangur-parent-csrf' }),
      });
    });

    await page.route('**/api/auth/verify-credentials**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          challengeId: 'kangur-parent-challenge',
          mfaRequired: false,
        }),
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

    await page.route('**/api/auth/signout**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: '/login' }),
      });
    });

    await gotoKangurPath(page, '/kangur/login?callbackUrl=%2Fkangur%3Flogin%3Dparent');
    await expectKangurLoginReady(page);

    const identifierField = page
      .getByTestId('kangur-login-form')
      .getByLabel(/Email rodzica (albo|lub) nick ucznia/i);
    const parentPasswordField = page.getByTestId('kangur-login-form').getByLabel('Hasło');

    await identifierField.fill('parent@example.com');
    await parentPasswordField.fill('secret123');
    await expect(identifierField).toHaveValue('parent@example.com');
    await expect(parentPasswordField).toHaveValue('secret123');
    await expect(page.getByTestId('kangur-login-form')).toHaveAttribute('data-login-kind', 'parent');
    await page.getByRole('button', { name: 'Zaloguj rodzica' }).click();

    await expect(page).toHaveURL(/\/kangur\?login=parent$/);
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
    expect(callbackPayload?.get('email')).toBe('parent@example.com');
    expect(callbackPayload?.get('challengeId')).toBe('kangur-parent-challenge');
    expect(callbackPayload?.get('callbackUrl')).toBe('/kangur?login=parent');
  });

  test('shows the legacy parent magic-link entry as a password-based fallback prompt', async ({
    page,
  }) => {
    await gotoKangurPath(
      page,
      '/kangur/login?callbackUrl=%2Fkangur%3Flogin%3Dmagic-parent&magicLinkToken=magic-link-1'
    );

    await expect(page.getByTestId('kangur-login-modal')).toBeVisible();
    await expect(
      page.getByText(
        'Logowanie linkiem z e-maila nie jest już dostępne. Zaloguj się e-mailem i hasłem albo utwórz konto.'
      )
    ).toBeVisible();
    await expect(
      page.getByTestId('kangur-login-form').getByLabel(/Email rodzica (albo|lub) nick ucznia/i)
    ).toBeVisible();
    await expect(page.getByTestId('kangur-login-form').getByLabel('Hasło')).toBeVisible();
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fkangur%3Flogin%3Dmagic-parent$/);
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
      .getByLabel(/Email rodzica (albo|lub) nick ucznia/i);
    const studentPasswordField = page.getByTestId('kangur-login-form').getByLabel('Hasło');

    await studentNicknameField.fill('janek123');
    await studentPasswordField.fill('secret123');
    await expect(studentNicknameField).toHaveValue('janek123');
    await expect(studentPasswordField).toHaveValue('secret123');
    await expect(page.getByTestId('kangur-login-form')).toHaveAttribute(
      'data-login-kind',
      'student'
    );
    await page.getByRole('button', { name: 'Zaloguj ucznia' }).click();

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
