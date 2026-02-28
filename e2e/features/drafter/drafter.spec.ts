import { test, expect } from '@playwright/test';

test.describe('Product Drafts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/drafts');
  });

  test('should display the drafts list page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Product Drafts' })).toBeVisible();
    await expect(page.getByText('Create reusable templates for products')).toBeVisible();

    // Check for Create button
    await expect(page.getByRole('button', { name: /Create.*Draft/i })).toBeVisible();
  });

  test('should open create draft modal', async ({ page }) => {
    // Click create button
    await page.getByRole('button', { name: /Create.*Draft/i }).click();

    // Check modal title
    await expect(page.getByRole('heading', { name: 'Create Draft' })).toBeVisible();

    // Check for form elements (Draft Name is likely required)
    await expect(page.getByLabel('Draft Name')).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('heading', { name: 'Create Draft' })).not.toBeVisible();
  });

  test('should create a new draft', async ({ page }) => {
    const draftName = `Test Draft ${Date.now()}`;

    await page.getByRole('button', { name: /Create.*Draft/i }).click();

    // Fill name
    await page.getByLabel('Draft Name').fill(draftName);

    // Save
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    // Expect success toast or modal close
    // And draft to appear in list
    await expect(page.getByText(draftName)).toBeVisible();
  });

  test('should delete a draft', async ({ page }) => {
    // First ensure we have a draft to delete (re-using the creation flow or assuming previous test passed is risky in parallel)
    // Better to create one specifically for this test
    const draftName = `Delete Me ${Date.now()}`;

    await page.getByRole('button', { name: /Create.*Draft/i }).click();
    await page.getByLabel('Draft Name').fill(draftName);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText(draftName)).toBeVisible();

    // Handle confirm dialog
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Find the delete button for this specific draft
    // The list item structure:
    // div contains h3 with text draftName
    // sibling div contains delete button

    // This might be too broad, let's refine based on DraftList code
    // The DraftList renders a div with border per draft.
    // Within that, h3 has the name.

    // We can find the container that has the name
    const draftContainer = page.locator('.rounded-lg', {
      has: page.getByRole('heading', { name: draftName }),
    });

    // Click delete inside that container
    await draftContainer.getByRole('button', { name: 'Delete' }).click();

    // Verify it disappears
    await expect(page.getByText(draftName)).not.toBeVisible();
  });
});
