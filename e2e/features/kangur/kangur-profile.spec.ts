import { test, expect } from '@playwright/test';

const KANGUR_PROGRESS_STORAGE_KEY = 'sprycio_progress';

const buildManagerUser = (overrides = {}) => {
  const nowIso = new Date('2026-03-08T10:00:00.000Z').toISOString();

  return {
    id: 'parent-001',
    full_name: 'Parent Demo',
    email: 'parent@example.com',
    role: 'user',
    actorType: 'parent',
    canManageLearners: true,
    ownerUserId: 'parent-001',
    activeLearner: {
      id: 'learner-001',
      ownerUserId: 'parent-001',
      displayName: 'Jan',
      loginName: 'jan-demo',
      status: 'active',
      legacyUserKey: null,
      aiTutor: {
        currentMoodId: 'supportive',
        baselineMoodId: 'calm',
        confidence: 0.67,
        lastComputedAt: nowIso,
        lastReasonCode: 'steady_progress',
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    learners: [
      {
        id: 'learner-001',
        ownerUserId: 'parent-001',
        displayName: 'Jan',
        loginName: 'jan-demo',
        status: 'active',
        legacyUserKey: null,
        aiTutor: {
          currentMoodId: 'supportive',
          baselineMoodId: 'calm',
          confidence: 0.67,
          lastComputedAt: nowIso,
          lastReasonCode: 'steady_progress',
        },
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
    ...overrides,
  };
};

const mockKangurAuthMe = async (page, user) => {
  await page.route('**/api/kangur/auth/me**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    });
  });
};

const seedKangurProgress = async (page, progress) => {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    {
      key: KANGUR_PROGRESS_STORAGE_KEY,
      value: progress,
    }
  );
};

test.describe('Kangur Learner Profile', () => {
  test('renders learner profile shell and baseline sections', async ({ page }) => {
    await page.goto('/kangur/profile');

    await expect(page).toHaveURL(/\/kangur\/profile/);
    await expect(page.getByRole('heading', { name: /Profil ucznia/i })).toBeVisible();
    await expect(page.getByText(/Statystyki ucznia: Tryb lokalny\./i)).toBeVisible();

    await expect(page.getByText(/Srednia skutecznosc/i)).toBeVisible();
    await expect(page.getByText(/Seria dni/i)).toBeVisible();
    await expect(page.getByText(/Cel dzienny/i)).toBeVisible();
    await expect(page.getByText(/Odznaki/i).first()).toBeVisible();
    await expect(page.getByText(/Nastroj AI Tutora/i)).toBeVisible();

    await expect(page.getByText(/Aktywnosc 7 dni/i)).toBeVisible();
    await expect(page.getByText(/Wyniki wg operacji/i)).toBeVisible();
    await expect(page.getByText(/Ostatnie sesje/i)).toBeVisible();
    await expect(page.getByText(/Plan na dzis/i)).toBeVisible();
  });

  test('supports navigation from game screen to learner profile', async ({ page }) => {
    await mockKangurAuthMe(page, buildManagerUser());
    await page.goto('/kangur/game');

    const profileLink = page.getByRole('link', { name: /Profil/i }).first();
    await expect(profileLink).toBeVisible();
    await profileLink.click();

    await expect(page).toHaveURL(/\/kangur\/profile/);
    await expect(page.getByRole('heading', { name: /Profil ucznia/i })).toBeVisible();
  });

  test('returns home from the learner profile intro-card top section', async ({ page }) => {
    await page.goto('/kangur/profile');

    await expect(page.getByTestId('kangur-learner-profile-hero')).toBeVisible({
      timeout: 15_000,
    });
    await page
      .getByTestId('kangur-learner-profile-hero')
      .getByRole('button', { name: 'Wróć do poprzedniej strony' })
      .click();

    await expect(page).toHaveURL(/\/kangur$/);
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
  });

  test('renders deterministic learner metrics from mocked auth, progress, and scores', async ({ page }) => {
    const now = new Date();
    const nowIso = now.toISOString();
    const yesterdayIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    await seedKangurProgress(page, {
      totalXp: 620,
      gamesPlayed: 22,
      perfectGames: 6,
      lessonsCompleted: 9,
      clockPerfect: 2,
      calendarPerfect: 1,
      geometryPerfect: 1,
      badges: ['first_game', 'perfect_10', 'lesson_hero', 'ten_games'],
      operationsPlayed: ['addition', 'multiplication', 'division'],
    });

    await mockKangurAuthMe(
      page,
      buildManagerUser({
        full_name: 'Jan',
        email: 'jan@example.com',
      })
    );

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
    await expect(page.getByText(/Poziom 4 · 620 XP lacznie/i)).toBeVisible();
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
    await expect(page.getByTestId('kangur-game-training-top-section')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Trening mieszany/i })).toBeVisible();
    await page
      .getByTestId('kangur-game-training-top-section')
      .getByRole('button', { name: 'Wróć do poprzedniej strony' })
      .click();
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
  });

  test('shows the persisted AI tutor mood on the learner profile', async ({ page }) => {
    const nowIso = '2026-03-08T08:00:00.000Z';

    await mockKangurAuthMe(page, {
      ...buildManagerUser(),
      activeLearner: {
        ...buildManagerUser().activeLearner,
        aiTutor: {
          currentMoodId: 'proud',
          baselineMoodId: 'supportive',
          confidence: 0.82,
          lastComputedAt: nowIso,
          lastReasonCode: 'progress_gain',
        },
      },
      learners: [
        {
          ...buildManagerUser().learners[0],
          aiTutor: {
            currentMoodId: 'proud',
            baselineMoodId: 'supportive',
            confidence: 0.82,
            lastComputedAt: nowIso,
            lastReasonCode: 'progress_gain',
          },
        },
      ],
    });

    await page.route('**/api/kangur/scores**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/kangur/profile');

    await expect(page.getByTestId('learner-profile-ai-tutor-mood')).toBeVisible();
    await expect(page.getByTestId('learner-profile-ai-tutor-mood-current')).toContainText(
      'Dumny'
    );
    await expect(page.getByTestId('learner-profile-ai-tutor-mood-current')).toHaveAttribute(
      'data-mood-id',
      'proud'
    );
    await expect(page.getByTestId('learner-profile-ai-tutor-mood-baseline')).toContainText(
      'Wspierajacy'
    );
    await expect(page.getByTestId('learner-profile-ai-tutor-mood-confidence')).toContainText(
      '82%'
    );
    await expect(page.getByTestId('learner-profile-ai-tutor-mood-updated')).not.toContainText(
      'Jeszcze nie obliczono'
    );
  });

  test('opens focused lesson from recommendation deep link', async ({ page }) => {
    const now = new Date();
    const nowIso = now.toISOString();
    const yesterdayIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    await seedKangurProgress(page, {
      totalXp: 620,
      gamesPlayed: 22,
      perfectGames: 6,
      lessonsCompleted: 9,
      clockPerfect: 2,
      calendarPerfect: 1,
      geometryPerfect: 1,
      badges: ['first_game', 'perfect_10', 'lesson_hero', 'ten_games'],
      operationsPlayed: ['addition', 'division'],
    });

    await mockKangurAuthMe(
      page,
      buildManagerUser({
        full_name: 'Jan',
        email: 'jan@example.com',
      })
    );

    await page.route('**/api/kangur/scores**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'score-today-1',
            player_name: 'Jan',
            score: 9,
            operation: 'addition',
            total_questions: 10,
            correct_answers: 9,
            time_taken: 42,
            created_date: nowIso,
            created_by: 'jan@example.com',
          },
          {
            id: 'score-yesterday-1',
            player_name: 'Jan',
            score: 6,
            operation: 'division',
            total_questions: 10,
            correct_answers: 6,
            time_taken: 50,
            created_date: yesterdayIso,
            created_by: 'jan@example.com',
          },
        ]),
      });
    });

    await page.goto('/kangur/profile');

    const openLessonsLink = page.getByRole('link', { name: 'Otworz lekcje' });
    await expect(openLessonsLink).toBeVisible();
    await expect(openLessonsLink).toHaveAttribute('href', /focus=division/);
    await openLessonsLink.click();

    await expect(page).toHaveURL(/\/kangur\/lessons/);
    await expect(page).not.toHaveURL(/focus=/);
    await expect(
      page.getByTestId('active-lesson-header').getByRole('heading', { name: 'Dzielenie' })
    ).toBeVisible();
    await expect(page.getByTestId('lesson-hub-section-intro')).toBeVisible();
  });

  test('quick-start training works from profile in local mode', async ({ page }) => {
    await seedKangurProgress(page, {
      totalXp: 280,
      gamesPlayed: 8,
      perfectGames: 1,
      lessonsCompleted: 3,
      clockPerfect: 0,
      calendarPerfect: 0,
      geometryPerfect: 0,
      badges: ['first_game'],
      operationsPlayed: ['addition'],
    });

    await page.route('**/api/kangur/auth/me**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
    });

    await page.goto('/kangur/profile');

    const playNowLink = page.getByRole('link', { name: 'Zagraj teraz' });
    await expect(playNowLink).toBeVisible();
    await playNowLink.click();

    await expect(page).toHaveURL(/\/kangur\/game/);
    await expect(page.getByTestId('kangur-game-training-top-section')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Trening mieszany/i })).toBeVisible();
    await page
      .getByTestId('kangur-game-training-top-section')
      .getByRole('button', { name: 'Wróć do poprzedniej strony' })
      .click();
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
  });

  test('quick-start operation works from operation performance links', async ({ page }) => {
    const now = new Date();
    const nowIso = now.toISOString();

    await seedKangurProgress(page, {
      totalXp: 310,
      gamesPlayed: 10,
      perfectGames: 2,
      lessonsCompleted: 4,
      clockPerfect: 0,
      calendarPerfect: 0,
      geometryPerfect: 0,
      badges: ['first_game'],
      operationsPlayed: ['division'],
    });

    await mockKangurAuthMe(
      page,
      buildManagerUser({
        full_name: 'Jan',
        email: 'jan@example.com',
      })
    );

    await page.route('**/api/kangur/scores**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'score-division-1',
            player_name: 'Jan',
            score: 5,
            operation: 'division',
            total_questions: 10,
            correct_answers: 5,
            time_taken: 54,
            created_date: nowIso,
            created_by: 'jan@example.com',
          },
        ]),
      });
    });

    await page.goto('/kangur/profile');

    const operationLink = page.locator(
      'a[href*="quickStart=operation"][href*="operation=division"]'
    ).first();
    await expect(operationLink).toBeVisible();
    await expect(operationLink).toHaveAttribute('href', /difficulty=easy/);

    await operationLink.click();

    await expect(page).toHaveURL(/\/kangur\/game/);
    await expect(page).not.toHaveURL(/quickStart=/);
    await expect(page.getByText(/Pytanie 1 z 10/i)).toBeVisible();
  });
});
