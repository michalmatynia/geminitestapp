import { expect, test } from '@playwright/test';

test.describe('Master Folder Tree shell runtime lifecycle (Phase 3)', () => {
  test('preserves keyboard navigation after tab background/resume and route remount churn', async ({
    page,
    context,
  }) => {
    const dispatchWindowKey = async (key: string): Promise<void> => {
      await page.evaluate((inputKey: string) => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: inputKey,
            bubbles: true,
          })
        );
      }, key);
    };

    await page.goto('/preview/foldertree-shell-runtime', { waitUntil: 'networkidle' });

    const runtimeState = page.getByTestId('runtime-instance-ids');

    await expect(runtimeState).toHaveAttribute('data-instance-ids', 'preview_shell_alpha');
    await expect(runtimeState).toHaveAttribute('data-focused-instance', 'preview_shell_alpha');
    await expect(runtimeState).toHaveAttribute('data-selected-node-id', 'alpha-folder-a');

    await dispatchWindowKey('ArrowDown');
    await expect(runtimeState).toHaveAttribute('data-last-keyboard-key', 'ArrowDown');
    await expect(runtimeState).toHaveAttribute('data-selected-node-id', 'alpha-folder-b');

    const backgroundTab = await context.newPage();
    await backgroundTab.goto('about:blank');
    await backgroundTab.bringToFront();
    await page.bringToFront();

    await dispatchWindowKey('ArrowDown');
    await expect(runtimeState).toHaveAttribute('data-selected-node-id', 'alpha-folder-c');

    await page.getByTestId('route-beta').click();
    await expect(runtimeState).toHaveAttribute('data-instance-ids', 'preview_shell_beta');
    await expect(runtimeState).toHaveAttribute('data-focused-instance', 'preview_shell_beta');
    await expect(runtimeState).toHaveAttribute('data-selected-node-id', 'beta-folder-a');

    await dispatchWindowKey('ArrowDown');
    await expect(runtimeState).toHaveAttribute('data-selected-node-id', 'beta-folder-b');

    await page.getByTestId('route-alpha').click();
    await expect(runtimeState).toHaveAttribute('data-instance-ids', 'preview_shell_alpha');
    await expect(runtimeState).toHaveAttribute('data-focused-instance', 'preview_shell_alpha');
    await expect(runtimeState).toHaveAttribute('data-selected-node-id', 'alpha-folder-a');

    await dispatchWindowKey('ArrowDown');
    await expect(runtimeState).toHaveAttribute('data-selected-node-id', 'alpha-folder-b');

    await backgroundTab.close();
  });
});
