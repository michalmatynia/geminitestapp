import { expect, test } from '@playwright/test';

import {
  mockKangurTutorEnvironment,
  selectTextInElement,
} from '../../support/kangur-tutor-fixtures';

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

    const lessonTextBlock = page.locator("[data-testid^='lesson-text-block-']").first();
    await expect(lessonTextBlock).toContainText(lessonSelectedText);

    await selectTextInElement(page, "[data-testid^='lesson-text-block-']", lessonSelectedText);

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
    await selectTextInElement(page, "[data-testid^='lesson-text-block-']", lessonSelectedText);

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
});
