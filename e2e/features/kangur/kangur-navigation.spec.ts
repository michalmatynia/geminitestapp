import { expect, test } from '@playwright/test';

import {
  DOCUMENT_LOAD_COUNT_KEY,
  HOME_HISTORY_RETURN_ROUTE_URL_PATTERN,
  HOME_ROUTE_PATH_PATTERN,
  HOME_ROUTE_URL_PATTERN,
  LESSONS_HEADING_PATTERN,
  LESSONS_ROUTE_PATH_PATTERN,
  LESSONS_ROUTE_URL_PATTERN,
  PAGE_BACK_BUTTON_LABEL_PATTERN,
  PRIMARY_NAV_HOME_SOURCE_ID,
  PRIMARY_NAV_LESSONS_SOURCE_ID,
  PROFILE_ROUTE_URL_PATTERN,
  ROUTE_BOOT_TIMEOUT_MS,
  TOPICS_BACK_BUTTON_LABEL_PATTERN,
  ensureVisibleLessonEntry,
  expectGameRouteReady,
  expectLearnerProfileRouteReady,
  expectLessonsLibraryReady,
  expectLocatorToHaveClassToken,
  expectRouteLayoutStability,
  expectRouteShellContinuity,
  getVisibleTopBarNavAction,
  getVisibleTopBarProfileAction,
  startRouteLayoutMonitor,
  startRouteShellMonitor,
  stopRouteLayoutMonitor,
  stopRouteShellMonitor,
} from './kangur-navigation.shared';
import {
  buildLearnerUser,
  captureLessonsTransitionSnapshot,
  expectAnimatedTransitionSnapshot,
  expectHomeActionSkeletonHandoff,
  expectHomeSkeletonToAlignWithLoadedHomeLayout,
  expectHomeSkeletonToHandoffWithoutPanelJump,
  expectNoAppLoaderFlash,
  expectRouteShellMarker,
  expectRouteSkeletonAcknowledgement,
  expectRouteSkeletonHandoff,
  expectRouteToResetScrollAfterCommit,
  getGameHomeLayoutSnapshot,
  markRouteShellAsPersistent,
  registerKangurNavigationBeforeEach,
  startRouteScrollMonitor,
  stopRouteScrollMonitor,
  waitForAnimationFrames,
} from './kangur-navigation.support';

test.describe('Kangur navigation continuity', () => {
  test.describe.configure({ timeout: 120_000 });
  registerKangurNavigationBeforeEach(test);

  test('keeps the persistent shell mounted across main-page navigation', async ({ page }) => {
    await page.route('**/api/kangur/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildLearnerUser()),
      });
    });

    await page.goto('/kangur/game', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
    await expectGameRouteReady(page, 'kangur-primary-nav-lessons');
    await expect(getVisibleTopBarProfileAction(page)).toBeVisible({
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
    await expect(page).toHaveURL(LESSONS_ROUTE_URL_PATTERN, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expectRouteShellMarker(page);
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'game -> lessons');

    await startRouteShellMonitor(page);
    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-home').click();
    await expect(page).toHaveURL(HOME_ROUTE_URL_PATTERN, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expectRouteShellMarker(page);
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'lessons -> home');

    await startRouteShellMonitor(page);
    await getVisibleTopBarProfileAction(page).click();
    await expect(page).toHaveURL(PROFILE_ROUTE_URL_PATTERN, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expectRouteShellMarker(page);
    await expectLearnerProfileRouteReady(page);
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'home -> profile');

    await startRouteShellMonitor(page);
    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-home').click();
    await expect(page).toHaveURL(HOME_ROUTE_URL_PATTERN, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expectRouteShellMarker(page);
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'profile -> home');

    const documentLoadCount = await page.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      DOCUMENT_LOAD_COUNT_KEY
    );
    expect(Number(documentLoadCount)).toBeGreaterThanOrEqual(1);
    expect(Number(documentLoadCount)).toBeLessThanOrEqual(2);
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

    await page.goto('/kangur/game', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
    await expectGameRouteReady(page, 'kangur-primary-nav-lessons');
    await expect(getVisibleTopBarProfileAction(page)).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });

    await startRouteLayoutMonitor(page);
    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(LESSONS_ROUTE_URL_PATTERN, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteLayoutStability(await stopRouteLayoutMonitor(page), 'game -> lessons');

    await startRouteLayoutMonitor(page);
    await getVisibleTopBarProfileAction(page).click();
    await expect(page).toHaveURL(PROFILE_ROUTE_URL_PATTERN, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expectLearnerProfileRouteReady(page);
    await page.waitForTimeout(250);
    expectRouteLayoutStability(await stopRouteLayoutMonitor(page), 'lessons -> profile');

    await startRouteLayoutMonitor(page);
    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-home').click();
    await expect(page).toHaveURL(HOME_ROUTE_URL_PATTERN, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteLayoutStability(await stopRouteLayoutMonitor(page), 'profile -> home');
  });

  test('hands the lessons nav item off through the page skeleton before reveal', async ({ page }) => {
    await page.goto('/kangur/game', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
    await expectGameRouteReady(page, 'kangur-primary-nav-lessons');
    await expect(page.getByTestId('kangur-app-loader')).toHaveCount(0);
    await expect(page.getByTestId('kangur-page-transition-skeleton')).toHaveCount(0);

    await startRouteScrollMonitor(page);
    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(LESSONS_ROUTE_URL_PATTERN, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
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
      requireAcknowledgement: false,
    });
    expectNoAppLoaderFlash(samples, 'game -> lessons');
    expectLessonsSkeletonToStartBelowTopBar(samples, 'game -> lessons');
  });

  test('hands the home lessons action off through a pressed state and page skeleton before reveal', async ({
    page,
  }) => {
    await page.goto('/kangur/game', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
    await expectGameRouteReady(page, 'kangur-primary-nav-home');
    await expect(page.getByTestId('kangur-home-action-lessons')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(page.getByTestId('kangur-app-loader')).toHaveCount(0);
    await expect(page.getByTestId('kangur-page-transition-skeleton')).toHaveCount(0);

    await startRouteScrollMonitor(page);
    await page.locator('[data-doc-id="home_lessons_action"]').click();
    await expect(page).toHaveURL(LESSONS_ROUTE_URL_PATTERN, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
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

  test('reveals the lessons surface through the shell handoff and animates opening a lesson', async ({
    page,
  }) => {
    await page.goto('/kangur/game', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
    await expectGameRouteReady(page, 'kangur-primary-nav-lessons');

    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(LESSONS_ROUTE_URL_PATTERN, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(page.getByTestId('kangur-page-transition-skeleton')).toBeVisible();
    await expect(
      page.getByTestId('kangur-page-transition-skeleton-lessons-library-layout')
    ).toBeVisible();
    await expectLessonsLibraryReady(page);

    const activeLessonSnapshotPromise = captureLessonsTransitionSnapshot(
      page,
      '[data-testid="lessons-active-transition"]'
    );

    await (await ensureVisibleLessonEntry(page)).click();
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
    await page.goto('/kangur/game', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
    await expectGameRouteReady(page, 'kangur-primary-nav-lessons');

    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(LESSONS_ROUTE_URL_PATTERN, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expectLessonsLibraryReady(page);
    await ensureVisibleLessonEntry(page);

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
        .filter((element): element is HTMLElement => element instanceof HTMLElement)
        .find((element) => {
          const rect = element.getBoundingClientRect();
          return rect.top >= 0 && rect.bottom <= window.innerHeight;
        });

      if (!target) {
        return null;
      }

      const lessonLabel =
        target.querySelector<HTMLElement>('h2, .text-xl')?.textContent?.trim() ??
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
        () =>
          page.evaluate(
            (initialScrollY) => window.scrollY < initialScrollY - 120,
            beforeOpenScrollY
          ),
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
    await page.goto('/kangur/game', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
    await expectGameRouteReady(page, 'kangur-primary-nav-lessons');
    await expect(page.getByTestId('kangur-app-loader')).toHaveCount(0);
    await expect(page.getByTestId('kangur-page-transition-skeleton')).toHaveCount(0);

    await startRouteScrollMonitor(page);
    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(LESSONS_ROUTE_URL_PATTERN, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(page.getByTestId('lessons-list-transition')).toBeVisible();
    await expectLessonsLibraryReady(page);

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
      requireAcknowledgement: false,
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
    await expect(page).toHaveURL(HOME_ROUTE_URL_PATTERN, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
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
    expectHomeSkeletonToHandoffWithoutPanelJump(lessonsToHomeSamples, 'lessons -> home');
  });

  test('keeps the focused lesson -> Home skeleton aligned when leaving an active lesson through the top nav', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 560 });
    await page.goto('/kangur/game', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
    await expectGameRouteReady(page, 'kangur-primary-nav-lessons');

    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(LESSONS_ROUTE_URL_PATTERN, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(page.getByTestId('lessons-list-transition')).toBeVisible();
    await expectLessonsLibraryReady(page);

    await (await ensureVisibleLessonEntry(page)).click();
    await expect(page.getByTestId('lessons-active-transition')).toBeVisible();
    await expect(page.getByTestId('active-lesson-header')).toBeVisible();
    await expect(page.getByTestId('kangur-page-transition-skeleton')).toHaveCount(0);
    await expect(page.getByTestId('kangur-app-loader')).toHaveCount(0);

    await startRouteScrollMonitor(page);
    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-home').click();
    await expect(page).toHaveURL(HOME_ROUTE_URL_PATTERN, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
    await waitForAnimationFrames(page, 24);

    const focusedLessonToHomeSamples = await stopRouteScrollMonitor(page);

    expectRouteToResetScrollAfterCommit(
      focusedLessonToHomeSamples,
      HOME_ROUTE_PATH_PATTERN,
      'focused lesson -> home'
    );
    expectRouteSkeletonHandoff({
      samples: focusedLessonToHomeSamples,
      sourceId: PRIMARY_NAV_HOME_SOURCE_ID,
      stepLabel: 'focused lesson -> home',
      targetPath: HOME_ROUTE_PATH_PATTERN,
    });
    expectNoAppLoaderFlash(focusedLessonToHomeSamples, 'focused lesson -> home');
    expectHomeSkeletonToAlignWithLoadedHomeLayout(
      focusedLessonToHomeSamples,
      'focused lesson -> home'
    );
    expectHomeSkeletonToHandoffWithoutPanelJump(
      focusedLessonToHomeSamples,
      'focused lesson -> home'
    );
  });

  test('keeps the Lessons -> Home skeleton aligned on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/kangur/game', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
    await expectGameRouteReady(page, 'kangur-primary-nav-mobile-toggle');
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await page.getByTestId('kangur-primary-nav-mobile-toggle').click();
    const mobileMenuDialog = page.getByRole('dialog', {
      name: /kangur menu|menu kangur/i,
    });
    await expect(mobileMenuDialog).toBeVisible();
    await mobileMenuDialog.getByTestId('kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(LESSONS_ROUTE_URL_PATTERN, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(page.getByTestId('lessons-list-intro-card')).toBeVisible();
    await expect(
      page.getByTestId('lessons-list-intro-card').getByRole('heading', {
        name: LESSONS_HEADING_PATTERN,
      })
    ).toBeVisible();
    await expect(page.getByTestId('kangur-app-loader')).toHaveCount(0);
    await expect(page.getByTestId('kangur-page-transition-skeleton')).toHaveCount(0);

    await page.getByTestId('kangur-primary-nav-mobile-toggle').click();
    const lessonsMobileMenuDialog = page.getByRole('dialog', {
      name: /kangur menu|menu kangur/i,
    });
    await expect(lessonsMobileMenuDialog).toBeVisible();

    await startRouteScrollMonitor(page);
    await lessonsMobileMenuDialog.getByTestId('kangur-primary-nav-home').click();
    await expect(page).toHaveURL(HOME_HISTORY_RETURN_ROUTE_URL_PATTERN, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
    await waitForAnimationFrames(page, 24);

    const lessonsToHomeSamples = await stopRouteScrollMonitor(page);

    expectRouteSkeletonAcknowledgement({
      samples: lessonsToHomeSamples,
      sourceId: PRIMARY_NAV_HOME_SOURCE_ID,
      stepLabel: 'mobile lessons -> home',
      requireAcknowledgement: false,
    });
    expectNoAppLoaderFlash(lessonsToHomeSamples, 'mobile lessons -> home');
    expectHomeSkeletonToAlignWithLoadedHomeLayout(lessonsToHomeSamples, 'mobile lessons -> home');
    expectHomeSkeletonToHandoffWithoutPanelJump(
      lessonsToHomeSamples,
      'mobile lessons -> home'
    );
  });

  test('keeps game entry screens and quick-practice flows on the same route with consistent back navigation', async ({
    page,
  }) => {
    await page.goto('/kangur/game', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
    await expectGameRouteReady(page, 'kangur-primary-nav-home');
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });

    await markRouteShellAsPersistent(page);

    await page.getByRole('button', { name: /grajmy|let'?s play/i }).click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(page.getByTestId('kangur-game-operation-top-section')).toBeVisible();
    await expect(page.getByTestId('kangur-grajmy-heading-art')).toBeVisible();
    await expectLocatorToHaveClassToken(
      page.getByTestId('kangur-game-operation-top-section'),
      'text-center'
    );
    await expect(
      page
        .getByTestId('kangur-game-operation-top-section')
        .getByRole('heading', { name: /grajmy!?|let'?s play!?/i })
    ).toBeVisible();
    await expectRouteShellMarker(page);

    await page
      .getByTestId('kangur-game-operation-top-section')
      .getByRole('button', { name: PAGE_BACK_BUTTON_LABEL_PATTERN })
      .click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
    await expectRouteShellMarker(page);

    await page.getByRole('button', { name: /kangur matematyczny|math kangaroo/i }).click();
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
        .getByRole('heading', { name: /mathematical kangaroo|math kangaroo|kangur/i })
    ).toBeVisible();
    await expectRouteShellMarker(page);

    await page
      .getByTestId('kangur-game-kangur-setup-top-section')
      .getByRole('button', { name: PAGE_BACK_BUTTON_LABEL_PATTERN })
      .click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
    await expectRouteShellMarker(page);

    await page.getByRole('button', { name: /grajmy|let'?s play/i }).click();
    await expect(page.getByTestId('kangur-game-operation-top-section')).toBeVisible();

    const calendarQuickPracticeCard = page.getByTestId('kangur-quick-practice-card-calendar_quiz');
    await calendarQuickPracticeCard.scrollIntoViewIfNeeded();
    await calendarQuickPracticeCard.click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(page.getByTestId('kangur-calendar-training-top-section')).toBeVisible();
    await expect(page.getByRole('button', { name: TOPICS_BACK_BUTTON_LABEL_PATTERN })).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(48);
    await expect(page.getByTestId('kangur-primary-nav-home')).toBeVisible();
    await expectRouteShellMarker(page);

    await page.getByRole('button', { name: TOPICS_BACK_BUTTON_LABEL_PATTERN }).click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(page.getByTestId('kangur-game-operation-top-section')).toBeVisible();
    await expectRouteShellMarker(page);

    const geometryQuickPracticeCard = page.getByTestId('kangur-quick-practice-card-geometry_quiz');
    await geometryQuickPracticeCard.scrollIntoViewIfNeeded();
    await geometryQuickPracticeCard.click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(page.getByTestId('kangur-geometry-training-top-section')).toBeVisible();
    await expect(page.getByRole('button', { name: TOPICS_BACK_BUTTON_LABEL_PATTERN })).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(48);
    await expect(page.getByTestId('kangur-primary-nav-home')).toBeVisible();
    await expectRouteShellMarker(page);

    await page.getByRole('button', { name: TOPICS_BACK_BUTTON_LABEL_PATTERN }).click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(page.getByTestId('kangur-game-operation-top-section')).toBeVisible();
    await expectRouteShellMarker(page);
  });

  test('drops the home widgets promptly on the Grajmy handoff', async ({ page }) => {
    await page.goto('/kangur/game', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
    await expectGameRouteReady(page, 'kangur-primary-nav-home');

    const actionsShell = page.getByTestId('kangur-home-actions-shell');
    const leaderboard = page.getByTestId('leaderboard-shell');
    const progressCard = page.getByTestId('player-progress-shell');

    await expect(actionsShell).toBeVisible({ timeout: ROUTE_BOOT_TIMEOUT_MS });
    await expect(leaderboard).toBeVisible({ timeout: ROUTE_BOOT_TIMEOUT_MS });
    await expect(progressCard).toBeVisible({ timeout: ROUTE_BOOT_TIMEOUT_MS });

    const initialLayout = await getGameHomeLayoutSnapshot(page);

    await page.getByRole('button', { name: /grajmy|let'?s play/i }).click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await waitForAnimationFrames(page, 2);

    const transitionLayout = await getGameHomeLayoutSnapshot(page);

    expect(transitionLayout.actionsVisible).toBe(false);
    expect(initialLayout.leaderboardTop).not.toBeNull();
    expect(initialLayout.progressTop).not.toBeNull();
    expect(transitionLayout.leaderboardTop).toBeNull();
    expect(transitionLayout.progressTop).toBeNull();

    await expect(page.getByTestId('kangur-game-operation-top-section')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(actionsShell).toHaveCount(0);
    await expect(leaderboard).toHaveCount(0);
    await expect(progressCard).toHaveCount(0);
  });
});
