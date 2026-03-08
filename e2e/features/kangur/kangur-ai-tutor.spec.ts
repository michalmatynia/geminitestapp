import { expect, test, type Page } from '@playwright/test';

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

    const lessonTextBlock = page.locator('[data-testid^="lesson-text-block-"]').first();
    await expect(lessonTextBlock).toContainText(lessonSelectedText);

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    await tutorAvatar.click();

    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');

    await expect(tutorPanel).toBeVisible();
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'selection');
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
    await expect(tutorAvatar).toHaveAttribute('data-ui-mode', 'static');
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'dock');
    await expect(tutorPanel).toHaveAttribute('data-ui-mode', 'static');
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
    await expect(tutorPanel).toBeVisible();
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'question');
    await expect(page.getByText(questionPrompt)).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-focus-chip')).toContainText('Aktualne pytanie');

    await tutorPanel.getByRole('button', { name: 'Podpowiedz' }).click();

    await expect.poll(() => chatRequests.length).toBe(1);
    expect(chatRequests[0]?.context?.currentQuestion).toBe(questionPrompt);
    expect(chatRequests[0]?.context?.focusKind).toBe('question');
    await expect(tutorPanel).toContainText(hintResponse);
  });

  test('restores the lesson thread after client-side navigation to tests and back', async ({
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

    await page.getByRole('button', { name: suiteTitle }).click();
    await expect(tutorPanel).toBeVisible();
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'question');
    await expect(page.getByTestId('kangur-ai-tutor-context-switch')).toContainText(
      'Nowe miejsce pomocy'
    );

    await page.getByTestId('kangur-primary-nav-lessons').click({ force: true });
    await expect(page).toHaveURL(/\/kangur\/lessons/);

    await page.getByRole('button', { name: lessonTitle }).click();
    await expect(tutorPanel).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-context-switch')).toContainText(
      'Nowe miejsce pomocy'
    );
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
