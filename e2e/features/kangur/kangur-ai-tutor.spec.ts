import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  mockKangurTutorEnvironment,
  selectTextInElement,
} from '../../support/kangur-tutor-fixtures';

async function clickSelectionTutorCta(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Zapytaj o to' }).evaluate((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Missing tutor selection CTA button.');
    }
    button.click();
  });
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
  test('anchors to selected lesson text and sends selected-text context', async ({ page }) => {
    const {
      chatRequests,
      lessonTitle,
      lessonSelectedText,
      lessonResponse,
    } = await mockKangurTutorEnvironment(page);

    await page.goto('/kangur/lessons');
    await page.getByRole('button', { name: lessonTitle }).click();

    const selectedLessonBlock = page
      .locator('[data-testid^="lesson-text-block-"]')
      .filter({ hasText: lessonSelectedText })
      .first();
    await expect(selectedLessonBlock).toContainText(lessonSelectedText);

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await clickSelectionTutorCta(page);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');

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
    await expect(
      selectedLessonBlock.getByText(lessonSelectedText, { exact: true })
    ).toBeVisible();
    await expectTutorAvatarAttachedToPanel(page);
    await expectTutorPanelWithinViewport(page);

    await page.getByTestId('kangur-ai-tutor-quick-action-selected-text').evaluate((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error('Missing selected-text quick action button.');
      }
      button.click();
    });

    await expect.poll(() => chatRequests.length).toBe(1);
    expect(chatRequests[0]?.context?.selectedText).toBe(lessonSelectedText);
    expect(chatRequests[0]?.context?.focusKind).toBe('selection');
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

    await page.goto('/kangur/lessons');
    await page.getByRole('button', { name: lessonTitle }).click();

    await expect(
      page.getByTestId('kangur-ai-tutor-avatar-image').locator('img').first()
    ).toHaveAttribute('src', tutorPersonaImageUrl);

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await clickSelectionTutorCta(page);

    await expect(
      page.getByTestId('kangur-ai-tutor-header-avatar-image').locator('img')
    ).toHaveAttribute('src', tutorPersonaImageUrl);

    await page.getByTestId('kangur-ai-tutor-quick-action-selected-text').evaluate((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error('Missing selected-text quick action button.');
      }
      button.click();
    });

    await expect(page.getByText('Myślę…')).toBeVisible();
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

    await page.goto('/kangur/lessons');
    await page.getByRole('button', { name: lessonTitle }).click();

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await clickSelectionTutorCta(page);

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

  test('closes the lesson tutor on outside click and re-docks the avatar', async ({ page }) => {
    const {
      chatRequests,
      lessonTitle,
      lessonSelectedText,
      lessonResponse,
    } = await mockKangurTutorEnvironment(page);

    await page.goto('/kangur/lessons');
    await page.getByRole('button', { name: lessonTitle }).click();

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await clickSelectionTutorCta(page);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');

    await expect(tutorPanel).toBeVisible();
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'selection');

    await page.getByTestId('kangur-ai-tutor-quick-action-selected-text').evaluate((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error('Missing selected-text quick action button.');
      }
      button.click();
    });

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

    await page.goto('/kangur/lessons');
    await page.getByRole('button', { name: lessonTitle }).click();

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);

    await clickSelectionTutorCta(page);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');

    await expect(tutorPanel).toBeVisible();
    await expect(tutorAvatar).toHaveCount(0);
    await expect(tutorPanel).toHaveAttribute('data-ui-mode', 'static');
    await expect(tutorPanel).toHaveAttribute('data-avatar-placement', 'hidden');
    await expect(tutorPanel).toContainText(lessonSelectedText);

    await page.getByTestId('kangur-ai-tutor-quick-action-selected-text').evaluate((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error('Missing selected-text quick action button.');
      }
      button.click();
    });

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

    await page.goto('/kangur/tests');
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

    await page.goto('/kangur/game?quickStart=operation&operation=division&difficulty=easy');

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

    await page.goto('/kangur/tests');
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

    await page.goto('/kangur/lessons');
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

    await page.goto('/kangur/lessons');
    await page.getByRole('button', { name: lessonTitle }).click();
    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);

    await clickSelectionTutorCta(page);

    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');

    await expect(tutorPanel).toBeVisible();
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
