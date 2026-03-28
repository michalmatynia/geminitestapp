import { expect, type Locator, type Page } from '@playwright/test';

import {
  AVATAR_SIZE,
  GUIDED_AVATAR_SURFACE_GAP,
  KANGUR_AI_TUTOR_HOME_ONBOARDING_STORAGE_KEY,
} from '@/features/kangur/ui/components/KangurAiTutorWidget.shared';

export async function openTutorFromSelection(page: Page): Promise<void> {
  const selectionAction = page.getByTestId('kangur-ai-tutor-selection-action');
  try {
    await selectionAction.waitFor({ state: 'visible', timeout: 1_500 });
    await selectionAction.getByRole('button', { name: 'Zapytaj o to' }).evaluate((button) => {
      (button as HTMLButtonElement).click();
    });
    return;
  } catch {
    throw new Error(
      'Selection CTA was not rendered. Tests must not fall back to the legacy avatar-to-panel flow.'
    );
  }
}

export async function selectAllTextInElement(page: Page, selector: string): Promise<void> {
  const root = page.locator(selector).first();
  await root.waitFor();
  await root.scrollIntoViewIfNeeded();

  await page.evaluate((nextSelector) => {
    const rootElement = document.querySelector(nextSelector);
    if (!rootElement) {
      throw new Error(`Missing selection root for selector: ${nextSelector}`);
    }

    const range = document.createRange();
    range.selectNodeContents(rootElement);

    const selection = window.getSelection();
    if (!selection) {
      throw new Error('Selection API is unavailable in this browser context.');
    }

    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('scroll'));
  }, selector);
}

export async function gotoTutorRoute(page: Page, href: string): Promise<void> {
  await page.goto(href, { waitUntil: 'domcontentloaded' });
}

export async function openLessonByTitle(
  page: Page,
  lessonTitle: string,
  expectedSelectedText?: string
): Promise<Locator> {
  await page.getByRole('button', { name: lessonTitle }).click();

  const lessonBlock = expectedSelectedText
    ? page
        .locator('[data-testid^="lesson-text-block-"]')
        .filter({ hasText: expectedSelectedText })
        .first()
    : page.locator('[data-testid^="lesson-text-block-"]').first();

  await expect(lessonBlock).toBeVisible();
  if (expectedSelectedText) {
    await expect(lessonBlock).toContainText(expectedSelectedText);
  }

  return lessonBlock;
}

export async function openTestQuestionFromSuite(page: Page, suiteId = 'suite-add-1'): Promise<string> {
  const suiteCard = page.getByTestId(`kangur-test-suite-card-${suiteId}`);
  await expect(suiteCard).toBeVisible();
  await suiteCard.getByRole('button').click();

  const questionAnchor = page.getByTestId('kangur-test-question-anchor');
  await expect(questionAnchor).toBeVisible();

  const questionPrompt = (await questionAnchor.getByRole('heading').textContent())?.trim() ?? '';
  expect(questionPrompt.length).toBeGreaterThan(0);

  return questionPrompt;
}

export async function enableDarkTheme(page: Page): Promise<void> {
  const themeToggle = page.getByRole('button', { name: 'Switch to Dark theme' });
  if ((await themeToggle.count()) > 0) {
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    await expect(page.locator('[data-kangur-appearance="dark"]').first()).toBeVisible();
    return;
  }

  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    document.documentElement.setAttribute('data-kangur-appearance-mode', 'dark');
    document.body.setAttribute('data-kangur-appearance-mode', 'dark');
    document.querySelectorAll('[data-kangur-appearance]').forEach((element) => {
      element.setAttribute('data-kangur-appearance', 'dark');
    });
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.getAttribute('data-kangur-appearance-mode') === 'dark' &&
          document.body.getAttribute('data-kangur-appearance-mode') === 'dark' &&
          Array.from(document.querySelectorAll('[data-kangur-appearance]')).every(
            (element) => element.getAttribute('data-kangur-appearance') === 'dark'
          )
      )
    )
    .toBe(true);
}

export async function triggerOnboardingAcknowledge(onboarding: Locator): Promise<void> {
  await onboarding.getByRole('button', { name: 'Rozumiem' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
}

export async function triggerOnboardingFinish(onboarding: Locator): Promise<void> {
  await onboarding.getByRole('button', { name: 'Zakończ' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
}

export async function triggerTutorAvatar(page: Page): Promise<void> {
  await page.getByTestId('kangur-ai-tutor-avatar').click();
}

export async function dragTutorAvatarToAnchor(page: Page, anchor: Locator): Promise<void> {
  const avatar = page.getByTestId('kangur-ai-tutor-avatar');
  const [avatarBox, anchorBox] = await Promise.all([avatar.boundingBox(), anchor.boundingBox()]);

  expect(avatarBox).not.toBeNull();
  expect(anchorBox).not.toBeNull();

  if (!avatarBox || !anchorBox) {
    return;
  }

  await page.mouse.move(avatarBox.x + avatarBox.width / 2, avatarBox.y + avatarBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(anchorBox.x + anchorBox.width / 2, anchorBox.y + anchorBox.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
}

export async function dismissHomeOnboardingIfVisible(page: Page): Promise<void> {
  const onboarding = page.getByTestId('kangur-ai-tutor-home-onboarding');
  const avatar = page.getByTestId('kangur-ai-tutor-avatar');

  if ((await onboarding.count()) === 0) {
    try {
      await onboarding.waitFor({ state: 'visible', timeout: 1_500 });
    } catch {
      return;
    }
  }

  await expect(onboarding).toBeVisible();
  await triggerOnboardingFinish(onboarding);
  await expect(onboarding).toHaveCount(0);
  await expect(avatar).toHaveAttribute('data-avatar-placement', 'floating');
}

export async function openDivisionQuestionFromGameHome(page: Page): Promise<string> {
  await dismissHomeOnboardingIfVisible(page);
  await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();

  await page.getByRole('button', { name: /grajmy/i }).click();
  await expect(page.getByTestId('kangur-game-operation-top-section')).toBeVisible();

  await page.getByTestId('operation-card-division').click();

  const questionAnchor = page.getByTestId('kangur-game-question-anchor');
  await expect(questionAnchor).toBeVisible();

  const questionPrompt = (await questionAnchor.getByRole('heading').textContent())?.trim() ?? '';
  expect(questionPrompt.length).toBeGreaterThan(0);

  return questionPrompt;
}

export const readHomeOnboardingStatus = async (page: Page): Promise<string | null> =>
  page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as { status?: unknown } | null;
      return typeof parsed?.status === 'string' ? parsed.status : null;
    } catch {
      return null;
    }
  }, KANGUR_AI_TUTOR_HOME_ONBOARDING_STORAGE_KEY);

export async function expectLocatorsNotToOverlap(
  first: Locator,
  second: Locator
): Promise<void> {
  const [firstBox, secondBox] = await Promise.all([first.boundingBox(), second.boundingBox()]);

  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();

  if (!firstBox || !secondBox) {
    return;
  }

  const overlapsHorizontally =
    firstBox.x < secondBox.x + secondBox.width && firstBox.x + firstBox.width > secondBox.x;
  const overlapsVertically =
    firstBox.y < secondBox.y + secondBox.height && firstBox.y + firstBox.height > secondBox.y;

  expect(overlapsHorizontally && overlapsVertically).toBeFalsy();
}

export async function expectLocatorsToOverlap(
  first: Locator,
  second: Locator
): Promise<void> {
  const [firstBox, secondBox] = await Promise.all([first.boundingBox(), second.boundingBox()]);

  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();

  if (!firstBox || !secondBox) {
    return;
  }

  const overlapsHorizontally =
    firstBox.x < secondBox.x + secondBox.width && firstBox.x + firstBox.width > secondBox.x;
  const overlapsVertically =
    firstBox.y < secondBox.y + secondBox.height && firstBox.y + firstBox.height > secondBox.y;

  expect(overlapsHorizontally && overlapsVertically).toBeTruthy();
}

export async function expectGuidedAvatarAndCalloutToStayAdjacent(
  avatar: Locator,
  callout: Locator
): Promise<void> {
  const [avatarBox, calloutBox, avatarPlacement] = await Promise.all([
    avatar.boundingBox(),
    callout.boundingBox(),
    avatar.getAttribute('data-guidance-avatar-placement'),
  ]);

  expect(avatarBox).not.toBeNull();
  expect(calloutBox).not.toBeNull();
  expect(avatarPlacement).toBeTruthy();

  if (!avatarBox || !calloutBox || !avatarPlacement) {
    return;
  }

  if (avatarPlacement === 'left') {
    expect(calloutBox.x).toBeGreaterThanOrEqual(
      avatarBox.x + AVATAR_SIZE / 2 + GUIDED_AVATAR_SURFACE_GAP - 8
    );
    return;
  }

  if (avatarPlacement === 'right') {
    expect(calloutBox.x + calloutBox.width).toBeLessThanOrEqual(
      avatarBox.x + AVATAR_SIZE / 2 - GUIDED_AVATAR_SURFACE_GAP + 8
    );
    return;
  }

  if (avatarPlacement === 'top') {
    expect(calloutBox.y + calloutBox.height).toBeLessThanOrEqual(
      avatarBox.y + AVATAR_SIZE / 2 - GUIDED_AVATAR_SURFACE_GAP + 8
    );
    return;
  }

  if (avatarPlacement === 'bottom') {
    expect(calloutBox.y).toBeGreaterThanOrEqual(
      avatarBox.y + AVATAR_SIZE / 2 + GUIDED_AVATAR_SURFACE_GAP - 8
    );
  }
}

export async function expectLocatorToStayNearFocus(
  locator: Locator,
  focus: Locator,
  thresholdPx: number
): Promise<void> {
  const [locatorBox, focusBox] = await Promise.all([locator.boundingBox(), focus.boundingBox()]);

  expect(locatorBox).not.toBeNull();
  expect(focusBox).not.toBeNull();

  if (!locatorBox || !focusBox) {
    return;
  }

  const locatorCenterX = locatorBox.x + locatorBox.width / 2;
  const locatorCenterY = locatorBox.y + locatorBox.height / 2;
  const focusCenterX = focusBox.x + focusBox.width / 2;
  const focusCenterY = focusBox.y + focusBox.height / 2;

  const distance = Math.hypot(locatorCenterX - focusCenterX, locatorCenterY - focusCenterY);
  expect(distance).toBeLessThanOrEqual(thresholdPx);
}

export async function expectGuidedArrowheadToStayAnchoredToAvatar(arrowhead: Locator): Promise<void> {
  await expect(arrowhead).toHaveAttribute('data-arrowhead-positioned', 'true');
  await expect(arrowhead).not.toHaveClass(/opacity-0/);
}

export async function expectSelectionGradientEmphasisToBeActive(page: Page): Promise<void> {
  await expect(page.locator('[data-kangur-ai-tutor-selection-emphasis="gradient"]')).toHaveCount(1);
}

export async function expectSelectionGradientTextToAnimate(page: Page): Promise<void> {
  await expect(
    page.locator('[data-kangur-ai-tutor-selection-emphasis="gradient"][data-gradient-animated="true"]')
  ).toHaveCount(1);
}

export async function expectSelectionGlowOverlayToBeVisible(page: Page): Promise<void> {
  await expect(page.getByTestId('kangur-ai-tutor-selection-glow')).toBeVisible();
}

export async function expectLocatorToStayStill(
  page: Page,
  locator: Locator
): Promise<void> {
  const before = await locator.boundingBox();
  expect(before).not.toBeNull();
  if (!before) {
    return;
  }

  await page.waitForTimeout(120);

  const after = await locator.boundingBox();
  expect(after).not.toBeNull();
  if (!after) {
    return;
  }

  expect(Math.abs((before.x ?? 0) - (after.x ?? 0))).toBeLessThanOrEqual(2);
  expect(Math.abs((before.y ?? 0) - (after.y ?? 0))).toBeLessThanOrEqual(2);
}

export async function expectGuidedArrowheadToTargetLocator(
  arrowhead: Locator,
  target: Locator
): Promise<void> {
  const [arrowheadBox, targetBox] = await Promise.all([arrowhead.boundingBox(), target.boundingBox()]);

  expect(arrowheadBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  if (!arrowheadBox || !targetBox) {
    return;
  }

  const arrowCenterX = arrowheadBox.x + arrowheadBox.width / 2;
  const arrowCenterY = arrowheadBox.y + arrowheadBox.height / 2;
  const targetCenterX = targetBox.x + targetBox.width / 2;
  const targetCenterY = targetBox.y + targetBox.height / 2;

  expect(Math.abs(arrowCenterX - targetCenterX)).toBeLessThanOrEqual(targetBox.width / 2 + 48);
  expect(Math.abs(arrowCenterY - targetCenterY)).toBeLessThanOrEqual(targetBox.height / 2 + 48);
}
