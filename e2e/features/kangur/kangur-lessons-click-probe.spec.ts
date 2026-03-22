import { test } from '@playwright/test';

const readNavDebugState = async (page: import('@playwright/test').Page) =>
  await page.evaluate(() => {
    const lessons = document.querySelector('[data-testid="kangur-primary-nav-lessons"]');
    const routeContent = document.querySelector('[data-testid="kangur-route-content"]');
    const skeleton = document.querySelector('[data-testid="kangur-page-transition-skeleton"]');
    const appLoader = document.querySelector('[data-testid="kangur-app-loader"]');
    const topBar = document.querySelector('[data-testid="kangur-page-top-bar"]');

    const elementDetails = (value: Element | null) => {
      if (!value) {
        return null;
      }

      const element = value as HTMLElement;
      const rect = element.getBoundingClientRect();
      const styles = window.getComputedStyle(element);
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const hit = document.elementFromPoint(cx, cy);

      return {
        tag: element.tagName,
        href: element instanceof HTMLAnchorElement ? element.getAttribute('href') : null,
        navState: element.getAttribute('data-nav-state'),
        pointerEvents: styles.pointerEvents,
        opacity: styles.opacity,
        display: styles.display,
        visibility: styles.visibility,
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        hitTestTestId: hit?.getAttribute('data-testid') ?? null,
        hitTestTag: hit?.tagName ?? null,
      };
    };

    return {
      locationHref: window.location.href,
      lessons: elementDetails(lessons),
      routeContent: routeContent
        ? {
            phase: routeContent.getAttribute('data-route-transition-phase'),
            sourceId: routeContent.getAttribute('data-route-transition-source-id'),
            ariaBusy: routeContent.getAttribute('aria-busy'),
            className: routeContent.className,
          }
        : null,
      hasSkeleton: Boolean(skeleton),
      hasAppLoader: Boolean(appLoader),
      topBarBottom:
        topBar instanceof HTMLElement ? topBar.getBoundingClientRect().bottom : null,
    };
  });

test('probe Kangur lessons click', async ({ page }) => {
  test.setTimeout(120_000);
  const requests: string[] = [];

  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/kangur')) {
      requests.push(url);
    }
  });

  await page.goto('/kangur/game', { waitUntil: 'commit', timeout: 90_000 });
  await page.getByTestId('kangur-primary-nav-lessons').waitFor({ state: 'visible', timeout: 45_000 });
  await page.waitForTimeout(500);

  console.log('BEFORE_CLICK', JSON.stringify(await readNavDebugState(page)));

  await page.getByTestId('kangur-primary-nav-lessons').click();
  await page.waitForTimeout(500);

  console.log('AFTER_CLICK', JSON.stringify(await readNavDebugState(page)));
  console.log('REQUESTS', JSON.stringify(requests));
});
