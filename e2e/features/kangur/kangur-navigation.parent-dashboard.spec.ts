import { expect, test } from '@playwright/test';

import {
  DOCUMENT_LOAD_COUNT_KEY,
  HOME_ROUTE_URL_PATTERN,
  PARENT_DASHBOARD_HEADING_PATTERN,
  ROUTE_BOOT_TIMEOUT_MS,
  expectLearnerProfileRouteReady,
  expectParentDashboardRouteReady,
  expectRouteShellContinuity,
  getVisibleTopBarNavAction,
  getVisibleTopBarProfileAction,
  startRouteShellMonitor,
  stopRouteShellMonitor,
} from './kangur-navigation.shared';
import {
  buildLearnerUser,
  buildManagerUser,
  buildManagerUserWithLearnerMood,
  expectRouteShellMarker,
  getTopNavLayoutSnapshot,
  markRouteShellAsPersistent,
  registerKangurNavigationBeforeEach,
} from './kangur-navigation.support';

test.describe('Kangur navigation continuity', () => {
  test.describe.configure({ timeout: 120_000 });
  registerKangurNavigationBeforeEach(test);

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

    await page.goto('/kangur/game', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
    await expect(page.getByTestId('kangur-route-shell')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(page.getByTestId('kangur-primary-nav-lessons')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(getVisibleTopBarProfileAction(page)).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(page.getByTestId('kangur-primary-nav-parent-dashboard')).toHaveCount(0);

    await getVisibleTopBarProfileAction(page).click();
    await expect(page).toHaveURL(/\/kangur\/profile$/, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expectLearnerProfileRouteReady(page);
    await expect(getVisibleTopBarProfileAction(page)).toBeVisible();
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

    await page.goto('/kangur/profile', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
    await expectLearnerProfileRouteReady(page);

    await markRouteShellAsPersistent(page);

    await startRouteShellMonitor(page);
    await page.getByTestId('kangur-primary-nav-parent-dashboard').click();
    await expect(page).toHaveURL(/\/kangur\/parent-dashboard$/, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expectRouteShellMarker(page);
    await expect(page.getByRole('heading', { name: PARENT_DASHBOARD_HEADING_PATTERN })).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'profile -> parent-dashboard');

    await startRouteShellMonitor(page);
    await getVisibleTopBarNavAction(page, 'kangur-primary-nav-home').click();
    await expect(page).toHaveURL(HOME_ROUTE_URL_PATTERN, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expectRouteShellMarker(page);
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'parent-dashboard -> home');

    await startRouteShellMonitor(page);
    await page.getByTestId('kangur-primary-nav-parent-dashboard').click();
    await expect(page).toHaveURL(/\/kangur\/parent-dashboard$/, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expectRouteShellMarker(page);
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'home -> parent-dashboard');

    const documentLoadCount = await page.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      DOCUMENT_LOAD_COUNT_KEY
    );
    expect(Number(documentLoadCount)).toBeGreaterThanOrEqual(1);
    expect(Number(documentLoadCount)).toBeLessThanOrEqual(2);
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

    await page.goto('/kangur/parent-dashboard', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
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
    expect(beforeScroll.navWidth as number).toBeGreaterThanOrEqual(
      (beforeScroll.topBarWidth as number) - 128
    );
    expect(beforeScroll.utilityLeft as number).toBeGreaterThan(beforeScroll.lessonsRight as number);
    expect(
      (beforeScroll.navRight as number) - (beforeScroll.utilityRight as number)
    ).toBeLessThanOrEqual(28);
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

    await page.goto('/kangur/parent-dashboard', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
    await expectParentDashboardRouteReady(page);
    await markRouteShellAsPersistent(page);

    await startRouteShellMonitor(page);
    await page
      .getByTestId('kangur-parent-dashboard-hero')
      .locator('[data-doc-id="top_nav_profile"]')
      .first()
      .click();
    await expect(page).toHaveURL(/\/kangur\/profile$/);
    await expectLearnerProfileRouteReady(page);
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

    await page.goto('/kangur/parent-dashboard', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
    await expectParentDashboardRouteReady(page);

    const assignmentsTab = page.locator('[data-doc-id="parent_assignments_tab"]');
    const tabTop = await assignmentsTab.evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY
    );

    await page.evaluate((targetTop) => {
      window.scrollTo({ top: Math.max(0, targetTop - 24), left: 0 });
    }, tabTop);

    const beforeScrollY = await page.evaluate(() => window.scrollY);
    await assignmentsTab.click();

    await expect(assignmentsTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#parent-dashboard-panel-assign')).toBeVisible();

    const afterScoresScrollY = await page.evaluate(() => window.scrollY);
    expect(Math.abs(afterScoresScrollY - beforeScrollY)).toBeLessThan(48);

    const progressTab = page.locator('[data-doc-id="parent_progress_tab"]');
    const beforeProgressScrollY = await page.evaluate(() => window.scrollY);
    await progressTab.click();

    await expect(progressTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#parent-dashboard-panel-progress')).toBeVisible();

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

    await page.goto('/kangur/parent-dashboard', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
    await expectParentDashboardRouteReady(page);

    await page.locator('[data-doc-id="parent_ai_tutor_tab"]').click();

    await expect(page.getByTestId('parent-dashboard-ai-tutor-mood')).toBeVisible();
    await expect(page.getByTestId('parent-dashboard-ai-tutor-mood-current')).toContainText(
      /Wspieraj(?:ą|a)cy/
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

    await page.goto('/kangur/parent-dashboard', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
    await expectParentDashboardRouteReady(page);
    await page.locator('[data-doc-id="parent_ai_tutor_tab"]').click();

    await expect(page.getByTestId('parent-dashboard-ai-tutor-mood-current')).toContainText(
      /Wspieraj(?:ą|a)cy/
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
});
