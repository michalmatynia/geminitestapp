    await expect(page.getByPlaceholder("sk-ant-...")).toHaveValue("sk-test-anthropic");
    await expect(page.getByPlaceholder("AIza...")).toHaveValue("sk-test-gemini");
  });
});

test.describe('Settings - Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/settings/notifications');
  });

  test('should display notifications settings', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Preview Success' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Preview Error' })).toBeVisible();
  });

  test('should save notification settings', async ({ page }) => {
    // Example: toggle a setting and save
    const toggle = page.locator('label').filter({ hasText: 'Enable Email Notifications' }).locator('input[type="checkbox"]');
    await expect(toggle).toBeVisible();
    await toggle.click(); // Toggle it (assuming it starts unchecked or checked)
    
    await page.getByRole('button', { name: 'Save Settings' }).click();
    await expect(page.getByText('Notification settings saved successfully.')).toBeVisible();

    // Reload the page to check persistence
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible();
    // Check if the toggle state persisted (this depends on exact UI implementation, assuming it's checked now)
    await expect(toggle).toBeChecked(); 
  });
});

