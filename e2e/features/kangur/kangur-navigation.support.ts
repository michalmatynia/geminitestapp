import { expect, test as baseTest, type Page } from '@playwright/test';

import {
  DOCUMENT_LOAD_COUNT_KEY,
  HOME_LESSONS_ACTION_SOURCE_ID,
  ROUTE_BOOT_TIMEOUT_MS,
  ROUTE_SCROLL_MONITOR_KEY,
  ROUTE_SHELL_MARKER_KEY,
  type GameHomeLayoutSnapshot,
  type LessonsTransitionSnapshot,
  type RouteScrollMonitorSample,
  type TopNavLayoutSnapshot,
  matchesRoutePath,
} from './kangur-navigation.shared';

export const getGameHomeLayoutSnapshot = async (
  page: Page
): Promise<GameHomeLayoutSnapshot> =>
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

export const captureLessonsTransitionSnapshot = async (
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

export const expectAnimatedTransitionSnapshot = (
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

export const startRouteScrollMonitor = async (page: Page): Promise<void> => {
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
      const skeletonLessonsLibraryLayout = document.querySelector(
        '[data-testid="kangur-page-transition-skeleton-lessons-library-layout"]'
      );
      const skeletonHomeLayout = document.querySelector(
        '[data-testid="kangur-page-transition-skeleton-game-home-layout"]'
      );
      const skeletonHomeActions = document.querySelector(
        '[data-testid="kangur-page-transition-skeleton-game-home-actions-shell"]'
      );
      const homeLayout = document.querySelector('[data-testid="kangur-game-home-layout"]');
      const homeActions = document.querySelector('[data-testid="kangur-home-actions-shell"]');
      const topBar = document.querySelector('[data-testid="kangur-page-top-bar"]');
      const skeletonRect = skeleton?.getBoundingClientRect() ?? null;
      const skeletonLessonsLibraryRect =
        skeletonLessonsLibraryLayout?.getBoundingClientRect() ?? null;
      const skeletonHomeLayoutRect = skeletonHomeLayout?.getBoundingClientRect() ?? null;
      const skeletonHomeActionsRect = skeletonHomeActions?.getBoundingClientRect() ?? null;
      const homeLayoutRect = homeLayout?.getBoundingClientRect() ?? null;
      const homeActionsRect = homeActions?.getBoundingClientRect() ?? null;
      const topBarRect = topBar?.getBoundingClientRect() ?? null;
      samples.push({
        path: `${window.location.pathname}${window.location.search}`,
        scrollY: window.scrollY,
        hasSkeleton: Boolean(skeletonRect),
        skeletonTop: skeletonRect?.top ?? null,
        skeletonLessonsLibraryTop: skeletonLessonsLibraryRect?.top ?? null,
        skeletonHomeLayoutTop: skeletonHomeLayoutRect?.top ?? null,
        skeletonHomeActionsTop: skeletonHomeActionsRect?.top ?? null,
        topBarBottom: topBarRect?.bottom ?? null,
        hasAppLoader: Boolean(document.querySelector('[data-testid="kangur-app-loader"]')),
        transitionPhase: routeContent?.getAttribute('data-route-transition-phase') ?? null,
        activeTransitionSourceId:
          routeContent?.getAttribute('data-route-transition-source-id') ?? null,
        homeLessonsNavState: homeLessonsAction?.getAttribute('data-nav-state') ?? null,
        homeLayoutTop: homeLayoutRect?.top ?? null,
        homeActionsTop: homeActionsRect?.top ?? null,
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

export const stopRouteScrollMonitor = async (
  page: Page
): Promise<RouteScrollMonitorSample[]> =>
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

export const expectRouteToResetScrollAfterCommit = (
  samples: RouteScrollMonitorSample[],
  targetPath: string | RegExp,
  stepLabel: string
): void => {
  const matchingSamples = samples.filter((sample) => matchesRoutePath(sample.path, targetPath));

  expect(
    matchingSamples.length,
    `${stepLabel}: expected monitor samples on the target route`
  ).toBeGreaterThan(0);
  expect(
    matchingSamples.some((sample) => sample.scrollY <= 2),
    `${stepLabel}: target route never settled back at the top of the page`
  ).toBe(true);
};

export const expectNoAppLoaderFlash = (
  samples: RouteScrollMonitorSample[],
  stepLabel: string
): void => {
  expect(
    samples.some((sample) => sample.hasAppLoader),
    `${stepLabel}: navigation showed the global app loader instead of staying in-shell`
  ).toBe(false);
};

export const expectLessonsSkeletonToStartBelowTopBar = (
  samples: RouteScrollMonitorSample[],
  stepLabel: string,
  tolerance = 2
): void => {
  const skeletonSamples = samples.filter(
    (sample) =>
      sample.hasSkeleton &&
      (sample.skeletonLessonsLibraryTop !== null || sample.skeletonTop !== null) &&
      sample.topBarBottom !== null
  );

  expect(
    skeletonSamples.length,
    `${stepLabel}: expected geometry samples while the lessons skeleton was visible`
  ).toBeGreaterThan(0);
  expect(
    skeletonSamples.every(
      (sample) =>
        (sample.skeletonLessonsLibraryTop ?? sample.skeletonTop ?? Number.NEGATIVE_INFINITY) >=
        (sample.topBarBottom ?? 0) - tolerance
    ),
    `${stepLabel}: lessons skeleton rendered above the top bar before settling`
  ).toBe(true);
};

export const expectHomeSkeletonToAlignWithLoadedHomeLayout = (
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
  const minSkeletonTop = skeletonSamples.reduce(
    (minimum, sample) =>
      Math.min(minimum, sample.skeletonHomeLayoutTop ?? Number.POSITIVE_INFINITY),
    Number.POSITIVE_INFINITY
  );
  const maxSkeletonTop = skeletonSamples.reduce(
    (maximum, sample) =>
      Math.max(maximum, sample.skeletonHomeLayoutTop ?? Number.NEGATIVE_INFINITY),
    Number.NEGATIVE_INFINITY
  );
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
    (maxSkeletonTop === Number.NEGATIVE_INFINITY ? 0 : maxSkeletonTop) -
      (minSkeletonTop === Number.POSITIVE_INFINITY ? 0 : minSkeletonTop),
    `${stepLabel}: home skeleton layout jumped while it was visible`
  ).toBeLessThanOrEqual(tolerance);
  expect(
    Math.abs((firstSkeletonTop ?? 0) - (finalHomeLayoutTop ?? 0)),
    `${stepLabel}: home skeleton layout did not align with the loaded home layout`
  ).toBeLessThanOrEqual(tolerance);
};

export const expectHomeSkeletonToHandoffWithoutPanelJump = (
  samples: RouteScrollMonitorSample[],
  stepLabel: string,
  tolerance = 4
): void => {
  const lastSkeletonActionsTop =
    [...samples]
      .reverse()
      .find((sample) => sample.hasSkeleton && sample.skeletonHomeActionsTop !== null)
      ?.skeletonHomeActionsTop ?? null;
  const firstVisibleHomeActionsTop =
    samples.find((sample) => !sample.hasSkeleton && sample.homeActionsTop !== null)?.homeActionsTop ??
    null;
  const finalHomeActionsTop =
    [...samples].reverse().find((sample) => sample.homeActionsTop !== null)?.homeActionsTop ?? null;

  expect(lastSkeletonActionsTop, `${stepLabel}: missing the last home skeleton action sample`).not.toBeNull();
  expect(
    firstVisibleHomeActionsTop,
    `${stepLabel}: missing the first revealed home action sample`
  ).not.toBeNull();
  expect(finalHomeActionsTop, `${stepLabel}: missing the final home action sample`).not.toBeNull();
  expect(
    Math.abs((lastSkeletonActionsTop ?? 0) - (firstVisibleHomeActionsTop ?? 0)),
    `${stepLabel}: home actions jumped when the skeleton handed off to live content`
  ).toBeLessThanOrEqual(tolerance);
  expect(
    Math.abs((firstVisibleHomeActionsTop ?? 0) - (finalHomeActionsTop ?? 0)),
    `${stepLabel}: home actions continued shifting after the skeleton disappeared`
  ).toBeLessThanOrEqual(tolerance);
};

export const expectHomeActionSkeletonHandoff = (
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
  const acknowledgementIndex = pressedIndex > -1 ? pressedIndex : transitioningIndex;

  expect(
    acknowledgementIndex,
    `${stepLabel}: clicked action never entered a tracked acknowledgement or transition state`
  ).toBeGreaterThan(-1);
  expect(
    skeletonIndex,
    `${stepLabel}: navigation never handed off through the page skeleton`
  ).toBeGreaterThan(-1);
  expect(targetRouteIndex, `${stepLabel}: route never committed to the target page`).toBeGreaterThan(-1);
  expect(
    skeletonIndex,
    pressedIndex > -1
      ? `${stepLabel}: page skeleton appeared before the pressed acknowledgement state`
      : `${stepLabel}: page skeleton appeared before the tracked transition state`
  )[pressedIndex > -1 ? 'toBeGreaterThan' : 'toBeGreaterThanOrEqual'](acknowledgementIndex);
  expect(
    targetRouteIndex,
    `${stepLabel}: target route committed before the page skeleton handoff appeared`
  ).toBeGreaterThanOrEqual(skeletonIndex);

  if (transitioningIndex > -1) {
    expect(
      transitioningIndex,
      `${stepLabel}: transition never advanced beyond the pressed acknowledgement state`
    ).toBeGreaterThanOrEqual(acknowledgementIndex);
  }
};

export const expectRouteSkeletonHandoff = ({
  samples,
  sourceId,
  stepLabel,
  targetPath,
  requireAcknowledgement = true,
}: {
  samples: RouteScrollMonitorSample[];
  sourceId: string;
  stepLabel: string;
  targetPath: string | RegExp;
  requireAcknowledgement?: boolean;
}): void => {
  const acknowledgeIndex = samples.findIndex(
    (sample) =>
      sample.activeTransitionSourceId === sourceId && sample.transitionPhase === 'acknowledging'
  );
  const transitionStartIndex = samples.findIndex(
    (sample) =>
      sample.activeTransitionSourceId === sourceId &&
      sample.transitionPhase !== null &&
      sample.transitionPhase !== 'idle'
  );
  const skeletonIndex = samples.findIndex((sample) => sample.hasSkeleton);
  const targetRouteIndex = samples.findIndex((sample) => matchesRoutePath(sample.path, targetPath));

  if (requireAcknowledgement) {
    expect(
      acknowledgeIndex,
      `${stepLabel}: navigation never entered the acknowledgement phase for the clicked control`
    ).toBeGreaterThan(-1);
  } else {
    expect(
      transitionStartIndex,
      `${stepLabel}: navigation never entered a tracked transition phase for the clicked control`
    ).toBeGreaterThan(-1);
  }
  expect(
    skeletonIndex,
    `${stepLabel}: navigation never handed off through the page skeleton`
  ).toBeGreaterThan(-1);
  expect(targetRouteIndex, `${stepLabel}: route never committed to the target page`).toBeGreaterThan(-1);
  expect(
    skeletonIndex,
    requireAcknowledgement
      ? `${stepLabel}: page skeleton appeared before the acknowledgement phase`
      : `${stepLabel}: page skeleton appeared before the tracked transition phase`
  ).toBeGreaterThanOrEqual(requireAcknowledgement ? acknowledgeIndex : transitionStartIndex);
  expect(
    targetRouteIndex,
    `${stepLabel}: target route committed before the page skeleton handoff appeared`
  ).toBeGreaterThanOrEqual(skeletonIndex);
};

export const expectRouteSkeletonAcknowledgement = ({
  samples,
  sourceId,
  stepLabel,
  requireAcknowledgement = true,
}: {
  samples: RouteScrollMonitorSample[];
  sourceId: string;
  stepLabel: string;
  requireAcknowledgement?: boolean;
}): void => {
  const acknowledgeIndex = samples.findIndex(
    (sample) =>
      sample.activeTransitionSourceId === sourceId && sample.transitionPhase === 'acknowledging'
  );
  const transitionStartIndex = samples.findIndex(
    (sample) =>
      sample.activeTransitionSourceId === sourceId &&
      sample.transitionPhase !== null &&
      sample.transitionPhase !== 'idle'
  );
  const skeletonIndex = samples.findIndex((sample) => sample.hasSkeleton);

  if (requireAcknowledgement) {
    expect(
      acknowledgeIndex,
      `${stepLabel}: navigation never entered the acknowledgement phase for the clicked control`
    ).toBeGreaterThan(-1);
  } else {
    expect(
      transitionStartIndex,
      `${stepLabel}: navigation never entered a tracked transition phase for the clicked control`
    ).toBeGreaterThan(-1);
  }
  expect(
    skeletonIndex,
    `${stepLabel}: navigation never handed off through the page skeleton`
  ).toBeGreaterThan(-1);
  expect(
    skeletonIndex,
    requireAcknowledgement
      ? `${stepLabel}: page skeleton appeared before the acknowledgement phase`
      : `${stepLabel}: page skeleton appeared before the tracked transition phase`
  )[requireAcknowledgement ? 'toBeGreaterThan' : 'toBeGreaterThanOrEqual'](
    requireAcknowledgement ? acknowledgeIndex : transitionStartIndex
  );
};

export const waitForAnimationFrames = async (page: Page, frameCount: number): Promise<void> => {
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

export const markRouteShellAsPersistent = async (page: Page): Promise<void> => {
  await page.getByTestId('kangur-route-shell').evaluate((element, markerKey) => {
    (
      element as HTMLElement & {
        [key: string]: string | undefined;
      }
    )[markerKey] = 'persist';
  }, ROUTE_SHELL_MARKER_KEY);
};

export const expectRouteShellMarker = async (page: Page): Promise<void> => {
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
        timeout: ROUTE_BOOT_TIMEOUT_MS,
      }
    )
    .toBe('persist');
};

export const buildManagerUser = () => {
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

export const buildLearnerUser = () => {
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

export const buildManagerUserWithLearnerMood = (
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

export const registerKangurNavigationBeforeEach = (test: typeof baseTest): void => {
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

    await page.route('**/api/auth/csrf**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ csrfToken: 'kangur-e2e-csrf' }),
      });
    });

    await page.route('**/api/auth/signout**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: '/login' }),
      });
    });

    await page.route('**/api/auth/providers**', async (route) => {
      const origin = new URL(route.request().url()).origin;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          credentials: {
            id: 'credentials',
            name: 'Credentials',
            type: 'credentials',
            signinUrl: `${origin}/api/auth/signin/credentials`,
            callbackUrl: `${origin}/api/auth/callback/credentials`,
          },
        }),
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

    await page.route('**/api/settings/lite**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/settings?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/user/preferences**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.route('**/api/agentcreator/personas/*/visuals**', async (route) => {
      const requestUrl = new URL(route.request().url());
      const pathSegments = requestUrl.pathname.split('/');
      const personaIndex = pathSegments.findIndex((segment) => segment === 'personas');
      const personaId =
        personaIndex >= 0 && personaIndex + 1 < pathSegments.length
          ? decodeURIComponent(pathSegments[personaIndex + 1] ?? 'kangur-tutor')
          : 'kangur-tutor';

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: personaId,
          name: 'Tutor',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
      });
    });

    await page.route('**/api/kangur/ai-tutor/content**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.route('**/api/client-errors', async (route) => {
      await route.fulfill({
        status: 204,
        body: '',
      });
    });

    await page.route('**/api/analytics/events', async (route) => {
      await route.fulfill({
        status: 204,
        body: '',
      });
    });

    await page.route('**/api/kangur/auth/me**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        }),
      });
    });

    await page.route('**/api/kangur/progress**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        }),
      });
    });

    await page.route('**/api/kangur/subject-focus**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        }),
      });
    });

    await page.route('**/api/kangur/learner-activity/stream**', async (route) => {
      await route.fulfill({
        status: 204,
        body: '',
      });
    });

    await page.route('**/api/kangur/learner-activity**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        }),
      });
    });
  });
};

export const getTopNavLayoutSnapshot = async (page: Page): Promise<TopNavLayoutSnapshot> =>
  page.evaluate(() => {
    const topBar = document.querySelector('[data-testid="kangur-page-top-bar"]');
    const nav =
      topBar?.querySelector('nav') ??
      document.querySelector('nav[aria-label="Główna nawigacja Kangur"]');
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
