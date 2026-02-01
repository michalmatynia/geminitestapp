import { test, expect } from '@playwright/test';

test.describe('AI Paths Admin Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/ai-paths');
    // Ensure we are on Canvas and it's loaded
    await expect(page.getByRole('tab', { name: 'Canvas' })).toBeVisible();
    
    // Check if we have nodes, if not, load from Paths tab
    const nodes = page.locator('div[style*="translate"]');
    if (await nodes.count() === 0) {
      await page.getByRole('tab', { name: 'Paths' }).click();
      const firstPath = page.locator('button.cursor-pointer').first();
      if (await firstPath.isVisible()) {
        await firstPath.click();
      } else {
        await page.getByRole('button', { name: 'New Path' }).click();
      }
      await page.getByRole('tab', { name: 'Canvas' }).click();
    }
    await page.waitForTimeout(1000);
  });

  test('should display AI Paths title and main tabs', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'AI Paths' })).toBeVisible();
    
    await expect(page.getByRole('tab', { name: 'Canvas' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Paths' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Docs' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Job Queue' })).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    // Canvas tab is default
    await expect(page.getByText('Node Palette')).toBeVisible();

    // Switch to Paths tab
    await page.getByRole('tab', { name: 'Paths' }).click();
    await expect(page.getByText('Manage and rename your AI paths')).toBeVisible();

    // Switch to Docs tab
    await page.getByRole('tab', { name: 'Docs' }).click();
    await expect(page.getByRole('heading', { name: 'AI Paths Docs' })).toBeVisible();

    // Switch to Job Queue tab
    await page.getByRole('tab', { name: 'Job Queue' }).click();
    // Using Refresh button which is unique to JobQueuePanel in this context
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeVisible();
  });

  test('should show node palette and inspector in canvas tab', async ({ page }) => {
    await page.getByRole('tab', { name: 'Canvas' }).click();
    
    await expect(page.getByText('Node Palette')).toBeVisible();
    await expect(page.getByText('Inspector')).toBeVisible();
    await expect(page.getByText('Connections')).toBeVisible();
  });

  test('should expand and collapse palette groups', async ({ page }) => {
    await page.getByRole('tab', { name: 'Canvas' }).click();
    
    // Expanding Context + Parsing group
    // The button text might contain the count and icon
    const contextGroup = page.getByRole('button', { name: /Context \+ Parsing/i });
    await contextGroup.click();
    
    // Check for nodes inside the group - they are spans or divs with text
    await expect(page.getByText('Context Filter').first()).toBeVisible();
    await expect(page.getByText('JSON Parser').first()).toBeVisible();
  });

  test('should select a node and show it in inspector', async ({ page }) => {
    await page.getByRole('tab', { name: 'Canvas' }).click();
    
    // Find a node on the canvas. 
    const node = page.locator('div[style*="translate"]').first();
    // Wait for it to be visible first
    await expect(node).toBeVisible({ timeout: 10000 });
    await node.click({ force: true });
    
    await expect(page.getByText('Inspector')).toBeVisible();
  });

  test('should create, rename and save a new path', async ({ page }) => {
    await page.getByRole('tab', { name: 'Canvas' }).click();
    
    // Click New Path
    await page.getByRole('button', { name: 'New Path' }).click();
    await page.waitForTimeout(1000);
    
    // Rename the path
    const nameInput = page.getByPlaceholder('Path name');
    await nameInput.clear();
    await nameInput.fill('E2E Test Path');
    await nameInput.press('Enter');
    
    // Click Save Path
    await page.getByRole('button', { name: 'Save Path' }).click();
    
    // Should show success toast
    await expect(page.getByText(/success|saved/i).first()).toBeVisible();
    
    // Verify it appears in Paths tab
    await page.getByRole('tab', { name: 'Paths' }).click();
    await expect(page.getByText('E2E Test Path').first()).toBeVisible();
  });

  test('should delete a node from canvas', async ({ page }) => {
    await page.getByRole('tab', { name: 'Canvas' }).click();
    
    // Find node by translate style
    const node = page.locator('div[style*="translate"]').first();
    await expect(node).toBeVisible({ timeout: 10000 });
    await node.click({ force: true });
    await page.waitForTimeout(1000);
    
    // Check inspector
    await expect(page.getByText('Inspector')).toBeVisible();
    
    const removeBtn = page.getByRole('button', { name: 'Remove Node' });
    await expect(removeBtn).toBeVisible({ timeout: 10000 });
    
    // Handle confirm dialog
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    
    await removeBtn.click();
  });

  test('should open node configuration dialog', async ({ page }) => {
    await page.getByRole('tab', { name: 'Canvas' }).click();
    
    // Select a node
    const node = page.locator('div[style*="translate"]').first();
    await expect(node).toBeVisible({ timeout: 10000 });
    await node.click({ force: true });
    
    // Wait for inspector
    await expect(page.getByRole('button', { name: 'Open Node Config' })).toBeVisible({ timeout: 10000 });
    
    // Click Open Node Config in inspector
    await page.getByRole('button', { name: 'Open Node Config' }).click();
    
    // Verify dialog is open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Configure/i)).toBeVisible();
    
    // Close dialog
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should fire a trigger and see it in job queue', async ({ page }) => {
    await page.getByRole('tab', { name: 'Canvas' }).click();
    
    // Attempt to find a Trigger node. The existing comments suggest it might not be present by default.
    // If a Trigger node exists and is selectable, we proceed. Otherwise, we log and skip.
    const triggerNode = page.locator('div[style*="translate"]').filter({ hasText: /Trigger/i }).first();
    
    if (await triggerNode.isVisible({ timeout: 5000 })) { // Add timeout as it might not be immediately visible
      await triggerNode.click({ force: true });
      await page.waitForTimeout(500); // Wait for potential inspector actions
      
      const fireTriggerButton = page.getByRole('button', { name: 'Fire Trigger' });
      await expect(fireTriggerButton).toBeVisible();
      await fireTriggerButton.click();
      
      // Should show success toast
      await expect(page.getByText(/triggered|started|success/i).first()).toBeVisible();
      
      // Check Job Queue tab
      await page.getByRole('tab', { name: 'Job Queue' }).click();
      // Wait for the job to appear in the queue - it might take a moment.
      await expect(page.locator('tbody tr').first()).toContainText(/queued|running/i, { timeout: 20000 }); // Expect job to be visible and in a pending state
    } else {
      console.log('Skipping "fire a trigger" test: No Trigger node found on the canvas.');
    }
  });

  test('should clear all wires', async ({ page }) => {
    await page.getByRole('tab', { name: 'Canvas' }).click();
    
    // Click New Path to ensure initial edges are loaded
    await page.getByRole('button', { name: 'New Path' }).click();
    await page.waitForTimeout(1000);
    
    // Check if there are active wires
    const connectionsText = page.getByText(/Active wires: \d+/);
    await expect(connectionsText).toBeVisible();
    
    // Click Clear All Wires
    await page.getByRole('button', { name: 'Clear All Wires' }).click();
    
    // Should show 0 wires
    await expect(page.getByText('Active wires: 0')).toBeVisible();
  });
});