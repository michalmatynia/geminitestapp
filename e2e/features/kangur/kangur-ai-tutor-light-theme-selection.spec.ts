import { expect, test, type Page } from '@playwright/test';

import { mockKangurTutorEnvironment, selectTextInElement } from '../../support/kangur-tutor-fixtures';

async function openTutorFromSelection(page: Page): Promise<void> {
  const selectionAction = page.getByTestId('kangur-ai-tutor-selection-action');
  await selectionAction.waitFor({ state: 'visible', timeout: 1_500 });
  await selectionAction.getByRole('button', { name: 'Zapytaj o to' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
}

test.describe('Kangur AI Tutor Light Theme Selection', () => {
  test('uses a subtle animated gradient for selected text in light mode', async ({ page }) => {
    const { lessonSelectedText, lessonTitle } = await mockKangurTutorEnvironment(page);

    await page.goto('/kangur/lessons', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-kangur-appearance="default"]').first()).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.body.getAttribute('data-kangur-appearance-mode')))
      .toBe('default');

    await page.getByRole('button', { name: lessonTitle }).click();

    const selectedLessonBlock = page
      .locator('[data-testid^="lesson-text-block-"]')
      .filter({ hasText: lessonSelectedText })
      .first();
    await expect(selectedLessonBlock).toContainText(lessonSelectedText);

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await openTutorFromSelection(page);

    await expect(
      page.locator('[data-kangur-ai-tutor-selection-emphasis="gradient"]')
    ).toHaveCount(1);

    const selectionGradient = await page.evaluate(() => {
      const element = document.querySelector('[data-kangur-ai-tutor-selection-emphasis="gradient"]');
      if (!(element instanceof HTMLElement)) {
        return null;
      }

      const style = window.getComputedStyle(element);
      return {
        animationName: style.animationName,
        backgroundImage: style.backgroundImage,
        gradientEnd: style.getPropertyValue('--kangur-ai-tutor-selection-gradient-end').trim(),
        gradientFallback: style
          .getPropertyValue('--kangur-ai-tutor-selection-gradient-fallback')
          .trim(),
      };
    });

    expect(selectionGradient).toEqual(
      expect.objectContaining({
        animationName: expect.not.stringMatching(/^none$/),
        backgroundImage: expect.stringContaining('gradient'),
      })
    );
    expect(selectionGradient?.gradientFallback).toContain('#324055');
    expect(selectionGradient?.gradientFallback).toContain('rgb(146 64 14)');
    expect(selectionGradient?.gradientFallback).not.toContain('#fde68a');
    expect(selectionGradient?.gradientFallback).not.toContain('#fcd34d');
    expect(selectionGradient?.gradientFallback).not.toContain('#f59e0b');
    expect(selectionGradient?.gradientEnd).toContain('#324055');
    expect(selectionGradient?.gradientEnd).toContain('rgb(180 83 9)');
    expect(selectionGradient?.gradientEnd).not.toBe('#f59e0b');
  });
});
