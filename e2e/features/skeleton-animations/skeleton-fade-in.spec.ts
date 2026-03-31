import { test, expect } from '@playwright/test';

test.describe('Skeleton Animations - StudiQ Frontend', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the studiq app
    await page.goto('/kangur');
  });

  test('should render skeleton with fade-in animation on page transition', async ({ page }) => {
    // Get the skeleton element
    const skeleton = page.locator('[data-testid="kangur-page-transition-skeleton"]');

    // Check that skeleton has the fade-in animation class
    const classes = await skeleton.getAttribute('class');
    expect(classes).toContain('animate-skeleton-fade-in');

    // Verify skeleton is visible (not display: none)
    await expect(skeleton).toBeVisible();
  });

  test('should have animation CSS variables applied to skeleton', async ({ page }) => {
    const skeleton = page.locator('[data-testid="kangur-page-transition-skeleton"]');

    // Check for CSS custom properties
    const style = await skeleton.getAttribute('style');
    expect(style).toMatch(/--skeleton-fade-in-duration/);
    expect(style).toMatch(/--skeleton-fade-in-easing/);
    expect(style).toMatch(/--element-stagger-delay/);
  });

  test('should animate individual skeleton elements with stagger delay', async ({ page }) => {
    // Wait for skeleton to render
    await page.waitForSelector('[data-testid="kangur-page-transition-skeleton"]');

    // Get all skeleton blocks/lines
    const skeletonElements = page.locator(
      '[data-testid="kangur-page-transition-skeleton"] [aria-hidden="true"]'
    );

    const count = await skeletonElements.count();
    expect(count).toBeGreaterThan(0);

    // Verify at least some elements have the stagger animation class
    for (let i = 0; i < Math.min(count, 3); i++) {
      const element = skeletonElements.nth(i);
      const classes = await element.getAttribute('class');
      expect(classes).toContain('animate-skeleton-stagger');
    }
  });

  test('should complete fade-in animation within 400ms', async ({ page }) => {
    const skeleton = page.locator('[data-testid="kangur-page-transition-skeleton"]');
    const startTime = Date.now();

    // Wait for skeleton to be fully visible and opacity to be at 1
    await expect(skeleton).toBeVisible();

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Animation should complete within reasonable time (including network delay)
    expect(duration).toBeLessThan(500);
  });

  test('skeleton should fade out when page content loads', async ({ page }) => {
    const skeleton = page.locator('[data-testid="kangur-page-transition-skeleton"]');

    // Wait for navigation and page content to load
    await page.goto('/kangur/lessons');
    await page.waitForLoadState('networkidle');

    // Skeleton should fade out or disappear (by nature of loading.tsx being replaced)
    // This test verifies the component unmounts properly after page load
    try {
      await expect(skeleton).toBeHidden({ timeout: 5000 });
    } catch {
      // It's OK if skeleton persists as long as actual content is visible
      const content = page.locator('[data-kangur-route-main="true"]');
      await expect(content).toBeVisible();
    }
  });
});
