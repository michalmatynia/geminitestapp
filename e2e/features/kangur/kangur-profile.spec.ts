import { test, expect } from '@playwright/test';

test.describe('Kangur Learner Profile', () => {
  test('renders learner profile shell and baseline sections', async ({ page }) => {
    await page.goto('/kangur/profile');

    await expect(page).toHaveURL(/\/kangur\/profile/);
    await expect(page.getByRole('heading', { name: /Profil ucznia/i })).toBeVisible();
    await expect(page.getByText(/Statystyki ucznia/i)).toBeVisible();

    await expect(page.getByText(/Srednia skutecznosc/i)).toBeVisible();
    await expect(page.getByText(/Seria dni/i)).toBeVisible();
    await expect(page.getByText(/Cel dzienny/i)).toBeVisible();
    await expect(page.getByText(/Odznaki/i).first()).toBeVisible();

    await expect(page.getByText(/Aktywnosc 7 dni/i)).toBeVisible();
    await expect(page.getByText(/Wyniki wg operacji/i)).toBeVisible();
    await expect(page.getByText(/Ostatnie sesje/i)).toBeVisible();
    await expect(page.getByText(/Plan na dzis/i)).toBeVisible();
  });

  test('supports navigation from game screen to learner profile', async ({ page }) => {
    await page.goto('/kangur/game');

    const profileLink = page.getByRole('link', { name: /Profil/i }).first();
    await expect(profileLink).toBeVisible();
    await profileLink.click();

    await expect(page).toHaveURL(/\/kangur\/profile/);
    await expect(page.getByRole('heading', { name: /Profil ucznia/i })).toBeVisible();
  });

  test('renders deterministic learner metrics from mocked auth, progress, and scores', async ({ page }) => {
    const now = new Date();
    const nowIso = now.toISOString();
    const yesterdayIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    await page.addInitScript(() => {
      window.localStorage.setItem(
        'mathblast_progress',
        JSON.stringify({
          totalXp: 620,
          gamesPlayed: 22,
          perfectGames: 6,
          lessonsCompleted: 9,
          clockPerfect: 2,
          calendarPerfect: 1,
          geometryPerfect: 1,
          badges: ['first_game', 'perfect_10', 'lesson_hero', 'ten_games'],
          operationsPlayed: ['addition', 'multiplication', 'division'],
        })
      );
    });

    await page.route('**/api/auth/session**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user-jan',
            name: 'Jan',
            email: 'jan@example.com',
            role: 'user',
          },
          expires: '2099-01-01T00:00:00.000Z',
        }),
      });
    });

    await page.route('**/api/kangur/scores**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'score-today-1',
            player_name: 'Jan',
            score: 8,
            operation: 'addition',
            total_questions: 10,
            correct_answers: 8,
            time_taken: 42,
            created_date: nowIso,
            created_by: 'jan@example.com',
          },
          {
            id: 'score-yesterday-1',
            player_name: 'Jan',
            score: 10,
            operation: 'multiplication',
            total_questions: 10,
            correct_answers: 10,
            time_taken: 38,
            created_date: yesterdayIso,
            created_by: 'jan@example.com',
          },
        ]),
      });
    });

    await page.goto('/kangur/profile');

    await expect(page.getByRole('heading', { name: /Profil ucznia/i })).toBeVisible();
    await expect(page.getByText(/Statystyki ucznia: Jan\./i)).toBeVisible();
    await expect(page.getByText(/620 XP lacznie/i)).toBeVisible();
    await expect(page.getByText(/Plan na dzis/i)).toBeVisible();

    await expect(page.getByText('90%').first()).toBeVisible();
    await expect(page.getByText(/1\/3/)).toBeVisible();
    await expect(page.getByText(/Wypelnienie: 33%/i)).toBeVisible();
    const playNowLink = page.getByRole('link', { name: 'Zagraj teraz' });
    await expect(playNowLink).toBeVisible();
    await expect(playNowLink).toHaveAttribute('href', /quickStart=training/);

    await expect(page.getByText(/➕ Dodawanie/i)).toBeVisible();
    await expect(page.getByText(/✖️ Mnozenie/i)).toBeVisible();
    await expect(page.getByText(/Brak rozegranych sesji\./i)).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Zaloguj sie/i })).not.toBeVisible();

    await playNowLink.click();
    await expect(page).toHaveURL(/\/kangur\/game/);
    await expect(page.getByText(/Tryb treningowy/i)).toBeVisible();
  });
});
