import { expect, test } from '@playwright/test';

test.describe('Master Folder Tree shell runtime lifecycle (Phase 3)', () => {
  test('preserves keyboard navigation after tab background/resume and route remount churn', async ({
    page,
    context,
  }) => {
    await page.goto('/preview/foldertree-shell-runtime', { waitUntil: 'networkidle' });

    const runtimeState = page.getByTestId('runtime-instance-ids');

    await expect(page.getByTestId('node-alpha-folder-a')).toHaveAttribute('data-selected', 'true');
    await expect(runtimeState).toHaveAttribute('data-instance-ids', 'preview_shell_alpha');
    await expect(runtimeState).toHaveAttribute('data-focused-instance', 'preview_shell_alpha');

    await page.keyboard.press('ArrowDown');
    await expect(page.getByTestId('node-alpha-folder-b')).toHaveAttribute('data-selected', 'true');

    const backgroundTab = await context.newPage();
    await backgroundTab.goto('about:blank');
    await backgroundTab.bringToFront();
    await expect.poll(() => page.evaluate(() => document.visibilityState)).toBe('hidden');

    await page.bringToFront();
    await expect.poll(() => page.evaluate(() => document.visibilityState)).toBe('visible');

    await page.keyboard.press('ArrowDown');
    await expect(page.getByTestId('node-alpha-folder-c')).toHaveAttribute('data-selected', 'true');

    await page.getByTestId('route-beta').click();
    await expect(page.getByTestId('node-beta-folder-a')).toHaveAttribute('data-selected', 'true');
    await expect(runtimeState).toHaveAttribute('data-instance-ids', 'preview_shell_beta');
    await expect(runtimeState).toHaveAttribute('data-focused-instance', 'preview_shell_beta');

    await page.keyboard.press('ArrowDown');
    await expect(page.getByTestId('node-beta-folder-b')).toHaveAttribute('data-selected', 'true');

    await page.getByTestId('route-alpha').click();
    await expect(page.getByTestId('node-alpha-folder-a')).toHaveAttribute('data-selected', 'true');
    await expect(runtimeState).toHaveAttribute('data-instance-ids', 'preview_shell_alpha');
    await expect(runtimeState).toHaveAttribute('data-focused-instance', 'preview_shell_alpha');

    await page.keyboard.press('ArrowDown');
    await expect(page.getByTestId('node-alpha-folder-b')).toHaveAttribute('data-selected', 'true');

    await backgroundTab.close();
  });
});
