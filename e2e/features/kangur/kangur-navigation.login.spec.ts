import { expect, test } from '@playwright/test';

import {
  DOCUMENT_LOAD_COUNT_KEY,
  HOME_ROUTE_URL_PATTERN,
  LOGIN_IDENTIFIER_LABEL_PATTERN,
  MAGIC_LINK_DEPRECATED_NOTICE_PATTERN,
  ROUTE_BOOT_TIMEOUT_MS,
  expectGameRouteReady,
  expectKangurAppShellVisible,
  expectKangurLoginReady,
  expectKangurSurfaceContinuity,
  getKangurLoginIdentifierField,
  getKangurLoginPasswordField,
  getKangurLoginSubmitButton,
  startKangurSurfaceMonitor,
  stopKangurSurfaceMonitor,
} from './kangur-navigation.shared';
import {
  buildLearnerUser,
  registerKangurNavigationBeforeEach,
} from './kangur-navigation.support';

test.describe('Kangur navigation continuity', () => {
  test.describe.configure({ timeout: 120_000 });
  registerKangurNavigationBeforeEach(test);

  test('preserves the Kangur surface across login entry and return navigation', async ({ page }) => {
    await page.goto('/kangur/game', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
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

    await page.goto('/kangur/login?callbackUrl=%2Fkangur%2Fprofile', {
      waitUntil: 'commit',
      timeout: 90_000,
    });

    await expectKangurLoginReady(page);
    await expectKangurAppShellVisible(page, ROUTE_BOOT_TIMEOUT_MS);
    await expect(page.getByTestId('kangur-primary-nav-home')).toBeVisible();
    await expect(page.getByLabel(LOGIN_IDENTIFIER_LABEL_PATTERN)).toBeVisible();

    const [bodyBackgroundImage, appContentBackgroundImage] = await page.evaluate(() => {
      const bodyStyles = window.getComputedStyle(document.body);
      const appContent = document.getElementById('app-content');
      const appContentStyles = appContent ? window.getComputedStyle(appContent) : null;
      return [bodyStyles.backgroundImage, appContentStyles?.backgroundImage ?? null];
    });

    expect(bodyBackgroundImage).toContain('radial-gradient');
    expect(
      appContentBackgroundImage === null ||
        appContentBackgroundImage === 'none' ||
        appContentBackgroundImage.includes('radial-gradient')
    ).toBe(true);

    await startKangurSurfaceMonitor(page);
    await page.getByTestId('kangur-login-modal-close').click();
    await expect(page).toHaveURL(HOME_ROUTE_URL_PATTERN, { timeout: ROUTE_BOOT_TIMEOUT_MS });
    await expectKangurAppShellVisible(page, ROUTE_BOOT_TIMEOUT_MS);
    await page.waitForTimeout(250);
    expectKangurSurfaceContinuity(
      await stopKangurSurfaceMonitor(page),
      'direct login modal -> kangur'
    );

    const documentLoadCount = await page.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      DOCUMENT_LOAD_COUNT_KEY
    );
    expect(Number(documentLoadCount)).toBeGreaterThanOrEqual(1);
    expect(Number(documentLoadCount)).toBeLessThanOrEqual(2);
  });

  test('submits parent credentials from the unified Kangur login page and returns to the callback route', async ({
    page,
  }) => {
    let callbackPayload: URLSearchParams | null = null;
    let verifyCredentialsPayload: Record<string, string> | null = null;

    await page.route('**/api/auth/csrf**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ csrfToken: 'kangur-parent-csrf' }),
      });
    });

    await page.route('**/api/auth/verify-credentials**', async (route) => {
      verifyCredentialsPayload = JSON.parse(route.request().postData() ?? '{}') as Record<
        string,
        string
      >;
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

    await page.goto('/kangur/login?callbackUrl=%2Fkangur%3Flogin%3Dparent', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
    await expectKangurLoginReady(page);

    const identifierField = getKangurLoginIdentifierField(page);
    const parentPasswordField = getKangurLoginPasswordField(page);

    await identifierField.fill('parent@example.com');
    await parentPasswordField.fill('secret123');
    await expect(identifierField).toHaveValue('parent@example.com');
    await expect(parentPasswordField).toHaveValue('secret123');
    await expect(page.getByTestId('kangur-login-form')).toHaveAttribute('data-login-kind', 'parent');
    await expect(getKangurLoginSubmitButton(page)).toBeEnabled();
    await getKangurLoginSubmitButton(page).click();

    await expect(page).toHaveURL(/\/kangur\?login=parent$/, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    expect(callbackPayload?.get('email')).toBe('parent@example.com');
    expect(callbackPayload?.get('callbackUrl')).toBe('/kangur?login=parent');
    expect(verifyCredentialsPayload).toEqual({
      authFlow: 'kangur_parent',
      email: 'parent@example.com',
      password: 'secret123',
    });
  });

  test('shows the legacy parent magic-link entry as a password-based fallback prompt', async ({
    page,
  }) => {
    await page.goto(
      '/kangur/login?callbackUrl=%2Fkangur%3Flogin%3Dmagic-parent&magicLinkToken=magic-link-1',
      {
        waitUntil: 'commit',
        timeout: 90_000,
      }
    );

    await expectKangurLoginReady(page);
    await expect(page.getByText(MAGIC_LINK_DEPRECATED_NOTICE_PATTERN)).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(getKangurLoginIdentifierField(page)).toBeVisible();
    await expect(getKangurLoginPasswordField(page)).toBeVisible();
    await expect(page).toHaveURL(/callbackUrl=.*magic-parent/, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
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
      learnerSignInPayload = JSON.parse(route.request().postData() ?? '{}') as Record<
        string,
        string
      >;
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

    await page.goto('/kangur/login?callbackUrl=%2Fkangur%3Flogin%3Dstudent', {
      waitUntil: 'commit',
      timeout: 90_000,
    });
    await expectKangurLoginReady(page);

    const studentNicknameField = getKangurLoginIdentifierField(page);
    const studentPasswordField = getKangurLoginPasswordField(page);

    await studentNicknameField.fill('janek123');
    await studentPasswordField.fill('secret123');
    await expect(studentNicknameField).toHaveValue('janek123');
    await expect(studentPasswordField).toHaveValue('secret123');
    await expect(page.getByTestId('kangur-login-form')).toHaveAttribute(
      'data-login-kind',
      'student'
    );
    await expect(getKangurLoginSubmitButton(page)).toBeEnabled();
    await getKangurLoginSubmitButton(page).click();

    await expect(page).toHaveURL(/\/kangur\?login=student$/, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('kangur.activeLearnerId')))
      .toBe('learner-001');
    expect(learnerSignInPayload).toEqual({
      loginName: 'janek123',
      password: 'secret123',
    });
  });
});
