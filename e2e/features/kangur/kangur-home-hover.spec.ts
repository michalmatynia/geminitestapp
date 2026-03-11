import { expect, test, type Locator, type Page } from '@playwright/test';

const getComputedStyleValue = async (locator: Locator, property: keyof CSSStyleDeclaration) =>
  locator.evaluate(
    (element, styleProperty) => getComputedStyle(element)[styleProperty] ?? '',
    property
  );

const getBoundingBox = async (locator: Locator) =>
  locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();

    return {
      height: rect.height,
      width: rect.width,
      x: rect.x,
      y: rect.y,
    };
  });

const getFeaturedActionParts = (page: Page, control: Locator) => {
  const wrapper = page.locator('.home-action-featured-shell').filter({ has: control });

  return {
    accent: control.locator('.home-action-featured-accent'),
    sparkles: control.locator('.home-action-featured-sparkle'),
    underlay: wrapper.locator('.home-action-featured-underlay'),
    wrapper,
  };
};

const expectFeaturedHoverCycle = async ({
  control,
  exitTarget,
  page,
}: {
  control: Locator;
  exitTarget: Locator;
  page: Page;
}) => {
  const { accent, sparkles, underlay } = getFeaturedActionParts(page, control);
  const accentOpacityAtRest = Number.parseFloat(await getComputedStyleValue(accent, 'opacity'));
  const underlayOpacityAtRest = Number.parseFloat(await getComputedStyleValue(underlay, 'opacity'));
  const controlBoxAtRest = await getBoundingBox(control);
  const underlayBoxAtRest = await getBoundingBox(underlay);

  expect(accentOpacityAtRest).toBeLessThanOrEqual(0.1);
  expect(underlayOpacityAtRest).toBeGreaterThan(0.25);

  await control.hover();
  await page.waitForTimeout(180);

  const controlBoxDuringHover = await getBoundingBox(control);
  const underlayBoxDuringHover = await getBoundingBox(underlay);
  const faceLift = controlBoxAtRest.y - controlBoxDuringHover.y;
  const thicknessLift = underlayBoxAtRest.y - underlayBoxDuringHover.y;

  expect(faceLift).toBeGreaterThan(2.5);
  expect(thicknessLift).toBeGreaterThan(2.5);
  expect(Math.abs(faceLift - thicknessLift)).toBeLessThanOrEqual(0.8);
  expect(underlayBoxDuringHover.height).toBeGreaterThan(underlayBoxAtRest.height + 4);

  await expect
    .poll(async () => Number.parseFloat(await getComputedStyleValue(accent, 'opacity')))
    .toBeGreaterThan(0.75);
  await expect
    .poll(async () =>
      Number.parseFloat(await getComputedStyleValue(sparkles.first(), 'opacity'))
    )
    .toBeGreaterThan(0.4);

  await exitTarget.hover();

  await expect
    .poll(async () => Number.parseFloat(await getComputedStyleValue(accent, 'opacity')))
    .toBeLessThanOrEqual(0.1);
  await expect
    .poll(async () =>
      Number.parseFloat(await getComputedStyleValue(sparkles.first(), 'opacity'))
    )
    .toBeLessThanOrEqual(0.02);
  await expect
    .poll(async () =>
      Math.abs(
        Number.parseFloat(await getComputedStyleValue(underlay, 'opacity')) - underlayOpacityAtRest
      )
    )
    .toBeLessThanOrEqual(0.04);
  await expect
    .poll(async () => {
      const box = await getBoundingBox(underlay);
      return Math.abs(box.height - underlayBoxAtRest.height);
    })
    .toBeLessThanOrEqual(1);
};

test.describe('Kangur Home Hover', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/session**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      });
    });
  });

  test('renders every home CTA with the featured glass extrusion treatment', async ({
    page,
  }) => {
    await page.goto('/kangur/game');
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();

    const lessonsCard = page.getByTestId('kangur-home-action-lessons');
    const lessonsLink = lessonsCard.getByRole('link', { name: /^Lekcje/i });
    const playButton = page.getByRole('button', { name: /Grajmy/i });
    const trainingButton = page.getByRole('button', { name: /Trening mieszany/i });
    const geometryHomeButton = page.getByRole('button', { name: /Ćwiczenia z figurami/i });
    const playWrapper = getFeaturedActionParts(page, playButton).wrapper;

    await expect(lessonsCard).toBeVisible();
    await expect(lessonsLink).toBeVisible();
    await expect(playButton).toBeVisible();
    await expect(trainingButton).toBeVisible();
    await expect(geometryHomeButton).toHaveCount(0);
    await expect(playButton).toBeEnabled();
    await expect(trainingButton).toBeEnabled();
    await expect(page.locator('.home-action-active')).toHaveCount(0);
    await expect(page.locator('.home-action-featured')).toHaveCount(4);
    await expect(page.locator('.home-action-featured-shell')).toHaveCount(4);
    await lessonsLink.hover();

    await expectFeaturedHoverCycle({
      control: playButton,
      exitTarget: lessonsLink,
      page,
    });

    await expectFeaturedHoverCycle({
      control: trainingButton,
      exitTarget: lessonsLink,
      page,
    });

    const playUnderlay = playWrapper.locator('.home-action-featured-underlay');
    const playAccent = playButton.locator('.home-action-featured-accent');
    const playSparkles = playButton.locator('.home-action-featured-sparkle');
    const playUnderlayOpacityAtRest = Number.parseFloat(
      await getComputedStyleValue(playUnderlay, 'opacity')
    );
    const playBoxAtRest = await getBoundingBox(playButton);
    const playUnderlayBoxAtRest = await getBoundingBox(playUnderlay);

    await playButton.focus();
    await page.waitForTimeout(180);

    const playBoxDuringFocus = await getBoundingBox(playButton);
    const playUnderlayBoxDuringFocus = await getBoundingBox(playUnderlay);
    const playFaceLiftOnFocus = playBoxAtRest.y - playBoxDuringFocus.y;
    const playThicknessLiftOnFocus = playUnderlayBoxAtRest.y - playUnderlayBoxDuringFocus.y;

    expect(playFaceLiftOnFocus).toBeGreaterThan(2.5);
    expect(playThicknessLiftOnFocus).toBeGreaterThan(2.5);
    expect(Math.abs(playFaceLiftOnFocus - playThicknessLiftOnFocus)).toBeLessThanOrEqual(0.8);
    expect(playUnderlayBoxDuringFocus.height).toBeGreaterThan(playUnderlayBoxAtRest.height + 4);

    await expect
      .poll(async () => Number.parseFloat(await getComputedStyleValue(playAccent, 'opacity')))
      .toBeGreaterThan(0.75);

    await lessonsLink.focus();
    await expect
      .poll(async () => Number.parseFloat(await getComputedStyleValue(playAccent, 'opacity')))
      .toBeLessThanOrEqual(0.1);
    await expect
      .poll(async () => Number.parseFloat(await getComputedStyleValue(playSparkles.first(), 'opacity')))
      .toBeLessThanOrEqual(0.02);
    await expect
      .poll(async () =>
        Math.abs(
          Number.parseFloat(await getComputedStyleValue(playUnderlay, 'opacity')) -
            playUnderlayOpacityAtRest
        )
      )
      .toBeLessThanOrEqual(0.04);
    await expect
      .poll(async () => {
        const box = await getBoundingBox(playUnderlay);
        return Math.abs(box.height - playUnderlayBoxAtRest.height);
      })
      .toBeLessThanOrEqual(1);
  });
});
