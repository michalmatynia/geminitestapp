import { expect, test, type Locator, type Page } from '@playwright/test';

import { KANGUR_AI_TUTOR_HOME_ONBOARDING_STORAGE_KEY } from '@/features/kangur/ui/components/KangurAiTutorWidget.shared';

import {
  mockKangurTutorEnvironment,
  selectTextInElement,
} from '../../support/kangur-tutor-fixtures';

async function openTutorFromSelection(page: Page): Promise<void> {
  const selectionAction = page.getByTestId('kangur-ai-tutor-selection-action');
  if (await selectionAction.count()) {
    await expect(selectionAction).toBeVisible();
    await selectionAction.getByRole('button', { name: 'Zapytaj o to' }).click();
    return;
  }

  await page.getByTestId('kangur-ai-tutor-avatar').click();
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

async function triggerTutorAvatar(page: Page): Promise<void> {
  await page.getByTestId('kangur-ai-tutor-avatar').evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
}

async function triggerAskModalBackdrop(page: Page): Promise<void> {
  await page.getByTestId('kangur-ai-tutor-ask-modal-backdrop').evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
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
    await expect(onboarding).toContainText('Tutaj wybierasz, jak chcesz zaczac.');
    await expect(onboarding.getByRole('button', { name: 'Rozumiem' })).toBeVisible();
    await expect(onboarding.getByRole('button', { name: 'Zakończ' })).toBeVisible();
    await expect(avatar).toHaveAttribute('data-avatar-placement', 'guided');
    await expect(avatar).toHaveAttribute('data-guidance-target', 'home_actions');

    await onboarding.getByRole('button', { name: 'Rozumiem' }).click();

    await expect(onboarding).toContainText('Krok 2 z 5');
    await expect(onboarding).toContainText('Tutaj pojawia sie Twoja aktualna misja.');
    await expect(avatar).toHaveAttribute('data-guidance-target', 'home_quest');
    await expect.poll(() => readHomeOnboardingStatus(page)).toBe('shown');

    await onboarding.getByRole('button', { name: 'Zakończ' }).click();

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

  test('reopens the lightweight prompt from the docked Game tutor avatar after closing it', async ({
    page,
  }) => {
    await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur');
    await expect(page.getByTestId('kangur-route-shell')).toBeVisible();
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();

    const onboarding = page.getByTestId('kangur-ai-tutor-home-onboarding');
    const avatar = page.getByTestId('kangur-ai-tutor-avatar');

    await expect(onboarding).toBeVisible();
    await onboarding.getByRole('button', { name: 'Zakończ' }).click();

    await expect(onboarding).toHaveCount(0);
    await expect(avatar).toHaveAttribute('data-avatar-placement', 'floating');
    await expect(avatar).toHaveAttribute('data-anchor-kind', 'dock');
    await expect.poll(() => readHomeOnboardingStatus(page)).toBe('dismissed');

    await triggerTutorAvatar(page);

    const launcherPrompt = page.getByTestId('kangur-ai-tutor-launcher-prompt');
    await expect(launcherPrompt).toBeVisible();
    await expect(launcherPrompt).toContainText('How could I help you today?');
    await expect(launcherPrompt.getByRole('button', { name: 'Zapytaj' })).toBeVisible();

    await launcherPrompt.getByTestId('kangur-ai-tutor-launcher-prompt-close').click();

    await expect(launcherPrompt).toHaveCount(0);
    await expect(avatar).toBeVisible();

    await triggerTutorAvatar(page);

    await expect(launcherPrompt).toBeVisible();

    await launcherPrompt.getByRole('button', { name: 'Zapytaj' }).click();

    await expect(page.getByTestId('kangur-ai-tutor-ask-modal')).toBeVisible();

    await triggerAskModalBackdrop(page);

    await expect(page.getByTestId('kangur-ai-tutor-ask-modal')).toHaveCount(0);
    await expect(launcherPrompt).toBeVisible();
    await expect(launcherPrompt).toContainText('How could I help you today?');
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
    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');

    await expect(tutorAvatar).toHaveAttribute('data-guidance-target', 'selection_excerpt');
    await expect(tutorAvatar).toHaveAttribute('data-avatar-placement', 'guided');
    await expect(page.getByTestId('kangur-ai-tutor-selection-spotlight')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeVisible();
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
    await page.getByTestId('kangur-ai-tutor-avatar').click();

    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');
    await expect(tutorPanel).toBeVisible();
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
      page.getByTestId('kangur-ai-tutor-header-avatar-image').locator('img')
    ).toHaveAttribute('src', tutorPersonaImageUrl);

    await expect(page.getByText('Myślę…')).toBeVisible();
    await expect.poll(() => chatRequests.length).toBe(1);
    await expect(
      page.getByTestId('kangur-ai-tutor-header-avatar-image').locator('img')
    ).toHaveAttribute('src', tutorPersonaImageUrl);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toContainText(lessonResponse);
    await expect(
      page.getByTestId('kangur-ai-tutor-header-avatar-image').locator('img')
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

  test('anchors to the active test question and sends question context', async ({ page }) => {
    const {
      chatRequests,
      suiteTitle,
      questionPrompt,
      hintResponse,
    } = await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur/tests');
    await page.getByRole('button', { name: suiteTitle }).click();

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    await tutorAvatar.click();

    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');
    const questionAnchor = page.getByTestId('kangur-test-question-anchor');
    await expect(tutorPanel).toBeVisible();
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'question');
    await expect(tutorAvatar).toHaveAttribute('data-avatar-placement', 'attached');
    await expect(tutorPanel).toHaveAttribute('data-avatar-placement', 'attached');
    await expect(tutorPanel).toHaveAttribute('data-launch-origin', 'dock-bottom-right');
    await waitForTutorPanelToSettle(tutorPanel);
    await expect(questionAnchor.getByText(questionPrompt, { exact: true })).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-focus-chip')).toContainText('Aktualne pytanie');
    await expectTutorAvatarAttachedToPanel(page);
    await expectTutorPanelWithinViewport(page);
    await expectLocatorsNotToOverlap(tutorPanel, questionAnchor);

    await tutorPanel.getByRole('button', { name: 'Podpowiedz' }).click();

    await expect.poll(() => chatRequests.length).toBe(1);
    expect(chatRequests[0]?.context?.currentQuestion).toBe(questionPrompt);
    expect(chatRequests[0]?.context?.focusKind).toBe('question');
    await expect(tutorPanel).toContainText(hintResponse);
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

    await tutorAvatar.click();

    await expect(tutorPanel).toBeVisible();
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'question');
    await expect(page.getByTestId('kangur-ai-tutor-focus-chip')).toContainText('Aktualne pytanie');

    await tutorPanel.getByRole('button', { name: 'Podpowiedz' }).click();

    await expect.poll(() => chatRequests.length).toBe(1);
    expect(chatRequests[0]?.context?.surface).toBe('game');
    expect(chatRequests[0]?.context?.currentQuestion).toBeTruthy();
    expect(chatRequests[0]?.context?.focusKind).toBe('question');
    await expect(tutorPanel).toContainText(hintResponse);
  });

  test('closes the test tutor on outside click and re-docks the avatar', async ({ page }) => {
    const {
      suiteTitle,
    } = await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur/tests');
    await page.getByRole('button', { name: suiteTitle }).click();

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    await tutorAvatar.click();

    await expect(page.getByTestId('kangur-ai-tutor-panel')).toBeVisible();
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'question');

    await page.mouse.click(24, 24);

    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'dock');
  });

  test('restores the lesson thread after client-side navigation when reopened', async ({
    page,
  }) => {
    const {
      chatRequests,
      lessonTitle,
      lessonSelectedText,
      lessonResponse,
      suiteTitle,
    } = await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur/lessons');
    await page.getByRole('button', { name: lessonTitle }).click();
    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    await tutorAvatar.click();
    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');

    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'selection');
    await page.getByTestId('kangur-ai-tutor-quick-action-selected-text').evaluate((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error('Missing selected-text quick action button.');
      }
      button.click();
    });

    await expect.poll(() => chatRequests.length).toBe(1);
    await expect(tutorPanel).toContainText(lessonResponse);

    await page.getByTestId('kangur-primary-nav-tests').click({ force: true });
    await expect(page).toHaveURL(/\/kangur\/tests/);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);

    await page.getByRole('button', { name: suiteTitle }).click();
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'dock');
    await tutorAvatar.click();
    await expect(tutorPanel).toBeVisible();
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'question');
    await expect(tutorPanel).not.toContainText(lessonResponse);
    await expect(page.getByTestId('kangur-ai-tutor-context-switch')).toHaveCount(0);

    await page.getByTestId('kangur-primary-nav-lessons').click({ force: true });
    await expect(page).toHaveURL(/\/kangur\/lessons/);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);

    await page.getByRole('button', { name: lessonTitle }).click();
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'dock');
    await tutorAvatar.click();
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
      suiteTitle,
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

    await page.getByTestId('kangur-primary-nav-tests').click({ force: true });
    await expect(page).toHaveURL(/\/kangur\/tests/);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveCount(0);

    await page.getByRole('button', { name: suiteTitle }).click();
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    const suiteTutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    await expect(suiteTutorAvatar).toHaveAttribute('data-anchor-kind', 'dock');

    await page.getByTestId('kangur-primary-nav-lessons').click({ force: true });
    await expect(page).toHaveURL(/\/kangur\/lessons/);
    await page.getByRole('button', { name: lessonTitle }).click();
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);

    const lessonTutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    await lessonTutorAvatar.click();
    await expect(tutorPanel).toBeVisible();
    await expect(tutorPanel).not.toContainText(lessonResponse);
    await expect(page.getByTestId('kangur-ai-tutor-context-switch')).toHaveCount(0);
    expect(chatRequests).toHaveLength(1);
  });
});
