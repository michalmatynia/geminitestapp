import { expect, test, type Locator, type Page } from '@playwright/test';

import { mockKangurTutorEnvironment } from '../../support/kangur-tutor-fixtures';

const HOME_ONBOARDING_STORAGE_KEY = 'kangur-ai-tutor-home-onboarding-v1';
const MOBILE_VIEWPORTS = [
  { label: 'iphone-se', width: 320, height: 568 },
  { label: 'iphone-13', width: 390, height: 844 },
] as const;

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const toBottom = (box: Box): number => box.y + box.height;
const toRight = (box: Box): number => box.x + box.width;

async function expectLocatorsNotToOverlap(
  first: Locator,
  second: Locator,
  message: string
): Promise<void> {
  const [firstBox, secondBox] = await Promise.all([first.boundingBox(), second.boundingBox()]);

  expect(firstBox, `${message}: first locator was not measurable`).not.toBeNull();
  expect(secondBox, `${message}: second locator was not measurable`).not.toBeNull();

  if (!firstBox || !secondBox) {
    return;
  }

  const overlapsHorizontally = firstBox.x < toRight(secondBox) && toRight(firstBox) > secondBox.x;
  const overlapsVertically = firstBox.y < toBottom(secondBox) && toBottom(firstBox) > secondBox.y;

  expect(overlapsHorizontally && overlapsVertically, message).toBe(false);
}

async function expectVerticalOrder(
  upper: Locator,
  lower: Locator,
  message: string,
  tolerance = 2
): Promise<void> {
  const [upperBox, lowerBox] = await Promise.all([upper.boundingBox(), lower.boundingBox()]);

  expect(upperBox, `${message}: upper locator was not measurable`).not.toBeNull();
  expect(lowerBox, `${message}: lower locator was not measurable`).not.toBeNull();

  if (!upperBox || !lowerBox) {
    return;
  }

  expect(lowerBox.y, message).toBeGreaterThanOrEqual(toBottom(upperBox) - tolerance);
}

async function expectViewportSafeWidth(
  page: Page,
  locator: Locator,
  message: string,
  allowancePx = 6
): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, `${message}: locator was not measurable`).not.toBeNull();

  if (!box) {
    return;
  }

  const viewportSize = page.viewportSize();
  expect(viewportSize).not.toBeNull();

  if (!viewportSize) {
    return;
  }

  expect(box.x, message).toBeGreaterThanOrEqual(-allowancePx);
  expect(toRight(box), message).toBeLessThanOrEqual(viewportSize.width + allowancePx);
}

async function openDocumentLesson(page: Page): Promise<void> {
  await page.goto('/kangur/lessons', { waitUntil: 'commit' });
  await expect(page.getByTestId('lessons-list-intro-card')).toBeVisible();
  await page.getByRole('button', { name: /dodawanie z tutorem/i }).click();
  await expect(page.getByTestId('active-lesson-header')).toBeVisible();
  await expect(page.getByTestId('lessons-document-summary')).toBeVisible();
  await expect(page.locator('[data-testid^="lesson-page-shell-"]').first()).toBeVisible();
}

async function persistHomeOnboardingStatus(
  page: Page,
  status: 'completed' | 'dismissed'
): Promise<void> {
  await page.addInitScript(
    ([storageKey, onboardingStatus]) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: 1,
          status: onboardingStatus,
          updatedAt: '2026-03-12T00:00:00.000Z',
        })
      );
    },
    [HOME_ONBOARDING_STORAGE_KEY, status] as const
  );
}

for (const viewport of MOBILE_VIEWPORTS) {
  test.describe(`Kangur mobile layout ${viewport.label}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await mockKangurTutorEnvironment(page, { uiMode: 'anchored' });
    });

    test('keeps home sections stacked without overlap', async ({ page }) => {
      await persistHomeOnboardingStatus(page, 'dismissed');
      await page.goto('/kangur', { waitUntil: 'commit' });

      const topBar = page.getByTestId('kangur-page-top-bar');
      const actions = page.getByTestId('kangur-home-actions-shell');
      const quest = page.getByTestId('kangur-home-quest-widget');
      const leaderboard = page.getByTestId('leaderboard-shell');
      const progress = page.getByTestId('player-progress-shell');

      await expect(topBar).toBeVisible();
      await expect(actions).toBeVisible();
      await expect(quest).toBeVisible();
      await expect(leaderboard).toBeVisible();
      await expect(progress).toBeVisible();

      await expectVerticalOrder(topBar, actions, 'mobile top bar should not cover the home actions');
      await expectVerticalOrder(actions, quest, 'mobile action panel should stay above the daily quest');
      await expectVerticalOrder(quest, progress, 'mobile daily quest should stay above the progress card');
      await expectVerticalOrder(progress, leaderboard, 'mobile progress card should stay above the leaderboard');

      await expectViewportSafeWidth(page, actions, 'mobile action panel should stay inside the viewport');
      await expectViewportSafeWidth(page, leaderboard, 'mobile leaderboard should stay inside the viewport');
      await expectViewportSafeWidth(page, progress, 'mobile progress card should stay inside the viewport');
    });

    test('keeps the mobile onboarding callout off the home action stack', async ({ page }) => {
      await page.goto('/kangur', { waitUntil: 'commit' });

      const actions = page.getByTestId('kangur-home-actions-shell');
      const onboarding = page.getByTestId('kangur-ai-tutor-home-onboarding');

      await expect(actions).toBeVisible();
      await expect(onboarding).toBeVisible();

      await expectLocatorsNotToOverlap(
        actions,
        onboarding,
        'mobile home onboarding should not cover the home actions'
      );
      await expectViewportSafeWidth(
        page,
        onboarding,
        'mobile home onboarding should stay inside the viewport'
      );
    });

    test('keeps the active lesson header and document sections separated', async ({ page }) => {
      await persistHomeOnboardingStatus(page, 'dismissed');
      await openDocumentLesson(page);

      const topBar = page.getByTestId('kangur-page-top-bar');
      const header = page.getByTestId('active-lesson-header');
      const summary = page.getByTestId('lessons-document-summary');
      const firstPage = page.locator('[data-testid^="lesson-page-shell-"]').first();

      await expectVerticalOrder(topBar, header, 'mobile top bar should not cover the active lesson header');
      await expectVerticalOrder(header, summary, 'mobile active lesson header should stay above the lesson summary');
      await expectVerticalOrder(summary, firstPage, 'mobile lesson summary should stay above the first lesson page');

      await expectLocatorsNotToOverlap(
        header,
        summary,
        'mobile active lesson header should not overlap the lesson summary'
      );
      await expectLocatorsNotToOverlap(
        summary,
        firstPage,
        'mobile lesson summary should not overlap the lesson document page'
      );

      await expectViewportSafeWidth(page, header, 'mobile active lesson header should stay inside the viewport');
      await expectViewportSafeWidth(page, firstPage, 'mobile lesson page shell should stay inside the viewport');
    });
  });
}
