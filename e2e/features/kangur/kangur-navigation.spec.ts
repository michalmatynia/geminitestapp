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
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
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
    await page.getByTestId('kangur-primary-nav-tests').click();
    await expect(page).toHaveURL(/\/kangur\/tests$/);
    await expectRouteShellMarker(page);
    await expect(page.getByRole('heading', { name: /Testy Kangur/i })).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'lessons -> tests');

    await startRouteShellMonitor(page);
    await page.getByRole('link', { name: /^Profil$/ }).click();
    await expect(page).toHaveURL(/\/kangur\/profile$/);
    await expectRouteShellMarker(page);
    await expect(page.getByRole('heading', { name: /Profil ucznia/i })).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'tests -> profile');

    await startRouteShellMonitor(page);
    await page.getByTestId('kangur-primary-nav-home').click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expectRouteShellMarker(page);
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'profile -> game');

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
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expectRouteShellMarker(page);
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'parent-dashboard -> game');

    await startRouteShellMonitor(page);
    await page.getByTestId('kangur-primary-nav-parent-dashboard').click();
    await expect(page).toHaveURL(/\/kangur\/parent-dashboard$/);
    await expectRouteShellMarker(page);
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'game -> parent-dashboard');

    const documentLoadCount = await page.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      DOCUMENT_LOAD_COUNT_KEY
    );
    expect(documentLoadCount).toBe('1');
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
