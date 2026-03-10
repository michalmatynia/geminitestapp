import { expect, test, type Locator, type Page } from '@playwright/test';

import { KANGUR_AI_TUTOR_HOME_ONBOARDING_STORAGE_KEY } from '@/features/kangur/ui/components/KangurAiTutorWidget.shared';

import {
  installKangurNarratorSpeechRecorder,
  mockKangurTutorEnvironment,
  readKangurNarratorSpeechLog,
  selectTextInElement,
} from '../../support/kangur-tutor-fixtures';

async function openTutorFromSelection(page: Page): Promise<void> {
  const selectionAction = page.getByTestId('kangur-ai-tutor-selection-action');
  try {
    await selectionAction.waitFor({ state: 'visible', timeout: 1_500 });
    await selectionAction.getByRole('button', { name: 'Zapytaj o to' }).evaluate((button) => {
      (button as HTMLButtonElement).click();
    });
    return;
  } catch {
    // Fall back to the avatar launcher when the selection CTA is not rendered for this surface.
  }

  await triggerTutorAvatar(page);
}

async function expectTutorAvatarAttachedToPanel(page: Page): Promise<void> {
  const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
  const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');
  const [avatarBox, panelBox] = await Promise.all([tutorAvatar.boundingBox(), tutorPanel.boundingBox()]);

  expect(avatarBox).not.toBeNull();
  expect(panelBox).not.toBeNull();

  if (!avatarBox || !panelBox) {
    return;
  }

  const overlapsHorizontally =
    avatarBox.x < panelBox.x + panelBox.width && avatarBox.x + avatarBox.width > panelBox.x;
  const overlapsVertically =
    avatarBox.y < panelBox.y + panelBox.height && avatarBox.y + avatarBox.height > panelBox.y;

  expect(overlapsHorizontally).toBeTruthy();
  expect(overlapsVertically).toBeTruthy();
}

async function waitForTutorPanelToSettle(panel: Locator): Promise<void> {
  await expect(panel).toHaveAttribute('data-motion-state', 'settled');
}

async function gotoTutorRoute(page: Page, href: string): Promise<void> {
  await page.goto(href, { waitUntil: 'domcontentloaded' });
}

async function triggerOnboardingAcknowledge(onboarding: Locator): Promise<void> {
  await onboarding.getByRole('button', { name: 'Rozumiem' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
}

async function triggerOnboardingFinish(onboarding: Locator): Promise<void> {
  await onboarding.getByRole('button', { name: 'Zakończ' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
}

async function triggerTutorAvatar(page: Page): Promise<void> {
  await page.getByTestId('kangur-ai-tutor-avatar').evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
}

async function dragTutorAvatarToLocator(page: Page, target: Locator): Promise<void> {
  const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
  const [avatarBox, targetBox] = await Promise.all([tutorAvatar.boundingBox(), target.boundingBox()]);

  expect(avatarBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  if (!avatarBox || !targetBox) {
    return;
  }

  const avatarStartX = avatarBox.x + avatarBox.width / 2;
  const avatarStartY = avatarBox.y + avatarBox.height / 2;
  const targetCenterX = targetBox.x + targetBox.width / 2;
  const targetCenterY = targetBox.y + targetBox.height / 2;

  await page.mouse.move(avatarStartX, avatarStartY);
  await page.mouse.down();
  await page.mouse.move(targetCenterX, targetCenterY, { steps: 18 });
}

async function dismissHomeOnboardingIfVisible(page: Page): Promise<void> {
  const onboarding = page.getByTestId('kangur-ai-tutor-home-onboarding');

  if ((await onboarding.count()) === 0) {
    return;
  }

  await expect(onboarding).toBeVisible();
  await triggerOnboardingFinish(onboarding);
  await expect(onboarding).toHaveCount(0);
}

async function openDivisionQuestionFromGameHome(page: Page): Promise<string> {
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

const readHomeOnboardingStatus = async (page: Page): Promise<string | null> =>
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

async function expectTutorPanelWithinViewport(page: Page): Promise<void> {
  const viewportSize = page.viewportSize();
  const panelBox = await page.getByTestId('kangur-ai-tutor-panel').boundingBox();

  expect(viewportSize).not.toBeNull();
  expect(panelBox).not.toBeNull();

  if (!viewportSize || !panelBox) {
    return;
  }

  expect(panelBox.x).toBeGreaterThanOrEqual(0);
  expect(panelBox.y).toBeGreaterThanOrEqual(0);
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewportSize.width);
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(viewportSize.height);
}

async function expectLocatorsNotToOverlap(
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

async function expectLocatorsToOverlap(
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

async function expectGuidedArrowheadToStayAnchoredToAvatar(arrowhead: Locator): Promise<void> {
  const anchorLeft = Number(await arrowhead.getAttribute('data-guidance-anchor-avatar-left'));
  const anchorTop = Number(await arrowhead.getAttribute('data-guidance-anchor-avatar-top'));

  expect(anchorLeft).toBeGreaterThanOrEqual(0);
  expect(anchorLeft).toBeLessThanOrEqual(56);
  expect(anchorTop).toBeGreaterThanOrEqual(0);
  expect(anchorTop).toBeLessThanOrEqual(56);
}

async function expectGuidedArrowheadToTargetLocator(
  arrowhead: Locator,
  target: Locator
): Promise<void> {
  const targetBox = await target.boundingBox();
  const targetX = Number(await arrowhead.getAttribute('data-guidance-target-x'));
  const targetY = Number(await arrowhead.getAttribute('data-guidance-target-y'));

  expect(targetBox).not.toBeNull();

  if (!targetBox) {
    return;
  }

  expect(targetX).toBeGreaterThanOrEqual(targetBox.x);
  expect(targetX).toBeLessThanOrEqual(targetBox.x + targetBox.width);
  expect(targetY).toBeGreaterThanOrEqual(targetBox.y);
  expect(targetY).toBeLessThanOrEqual(targetBox.y + targetBox.height);
}

test.describe('Kangur AI Tutor', () => {
  test('advances Game home onboarding with Rozumiem and docks the tutor after Zakończ', async ({
    page,
  }) => {
    await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur');
    await expect(page.getByTestId('kangur-route-shell')).toBeVisible();
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();

    const onboarding = page.getByTestId('kangur-ai-tutor-home-onboarding');
    const avatar = page.getByTestId('kangur-ai-tutor-avatar');

    await expect(onboarding).toBeVisible();
    await expect(onboarding).toContainText('Krok 1 z 5');
    await expect(onboarding).toContainText('Tutaj wybierasz, jak chcesz zacząć.');
    await expect(onboarding.getByRole('button', { name: 'Rozumiem' })).toBeVisible();
    await expect(onboarding.getByRole('button', { name: 'Zakończ' })).toBeVisible();
    await expect(avatar).toHaveAttribute('data-avatar-placement', 'guided');
    await expect(avatar).toHaveAttribute('data-guidance-target', 'home_actions');

    await triggerOnboardingAcknowledge(onboarding);

    await expect(onboarding).toContainText('Krok 2 z 5');
    await expect(onboarding).toContainText('Tutaj pojawia się Twoja aktualna misja.');
    await expect(avatar).toHaveAttribute('data-guidance-target', 'home_quest');
    await expect.poll(() => readHomeOnboardingStatus(page)).toBe('shown');

    await triggerOnboardingFinish(onboarding);

    await expect(onboarding).toHaveCount(0);
    await expect(avatar).toHaveAttribute('data-avatar-placement', 'floating');
    await expect(avatar).toHaveAttribute('data-anchor-kind', 'dock');
    await expect.poll(() => readHomeOnboardingStatus(page)).toBe('dismissed');
  });

  test('completes Game home onboarding with Rozumiem, keeps it suppressed after reload, and allows replay', async ({
    page,
  }) => {
    await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur');
    await expect(page.getByTestId('kangur-route-shell')).toBeVisible();
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();

    const onboarding = page.getByTestId('kangur-ai-tutor-home-onboarding');
    const avatar = page.getByTestId('kangur-ai-tutor-avatar');

    await expect(onboarding).toBeVisible();
    await expect(onboarding).toContainText('Krok 1 z 5');

    await triggerOnboardingAcknowledge(onboarding);
    await expect(onboarding).toContainText('Krok 2 z 5');

    for (let attempt = 0; attempt < 6; attempt += 1) {
      if ((await onboarding.count()) === 0) {
        break;
      }
      await triggerOnboardingAcknowledge(onboarding);
    }

    await expect(onboarding).toHaveCount(0);
    await expect(avatar).toHaveAttribute('data-avatar-placement', 'floating');
    await expect(avatar).toHaveAttribute('data-anchor-kind', 'dock');
    await expect.poll(() => readHomeOnboardingStatus(page)).toBe('completed');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('kangur-route-shell')).toBeVisible();
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-home-onboarding')).toHaveCount(0);

    await triggerTutorAvatar(page);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-home-onboarding-replay')).toBeVisible();

    await page.getByTestId('kangur-ai-tutor-home-onboarding-replay').click();

    await expect(page.getByTestId('kangur-ai-tutor-home-onboarding')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-home-onboarding')).toContainText('Krok 1 z 5');
    const guidedAvatar = page.locator(
      '[data-testid="kangur-ai-tutor-avatar"][data-avatar-placement="guided"]'
    );
    await expect(guidedAvatar).toHaveAttribute(
      'data-avatar-placement',
      'guided'
    );
    await expect(guidedAvatar).toHaveAttribute(
      'data-guidance-target',
      'home_actions'
    );
    await expect.poll(() => readHomeOnboardingStatus(page)).toBe('shown');
  });

  test('reopens the tutor panel from the docked Game tutor avatar after closing onboarding', async ({
    page,
  }) => {
    await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur');
    await expect(page.getByTestId('kangur-route-shell')).toBeVisible();
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();

    const onboarding = page.getByTestId('kangur-ai-tutor-home-onboarding');
    const avatar = page.getByTestId('kangur-ai-tutor-avatar');

    await expect(onboarding).toBeVisible();
    await triggerOnboardingFinish(onboarding);

    await expect(onboarding).toHaveCount(0);
    await expect(avatar).toHaveAttribute('data-avatar-placement', 'floating');
    await expect(avatar).toHaveAttribute('data-anchor-kind', 'dock');
    await expect.poll(() => readHomeOnboardingStatus(page)).toBe('dismissed');

    await triggerTutorAvatar(page);

    await expect(page.getByTestId('kangur-ai-tutor-panel')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-composer-shell')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-composer-pills')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-home-onboarding-replay')).toBeVisible();
  });

  test('shows a top-bar restore action after hiding the tutor and reopens it from that action', async ({
    page,
  }) => {
    await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur');
    await expect(page.getByTestId('kangur-route-shell')).toBeVisible();
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();

    const onboarding = page.getByTestId('kangur-ai-tutor-home-onboarding');
    await expect(onboarding).toBeVisible();
    await triggerOnboardingFinish(onboarding);

    await expect(page.getByTestId('kangur-ai-tutor-home-onboarding')).toHaveCount(0);
    await triggerTutorAvatar(page);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toBeVisible();

    await page.getByRole('button', { name: 'Wyłącz AI Tutora' }).click();

    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveCount(0);

    const restoreButton = page.getByTestId('kangur-ai-tutor-restore');
    await expect(restoreButton).toBeVisible();
    await expect(restoreButton).toContainText('Włącz AI Tutora');

    await restoreButton.click();

    await expect(page.getByTestId('kangur-ai-tutor-restore')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toBeVisible();
  });

  test('keeps the restore action visible in the main nav after hiding the tutor on a narrow viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur');
    await expect(page.getByTestId('kangur-route-shell')).toBeVisible();
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();

    const onboarding = page.getByTestId('kangur-ai-tutor-home-onboarding');
    await expect(onboarding).toBeVisible();
    await triggerOnboardingFinish(onboarding);

    await triggerTutorAvatar(page);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toBeVisible();

    await page.getByRole('button', { name: 'Wyłącz AI Tutora' }).click();

    const restoreButton = page.getByTestId('kangur-ai-tutor-restore');
    await expect(restoreButton).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: /glowna nawigacja kangur/i })
    ).toContainText('Włącz AI Tutora');

    await restoreButton.click();

    await expect(page.getByTestId('kangur-ai-tutor-panel')).toBeVisible();
  });

  test('floats to selected lesson text and explains it automatically', async ({ page }) => {
    const {
      chatRequests,
      lessonTitle,
      lessonSelectedText,
      lessonResponse,
    } = await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur/lessons');
    await page.getByRole('button', { name: lessonTitle }).click();

    const selectedLessonBlock = page
      .locator('[data-testid^="lesson-text-block-"]')
      .filter({ hasText: lessonSelectedText })
      .first();
    await expect(selectedLessonBlock).toContainText(lessonSelectedText);

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await openTutorFromSelection(page);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    const tutorArrowhead = page.getByTestId('kangur-ai-tutor-guided-arrowhead');
    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');

    await expect(tutorAvatar).toHaveAttribute('data-guidance-target', 'selection_excerpt');
    await expect(tutorAvatar).toHaveAttribute('data-avatar-placement', 'guided');
    await expect(page.getByTestId('kangur-ai-tutor-selection-spotlight')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeVisible();
    await expect(tutorArrowhead).toBeVisible();
    await expectLocatorsToOverlap(tutorAvatar, tutorArrowhead);
    await expectLocatorsNotToOverlap(
      tutorAvatar,
      page.getByTestId('kangur-ai-tutor-selection-guided-callout')
    );
    await expectGuidedArrowheadToStayAnchoredToAvatar(tutorArrowhead);
    await expectGuidedArrowheadToTargetLocator(tutorArrowhead, selectedLessonBlock);
    await expectLocatorsNotToOverlap(
      page.getByTestId('kangur-ai-tutor-selection-guided-callout'),
      selectedLessonBlock.getByText(lessonSelectedText, { exact: true })
    );
    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toContainText(
      'Wyjaśniam ten fragment.'
    );
    await expect(page.getByTestId('kangur-ai-tutor-selection-action')).toHaveCount(0);

    await expect.poll(() => chatRequests.length).toBe(1);
    expect(chatRequests[0]?.context?.selectedText).toBe(lessonSelectedText);
    expect(chatRequests[0]?.context?.focusKind).toBe('selection');
    expect(chatRequests[0]?.context?.promptMode).toBe('selected_text');
    expect(chatRequests[0]?.context?.interactionIntent).toBe('explain');

    await expect(tutorPanel).toBeVisible();
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'selection');
    await expect(tutorAvatar).toHaveAttribute('data-avatar-placement', 'attached');
    await expect(tutorPanel).toHaveAttribute('data-avatar-placement', 'attached');
    await expect(tutorPanel).toHaveAttribute('data-has-pointer', 'true');
    await expect(tutorPanel).toHaveAttribute('data-pointer-side', 'left');
    await expect(page.getByTestId('kangur-ai-tutor-pointer')).toHaveAttribute(
      'data-pointer-side',
      'left'
    );
    await expect(tutorPanel).toHaveAttribute('data-launch-origin', 'dock-bottom-right');
    await waitForTutorPanelToSettle(tutorPanel);
    await expect(tutorPanel).toContainText(lessonSelectedText);
    await expect(page.getByTestId('kangur-ai-tutor-selected-text-preview')).toContainText(
      'Wyjaśniany fragment'
    );
    await expect(page.getByTestId('kangur-ai-tutor-selected-text-refocus')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Wróć do rozmowy' })).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-selection-context-spotlight')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-quick-action-selected-text')).toHaveCount(0);
    await expect(
      selectedLessonBlock.getByText(lessonSelectedText, { exact: true })
    ).toBeVisible();
    await expectTutorAvatarAttachedToPanel(page);
    await expectTutorPanelWithinViewport(page);
    await expect(tutorPanel).toContainText(lessonResponse);
  });

  test('rebinds a remembered tutor thread to the newly selected lesson fragment instead of resurfacing the old topic', async ({
    page,
  }) => {
    const {
      chatRequests,
      lessonResponse,
      lessonSelectedText,
      lessonTitle,
    } = await mockKangurTutorEnvironment(page, {
      chatResponseDelayMs: 500,
    });
    const staleReply = 'Pomagam dalej.';

    await gotoTutorRoute(page, '/kangur/lessons');
    await page.getByRole('button', { name: lessonTitle }).click();

    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');
    await triggerTutorAvatar(page);
    await expect(tutorPanel).toBeVisible();
    await tutorPanel.getByRole('textbox', { name: 'Wpisz pytanie' }).fill('Porozmawiajmy o czyms innym.');
    await tutorPanel.getByRole('button', { name: 'Wyślij' }).click();

    await expect.poll(() => chatRequests.length).toBe(1);
    expect(chatRequests[0]?.context?.surface).toBe('lesson');
    expect(chatRequests[0]?.context?.focusKind).toBeUndefined();
    await expect(tutorPanel).toContainText(staleReply);

    await page.mouse.click(24, 24);
    await expect(tutorPanel).toHaveCount(0);

    const selectedLessonBlock = page
      .locator('[data-testid^="lesson-text-block-"]')
      .filter({ hasText: lessonSelectedText })
      .first();
    await expect(selectedLessonBlock).toContainText(lessonSelectedText);

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await expect(page.getByTestId('kangur-ai-tutor-selection-action')).toBeVisible();

    await openTutorFromSelection(page);

    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-ask-modal')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-selected-text-preview')).toContainText(
      lessonSelectedText
    );
    await expect(page.getByTestId('kangur-ai-tutor-selected-text-pending-status')).toBeVisible();
    await expect(tutorPanel).not.toContainText(staleReply);

    await expect.poll(() => chatRequests.length).toBe(2);
    expect(chatRequests[1]?.context?.surface).toBe('lesson');
    expect(chatRequests[1]?.context?.selectedText).toBe(lessonSelectedText);
    expect(chatRequests[1]?.context?.focusKind).toBe('selection');

    await expect(tutorPanel).toContainText(lessonResponse);
    await expect(tutorPanel).not.toContainText(staleReply);
  });

  test('lets the learner drag the tutor onto a game section and starts explaining that section', async ({
    page,
  }) => {
    const { chatRequests, hintResponse } = await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur');
    await dismissHomeOnboardingIfVisible(page);
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible({ timeout: 15_000 });

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    const leaderboardShell = page.getByTestId('leaderboard-shell');

    await expect(tutorAvatar).toHaveAttribute('data-avatar-placement', 'floating');
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'dock');
    await expect(leaderboardShell).toBeVisible();

    await dragTutorAvatarToLocator(page, leaderboardShell);

    await expect(tutorAvatar).toHaveAttribute('data-drag-visual', 'ghost');
    await expect(page.getByTestId('kangur-ai-tutor-section-drop-highlight')).toBeVisible();

    await page.mouse.up();

    await expect(page.getByTestId('kangur-ai-tutor-section-drop-highlight')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-section-guided-callout')).toContainText(
      'Wyjaśniam sekcję: Ranking'
    );
    await expect(tutorAvatar).toHaveAttribute('data-avatar-placement', 'guided');
    await expect(tutorAvatar).toHaveAttribute('data-guidance-target', 'leaderboard');
    await expect(page.getByTestId('kangur-ai-tutor-guided-arrowhead')).toBeVisible();

    await expect.poll(() => chatRequests.length).toBe(1);
    expect(chatRequests[0]?.context?.surface).toBe('game');
    expect(chatRequests[0]?.context?.focusKind).toBe('leaderboard');
    expect(chatRequests[0]?.context?.focusId).toBe('kangur-game-home-leaderboard');
    expect(chatRequests[0]?.context?.focusLabel).toBe('Ranking');
    expect(chatRequests[0]?.context?.promptMode).toBe('explain');
    expect(chatRequests[0]?.context?.interactionIntent).toBe('explain');

    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');
    await expect(tutorPanel).toBeVisible();
    await waitForTutorPanelToSettle(tutorPanel);
    await expect(page.getByTestId('kangur-ai-tutor-section-preview')).toContainText(
      'Wyjaśniana sekcja'
    );
    await expect(page.getByTestId('kangur-ai-tutor-section-preview')).toContainText('Ranking');
    await expect(page.getByTestId('kangur-ai-tutor-section-context-spotlight')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-section-refocus')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Wróć do rozmowy' })).toBeVisible();
    await expect(tutorPanel).toContainText(hintResponse);
  });

  test('keeps the selection guidance arrow attached to the avatar on a narrow lesson viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { lessonTitle, lessonSelectedText } = await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur/lessons');
    await page.getByRole('button', { name: lessonTitle }).click();

    const selectedLessonBlock = page
      .locator('[data-testid^="lesson-text-block-"]')
      .filter({ hasText: lessonSelectedText })
      .first();
    await expect(selectedLessonBlock).toContainText(lessonSelectedText);

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await openTutorFromSelection(page);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    const tutorArrowhead = page.getByTestId('kangur-ai-tutor-guided-arrowhead');
    const guidedCallout = page.getByTestId('kangur-ai-tutor-selection-guided-callout');

    await expect(tutorAvatar).toHaveAttribute('data-avatar-placement', 'guided');
    await expect(tutorArrowhead).toBeVisible();
    await expect(guidedCallout).toBeVisible();
    await expectLocatorsToOverlap(tutorAvatar, tutorArrowhead);
    await expectGuidedArrowheadToStayAnchoredToAvatar(tutorArrowhead);
    await expectGuidedArrowheadToTargetLocator(tutorArrowhead, selectedLessonBlock);
    await expectLocatorsNotToOverlap(
      guidedCallout,
      selectedLessonBlock.getByText(lessonSelectedText, { exact: true })
    );
  });

  test('reads the lesson tutor modal text without narrating control labels', async ({ page }) => {
    await installKangurNarratorSpeechRecorder(page);
    const {
      lessonTitle,
      lessonSelectedText,
      lessonResponse,
    } = await mockKangurTutorEnvironment(page, {
      narratorEngine: 'client',
    });

    await gotoTutorRoute(page, '/kangur/lessons');
    await page.getByRole('button', { name: lessonTitle }).click();

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await openTutorFromSelection(page);

    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');
    await expect(tutorPanel).toContainText(lessonResponse);

    await tutorPanel.getByRole('button', { name: 'Czytaj' }).click();

    await expect
      .poll(async () => {
        const utterances = await readKangurNarratorSpeechLog(page);
        return utterances.at(-1) ?? '';
      })
      .toContain(lessonResponse);

    const spokenText = (await readKangurNarratorSpeechLog(page)).at(-1) ?? '';
    expect(spokenText).toContain(lessonSelectedText);
    expect(spokenText).not.toContain('Czytaj');
    expect(spokenText).not.toContain('Wyślij');
    expect(spokenText).not.toContain('Wróć do rozmowy');
    expect(spokenText).not.toContain('Pokaż fragment');
  });

  test('shows a proactive tutor nudge when selection opens through the avatar flow', async ({
    page,
  }) => {
    const {
      chatRequests,
      lessonTitle,
      lessonSelectedText,
      lessonResponse,
    } = await mockKangurTutorEnvironment(page, {
      proactiveNudges: 'gentle',
    });

    await gotoTutorRoute(page, '/kangur/lessons');
    await page.getByRole('button', { name: lessonTitle }).click();

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await triggerTutorAvatar(page);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');
    await expect(tutorPanel).toBeVisible();
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'dock');
    await expect(tutorPanel).toHaveAttribute('data-launch-origin', 'dock-bottom-right');
    await expect(tutorPanel).toHaveAttribute('data-placement-strategy', 'dock');
    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-selection-context-spotlight')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-proactive-nudge')).toHaveAttribute(
      'data-nudge-mode',
      'gentle'
    );
    await expect(page.getByTestId('kangur-ai-tutor-proactive-nudge')).toContainText(
      'Sugerowany pierwszy krok'
    );
    await expect(page.getByTestId('kangur-ai-tutor-proactive-nudge')).toContainText(
      'Ten fragment'
    );

    await page.getByTestId('kangur-ai-tutor-proactive-nudge-button').click();

    await expect.poll(() => chatRequests.length).toBe(1);
    expect(chatRequests[0]?.context?.selectedText).toBe(lessonSelectedText);
    expect(chatRequests[0]?.context?.promptMode).toBe('selected_text');
    expect(chatRequests[0]?.context?.interactionIntent).toBe('explain');
    await expect(tutorPanel).toContainText(lessonResponse);
  });

  test('keeps the uploaded tutor avatar image visible while the tutor is thinking', async ({
    page,
  }) => {
    const tutorPersonaImageUrl = '/uploads/agentcreator/personas/persona-mila/neutral/avatar.png';
    const {
      chatRequests,
      lessonTitle,
      lessonSelectedText,
      lessonResponse,
    } = await mockKangurTutorEnvironment(page, {
      tutorPersonaImageUrl,
      chatResponseDelayMs: 1_000,
    });

    await gotoTutorRoute(page, '/kangur/lessons');
    await page.getByRole('button', { name: lessonTitle }).click();

    await expect(
      page.getByTestId('kangur-ai-tutor-avatar-image').locator('img').first()
    ).toHaveAttribute('src', tutorPersonaImageUrl);

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await openTutorFromSelection(page);

    await expect(
      page.getByTestId('kangur-ai-tutor-avatar-image').locator('img').first()
    ).toHaveAttribute('src', tutorPersonaImageUrl);

    await expect(page.getByText('Myślę…')).toBeVisible();
    await expect.poll(() => chatRequests.length).toBe(1);
    await expect(
      page.getByTestId('kangur-ai-tutor-avatar-image').locator('img').first()
    ).toHaveAttribute('src', tutorPersonaImageUrl);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toContainText(lessonResponse);
    await expect(
      page.getByTestId('kangur-ai-tutor-avatar-image').locator('img').first()
    ).toHaveAttribute('src', tutorPersonaImageUrl);
  });

  test('shows the learner-specific tutor mood in the tutor modal header', async ({ page }) => {
    const {
      lessonTitle,
      lessonSelectedText,
    } = await mockKangurTutorEnvironment(page, {
      tutorLearnerMoodId: 'calm',
    });

    await gotoTutorRoute(page, '/kangur/lessons');
    await page.getByRole('button', { name: lessonTitle }).click();

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await openTutorFromSelection(page);

    await expect(page.getByTestId('kangur-ai-tutor-mood-chip')).toContainText(
      'Nastroj: Spokojny'
    );
    await expect(page.getByTestId('kangur-ai-tutor-mood-chip')).toHaveAttribute(
      'data-mood-id',
      'calm'
    );
    await expect(page.getByTestId('kangur-ai-tutor-mood-description')).toContainText(
      'Tutor obniza napiecie'
    );
  });

  test('hides proactive tutor nudges when parent settings disable them', async ({ page }) => {
    const {
      lessonTitle,
      lessonSelectedText,
    } = await mockKangurTutorEnvironment(page, {
      proactiveNudges: 'off',
    });

    await gotoTutorRoute(page, '/kangur/lessons');
    await page.getByRole('button', { name: lessonTitle }).click();

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await openTutorFromSelection(page);

    await expect(page.getByTestId('kangur-ai-tutor-panel')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-proactive-nudge')).toHaveCount(0);
  });

  test('closes the lesson tutor on outside click and re-docks the avatar', async ({ page }) => {
    const {
      chatRequests,
      lessonTitle,
      lessonSelectedText,
      lessonResponse,
    } = await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur/lessons');
    await page.getByRole('button', { name: lessonTitle }).click();

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await openTutorFromSelection(page);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');

    await expect(tutorPanel).toBeVisible();
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'selection');
    await expect.poll(() => chatRequests.length).toBe(1);
    await expect(tutorPanel).toContainText(lessonResponse);

    await page.mouse.click(24, 24);

    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'dock');
    await expect(page.getByTestId('kangur-ai-tutor-selection-action')).toHaveCount(0);
  });

  test('keeps the tutor docked in static mode while still using selected-text context', async ({
    page,
  }) => {
    const {
      chatRequests,
      lessonTitle,
      lessonSelectedText,
      lessonResponse,
    } = await mockKangurTutorEnvironment(page, {
      uiMode: 'static',
    });

    await gotoTutorRoute(page, '/kangur/lessons');
    await page.getByRole('button', { name: lessonTitle }).click();

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);

    await openTutorFromSelection(page);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');

    await expect(tutorPanel).toBeVisible();
    await expect(tutorAvatar).toHaveCount(0);
    await expect(tutorPanel).toHaveAttribute('data-ui-mode', 'static');
    await expect(tutorPanel).toHaveAttribute('data-avatar-placement', 'hidden');
    await expect(tutorPanel).toContainText(lessonSelectedText);

    await expect.poll(() => chatRequests.length).toBe(1);
    expect(chatRequests[0]?.context?.selectedText).toBe(lessonSelectedText);
    expect(chatRequests[0]?.context?.focusKind).toBe('selection');
    await expect(tutorPanel).toContainText(lessonResponse);
  });

  test('opens a regular docked tutor after entering a game question from Home and still sends question context', async ({
    page,
  }) => {
    const {
      chatRequests,
      hintResponse,
    } = await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur');
    await expect(page.getByTestId('kangur-route-shell')).toBeVisible();
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();

    const questionPrompt = await openDivisionQuestionFromGameHome(page);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    await triggerTutorAvatar(page);

    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');
    const questionAnchor = page.getByTestId('kangur-game-question-anchor');
    await expect(tutorPanel).toBeVisible();
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'dock');
    await expect(tutorAvatar).toHaveAttribute('data-avatar-placement', 'attached');
    await expect(tutorPanel).toHaveAttribute('data-avatar-placement', 'attached');
    await expect(tutorPanel).toHaveAttribute('data-launch-origin', 'dock-bottom-right');
    await expect(tutorPanel).toHaveAttribute('data-placement-strategy', 'dock');
    await expect(tutorPanel).toHaveAttribute('data-has-pointer', 'false');
    await waitForTutorPanelToSettle(tutorPanel);
    await expect(questionAnchor.getByRole('heading', { name: questionPrompt, exact: true })).toBeVisible();
    await expect(tutorPanel).toContainText('Poproś o wskazówkę do tego pytania.');
    await expect(tutorPanel.getByPlaceholder('Poproś o wskazówkę do pytania')).toBeVisible();
    await expectTutorAvatarAttachedToPanel(page);

    await tutorPanel.getByRole('button', { name: 'Podpowiedź' }).click();

    await expect.poll(() => chatRequests.length).toBe(1);
    expect(chatRequests[0]?.context?.surface).toBe('game');
    expect(chatRequests[0]?.context?.currentQuestion).toBe(questionPrompt);
    expect(chatRequests[0]?.context?.focusKind).toBe('question');
    await expect(tutorPanel).toContainText(hintResponse);
  });

  test('keeps the selection guidance arrow attached on highlighted game-question text', async ({
    page,
  }) => {
    const {
      chatRequests,
      hintResponse,
    } = await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur');
    await expect(page.getByTestId('kangur-route-shell')).toBeVisible();
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();

    const questionPrompt = await openDivisionQuestionFromGameHome(page);
    const questionAnchor = page.getByTestId('kangur-game-question-anchor');
    await expect(questionAnchor.getByRole('heading', { name: questionPrompt, exact: true })).toBeVisible();

    await selectTextInElement(page, '[data-testid="kangur-game-question-anchor"]', questionPrompt);
    await openTutorFromSelection(page);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    const tutorArrowhead = page.getByTestId('kangur-ai-tutor-guided-arrowhead');
    const guidedCallout = page.getByTestId('kangur-ai-tutor-selection-guided-callout');

    await expect(tutorAvatar).toHaveAttribute('data-guidance-target', 'selection_excerpt');
    await expect(tutorArrowhead).toBeVisible();
    await expect(guidedCallout).toBeVisible();
    await expectLocatorsToOverlap(tutorAvatar, tutorArrowhead);
    await expectGuidedArrowheadToStayAnchoredToAvatar(tutorArrowhead);
    await expectGuidedArrowheadToTargetLocator(tutorArrowhead, questionAnchor);
    await expectLocatorsNotToOverlap(
      guidedCallout,
      questionAnchor.getByRole('heading', { name: questionPrompt, exact: true })
    );

    await expect.poll(() => chatRequests.length).toBe(1);
    expect(chatRequests[0]?.context?.surface).toBe('game');
    expect(chatRequests[0]?.context?.selectedText).toBe(questionPrompt);
    expect(chatRequests[0]?.context?.focusKind).toBe('selection');
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toContainText(hintResponse);
  });

  test('shows the tutor on active game questions and sends game context', async ({ page }) => {
    const {
      chatRequests,
      hintResponse,
    } = await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(
      page,
      '/kangur/game?quickStart=operation&operation=division&difficulty=easy'
    );

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');

    await expect(page.getByTestId('question-card-shell')).toBeVisible();
    await expect(tutorAvatar).toBeVisible();

    await triggerTutorAvatar(page);

    await expect(tutorPanel).toBeVisible();
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'dock');
    await expect(tutorPanel).toHaveAttribute('data-launch-origin', 'dock-bottom-right');
    await expect(tutorPanel).toHaveAttribute('data-placement-strategy', 'dock');
    await expect(tutorPanel).toHaveAttribute('data-has-pointer', 'false');
    await expect(tutorPanel).toContainText('Poproś o wskazówkę do tego pytania.');
    await expect(page.getByTestId('kangur-ai-tutor-focus-chip')).toHaveCount(0);

    await tutorPanel.getByRole('button', { name: 'Podpowiedź' }).click();

    await expect.poll(() => chatRequests.length).toBe(1);
    expect(chatRequests[0]?.context?.surface).toBe('game');
    expect(chatRequests[0]?.context?.currentQuestion).toBeTruthy();
    expect(chatRequests[0]?.context?.focusKind).toBe('question');
    await expect(tutorPanel).toContainText(hintResponse);
  });

  test('closes the active game-question tutor on outside click and re-docks the avatar', async ({
    page,
  }) => {
    await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur');
    await expect(page.getByTestId('kangur-route-shell')).toBeVisible();
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await openDivisionQuestionFromGameHome(page);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    await triggerTutorAvatar(page);

    await expect(page.getByTestId('kangur-ai-tutor-panel')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toContainText('Gra: Pytanie do rozwiazania');

    await page.mouse.click(24, 24);

    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'dock');
  });

  test('restores the lesson thread after navigating through a game question and reopening the tutor', async ({
    page,
  }) => {
    const {
      chatRequests,
      lessonTitle,
      lessonSelectedText,
      lessonResponse,
    } = await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur/lessons');
    await page.getByRole('button', { name: lessonTitle }).click();
    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    await triggerTutorAvatar(page);
    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');

    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'dock');
    await expect(tutorPanel).toHaveAttribute('data-launch-origin', 'dock-bottom-right');
    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-selection-context-spotlight')).toHaveCount(0);
    await page.getByTestId('kangur-ai-tutor-quick-action-selected-text').evaluate((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error('Missing selected-text quick action button.');
      }
      button.click();
    });

    await expect.poll(() => chatRequests.length).toBe(1);
    await expect(tutorPanel).toContainText(lessonResponse);

    await page.getByTestId('kangur-primary-nav-home').click({ force: true });
    await expect(page).toHaveURL(/\/kangur$/);
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);

    await openDivisionQuestionFromGameHome(page);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'dock');
    await triggerTutorAvatar(page);
    await expect(tutorPanel).toBeVisible();
    await expect(tutorPanel).toContainText('Poproś o wskazówkę do tego pytania.');
    await expect(tutorPanel).not.toContainText(lessonResponse);
    await expect(page.getByTestId('kangur-ai-tutor-context-switch')).toHaveCount(0);

    await page.getByTestId('kangur-primary-nav-lessons').click({ force: true });
    await expect(page).toHaveURL(/\/kangur\/lessons/);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);

    await page.getByRole('button', { name: lessonTitle }).click();
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'dock');
    await triggerTutorAvatar(page);
    await expect(tutorPanel).toBeVisible();
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'dock');
    await expect(page.getByTestId('kangur-ai-tutor-context-switch')).toHaveCount(0);
    await expect(tutorPanel).toContainText(lessonResponse);
    expect(chatRequests).toHaveLength(1);
  });

  test('does not restore the prior thread when cross-page persistence is disabled', async ({
    page,
  }) => {
    const {
      chatRequests,
      lessonTitle,
      lessonSelectedText,
      lessonResponse,
    } = await mockKangurTutorEnvironment(page, {
      allowCrossPagePersistence: false,
    });

    await gotoTutorRoute(page, '/kangur/lessons');
    await page.getByRole('button', { name: lessonTitle }).click();
    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);

    await openTutorFromSelection(page);

    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');

    await expect(tutorPanel).toBeVisible();
    await expect.poll(() => chatRequests.length).toBe(1);
    await expect(tutorPanel).toContainText(lessonResponse);

    await page.getByTestId('kangur-primary-nav-home').click({ force: true });
    await expect(page).toHaveURL(/\/kangur$/);
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);

    await openDivisionQuestionFromGameHome(page);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    const gameTutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    await expect(gameTutorAvatar).toHaveAttribute('data-anchor-kind', 'dock');

    await page.getByTestId('kangur-primary-nav-lessons').click({ force: true });
    await expect(page).toHaveURL(/\/kangur\/lessons/);
    await page.getByRole('button', { name: lessonTitle }).click();
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);

    await triggerTutorAvatar(page);
    await expect(tutorPanel).toBeVisible();
    await expect(tutorPanel).not.toContainText(lessonResponse);
    await expect(page.getByTestId('kangur-ai-tutor-context-switch')).toHaveCount(0);
    expect(chatRequests).toHaveLength(1);
  });
});
