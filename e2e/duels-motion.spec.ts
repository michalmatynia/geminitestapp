import { test, expect } from '@playwright/test';

test('duels lobby cards have motion classes when present', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/kangur/duels');
  await page.locator('#kangur-duels-page').waitFor();

  const lobbyCards = page.locator(
    '[aria-label="Zaproszenia prywatne"] [role="group"], [aria-label="Publiczne pojedynki"] [role="group"]'
  );
  const count = await lobbyCards.count();
  if (count === 0) {
    test.skip(true, 'No lobby entries available to verify motion classes.');
  }
  const className = await lobbyCards.first().getAttribute('class');
  expect(className ?? '').toContain('motion-safe:animate-in');
});
