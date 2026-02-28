import { test, expect } from '@playwright/test';

test.describe('Chatbot UI', () => {
  test('shows the chatbot page and tabs', async ({ page }) => {
    await page.goto('/admin/chatbot');

    await expect(page.getByRole('tab', { name: 'Chat' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Settings' })).toBeVisible();
    await expect(page.getByPlaceholder('Type your message...')).toBeVisible();
  });

  test('toggles tools in settings tab', async ({ page }) => {
    await page.goto('/admin/chatbot');

    await page.getByRole('tab', { name: 'Settings' }).click();

    await expect(page.getByText('General Settings')).toBeVisible();

    const localContextCheckbox = page.getByLabel('Use Local Context');
    await expect(localContextCheckbox).toBeVisible();

    // Check if it can be toggled
    const isChecked = await localContextCheckbox.isChecked();
    await localContextCheckbox.click();
    expect(await localContextCheckbox.isChecked()).toBe(!isChecked);
  });

  test('should send a message and receive a response', async ({ page }) => {
    await page.goto('/admin/chatbot');
    const messageInput = page.getByPlaceholder('Type your message...');
    await expect(messageInput).toBeVisible();

    const userMessage = 'Hello AI!';
    await messageInput.fill(userMessage);
    await page.getByRole('button', { name: 'Send' }).click();

    // Verify user message appears in chat history
    await expect(page.locator('.message').filter({ hasText: userMessage }).last()).toBeVisible();

    // Verify AI response appears (or at least a typing indicator/placeholder)
    // This is tricky as AI response time can vary. We'll check for a message bubble that is NOT the user's.
    await expect(
      page
        .locator('.message')
        .filter({ hasText: /^(?!.*Hello AI!)/ })
        .last()
    ).toBeVisible({ timeout: 15000 }); // Wait for an AI response to appear

    // Verify conversation history (e.g., number of messages or content)
    const messages = page.locator('.message');
    await expect(messages).toHaveCount(2); // Expecting user message + AI response
  });
});
