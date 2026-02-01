import { test, expect } from '@playwright/test';

test.describe('Front Manage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/front-manage');
  });

  test('should display front manage page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Front Manage', exact: true })).toBeVisible();
    await expect(page.getByText('Pick which app should open when users land on the home page.')).toBeVisible();
  });

  test('should allow selecting a front page option', async ({ page }) => {
    // Options: Products, Chatbot, Notes
    const productsBtn = page.getByRole('button', { name: /Products/ });
    const chatbotBtn = page.getByRole('button', { name: /Chatbot/ });
    const notesBtn = page.getByRole('button', { name: /Notes/ });

    await expect(productsBtn).toBeVisible();
    await expect(chatbotBtn).toBeVisible();
    await expect(notesBtn).toBeVisible();

    // Select Chatbot
    await chatbotBtn.click();
    
    // Check if it's visually selected (the code adds blue-500/60 border)
    // We can check for the presence of the route label next to it
    await expect(chatbotBtn.getByText('/admin/chatbot')).toBeVisible();
    
    // Check Save button
    const saveBtn = page.getByRole('button', { name: 'Save Selection' });
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeEnabled();
  });
});
