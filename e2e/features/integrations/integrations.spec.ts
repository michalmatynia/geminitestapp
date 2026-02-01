import { test, expect } from '@playwright/test';

test.describe('Integrations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/integrations');
  });

  test('should display integrations list', async ({ page }) => {
    // There might be a heading "Integrations" or similar?
    // The page uses IntegrationList. ConnectionsPage just renders IntegrationList.
    // I don't see a main heading in ConnectionsPage itself, but maybe IntegrationList has it?
    // Let's assume the side nav highlights it, but the page content:
    // IntegrationList likely renders cards for Tradera, Allegro, Baselinker.
    
    await expect(page.getByText('Tradera')).toBeVisible();
    await expect(page.getByText('Allegro')).toBeVisible();
    await expect(page.getByText('Baselinker')).toBeVisible();
  });

  test('should open integration modal', async ({ page }) => {
    // Click on Baselinker
    await page.getByText('Baselinker').click();
    
    // Check for modal presence
    // IntegrationModal is rendered when isModalOpen is true.
    // It likely has a title "Baselinker" or "Integration Details".
    // I'll check for a heading inside the modal.
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Check for connection form or list
    await expect(page.getByRole('button', { name: /Close|Cancel/i }).first()).toBeVisible();
  });
});
