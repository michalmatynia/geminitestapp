import { expect, test, type Page } from '@playwright/test';

type HomeHandoffSample = {
  hasSkeleton: boolean;
  homeActionsTop: number | null;
  skeletonHomeActionsTop: number | null;
};

const HANDOFF_MONITOR_KEY = '__kangurHomeSkeletonHandoffMonitor';
const HOME_ROUTE_URL_PATTERN = /\/(?:[a-z]{2}(?:\/kangur)?|kangur)$/;
const LESSONS_ROUTE_URL_PATTERN = /\/(?:(?:[a-z]{2})\/)?(?:kangur\/)?lessons$/;

const waitForAnimationFrames = async (page: Page, frames: number): Promise<void> => {
  await page.evaluate(async (frameCount) => {
    for (let index = 0; index < frameCount; index += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }, frames);
};

const startHomeHandoffMonitor = async (page: Page): Promise<void> => {
  await page.evaluate((monitorKey) => {
    const globalWindow = window as Window & {
      [key: string]:
        | {
            stop: () => HomeHandoffSample[];
          }
        | undefined;
    };
    const samples: HomeHandoffSample[] = [];
    let running = true;

    const queryByTestId = (testId: string): Element | null =>
      document.querySelector(`[data-testid="${testId}"]`);
    const getTop = (element: Element | null): number | null =>
      element?.getBoundingClientRect().top ?? null;

    const sample = (): void => {
      samples.push({
        hasSkeleton: Boolean(queryByTestId('kangur-page-transition-skeleton')),
        skeletonHomeActionsTop: getTop(
          queryByTestId('kangur-page-transition-skeleton-game-home-actions-shell')
        ),
        homeActionsTop: getTop(queryByTestId('kangur-home-actions-shell')),
      });

      if (running) {
        requestAnimationFrame(sample);
      }
    };

    requestAnimationFrame(sample);
    globalWindow[monitorKey] = {
      stop: () => {
        running = false;
        return samples;
      },
    };
  }, HANDOFF_MONITOR_KEY);
};

const stopHomeHandoffMonitor = async (page: Page): Promise<HomeHandoffSample[]> =>
  page.evaluate((monitorKey) => {
    const globalWindow = window as Window & {
      [key: string]:
        | {
            stop: () => HomeHandoffSample[];
          }
        | undefined;
    };

    return globalWindow[monitorKey]?.stop() ?? [];
  }, HANDOFF_MONITOR_KEY);

test('keeps the Home actions panel fixed in place when the Home skeleton hands off after Lessons', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/kangur/game');
  await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible({
    timeout: 45_000,
  });

  await page.getByTestId('kangur-primary-nav-lessons').click();
  await expect(page).toHaveURL(LESSONS_ROUTE_URL_PATTERN);
  await expect(page.getByTestId('lessons-list-transition')).toBeVisible();

  await startHomeHandoffMonitor(page);
  await page.getByTestId('kangur-primary-nav-home').click();
  await expect(page).toHaveURL(HOME_ROUTE_URL_PATTERN);
  await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
  await waitForAnimationFrames(page, 18);

  const samples = await stopHomeHandoffMonitor(page);
  const lastSkeletonSample =
    [...samples]
      .reverse()
      .find((sample) => sample.hasSkeleton && sample.skeletonHomeActionsTop !== null) ?? null;
  const firstVisibleHomeSample =
    samples.find((sample) => !sample.hasSkeleton && sample.homeActionsTop !== null) ?? null;
  const finalHomeSample =
    [...samples].reverse().find((sample) => sample.homeActionsTop !== null) ?? null;

  expect(lastSkeletonSample).not.toBeNull();
  expect(firstVisibleHomeSample).not.toBeNull();
  expect(finalHomeSample).not.toBeNull();
  expect(
    Math.abs(
      (lastSkeletonSample?.skeletonHomeActionsTop ?? 0) -
        (firstVisibleHomeSample?.homeActionsTop ?? 0)
    )
  ).toBeLessThanOrEqual(4);
  expect(
    Math.abs(
      (firstVisibleHomeSample?.homeActionsTop ?? 0) - (finalHomeSample?.homeActionsTop ?? 0)
    )
  ).toBeLessThanOrEqual(4);
});
