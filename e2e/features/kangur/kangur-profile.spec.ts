import { test, expect, type Page } from '@playwright/test';

const KANGUR_PROGRESS_STORAGE_KEY = 'sprycio_progress';
const ROUTE_INITIAL_GOTO_TIMEOUT_MS = 90_000;
const ROUTE_BOOT_TIMEOUT_MS = 45_000;
const PROFILE_TABLIST_LABEL_PATTERN = /(?:Profil ucznia|Learner profile)/i;
const AI_TUTOR_TAB_LABEL_PATTERN = /(?:Nastrój AI Tutora|Relationship with the AI Tutor)/i;
const SIGN_IN_TO_SYNC_LABEL_PATTERN = /(?:Zaloguj się, aby synchronizować postęp|Sign in to sync progress)/i;
const TRAINING_HEADING_PATTERN = /^(?:Trening|Training)$/i;
const BACK_BUTTON_LABEL_PATTERN = /(?:Wróć do poprzedniej strony|Go back to previous page)/i;
const DIVISION_LESSON_HEADING_PATTERN = /(?:Dzielenie|Division)/i;
const FIRST_GAME_QUESTION_PATTERN = /(?:Pytanie 1 z 10|Question 1 of 10)/i;
const PROUD_MOOD_LABEL_PATTERN = /(?:Dumny|Proud)/i;
const SUPPORTIVE_MOOD_LABEL_PATTERN = /(?:Wspierajacy|Supportive)/i;
const UPDATED_MOOD_FALLBACK_PATTERN = /(?:Jeszcze nie obliczono|Not calculated yet)/i;

const gotoKangurPath = async (page: Page, path: string): Promise<void> => {
  await page.goto(path, {
    waitUntil: 'commit',
    timeout: ROUTE_INITIAL_GOTO_TIMEOUT_MS,
  });
};

const expectGameRouteReady = async (page: Page): Promise<void> => {
  await expect(page.getByTestId('kangur-route-shell')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
};

const expectLearnerProfileReady = async (page: Page): Promise<void> => {
  const profileMain = page.locator('#kangur-learner-profile-main');
  const statsHeading = page.locator('#kangur-learner-profile-stats-heading');
  const tablist = page.getByRole('tablist', { name: PROFILE_TABLIST_LABEL_PATTERN });

  await expect(page.getByTestId('kangur-route-shell')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(profileMain).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(statsHeading).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(tablist).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
};

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
    ownerEmailVerified: true,
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
  test.describe.configure({ timeout: 90_000 });

  test('renders learner profile shell and baseline sections', async ({ page }) => {
    await gotoKangurPath(page, '/kangur/profile');
    await expectLearnerProfileReady(page);

    await expect(page).toHaveURL(/\/kangur\/profile/);
    await expect(page.getByRole('button', { name: SIGN_IN_TO_SYNC_LABEL_PATTERN })).toBeVisible();
    await expect(page.getByTestId('learner-profile-overview-average-accuracy')).toBeVisible();
    await expect(page.getByTestId('learner-profile-overview-streak')).toBeVisible();
    await expect(page.getByTestId('learner-profile-overview-daily-goal')).toBeVisible();
    await expect(page.getByTestId('learner-profile-overview-badges')).toBeVisible();
    await expect(page.getByRole('tab', { name: AI_TUTOR_TAB_LABEL_PATTERN })).toBeVisible();
    await expect(page.getByTestId('learner-profile-performance-intro')).toBeVisible();
    await expect(page.getByTestId('learner-profile-sessions-intro')).toBeVisible();
    await expect(page.getByTestId('learner-profile-recommendations-intro')).toBeVisible();
  });

  test('exposes learner profile navigation from the game screen', async ({ page }) => {
    await mockKangurAuthMe(page, buildManagerUser());
    await gotoKangurPath(page, '/kangur/game');
    await expectGameRouteReady(page);

    const profileLink = page.getByTestId('kangur-page-top-bar').locator('a[href$="/profile"]').last();
    await expect(profileLink).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(profileLink).toHaveAttribute('href', /\/profile$/);

    const profileHref = await profileLink.getAttribute('href');
    expect(profileHref).toBeTruthy();
    await gotoKangurPath(page, profileHref!);

    await expect(page).toHaveURL(/\/kangur\/profile/);
    await expectLearnerProfileReady(page);
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

    await gotoKangurPath(page, '/kangur/profile');
    await expectLearnerProfileReady(page);

    await expect(page.getByTestId('learner-profile-overview-average-accuracy')).toContainText('90%');
    await expect(page.getByTestId('learner-profile-overview-daily-goal')).toContainText('1/3');
    await expect(page.getByTestId('learner-profile-overview-daily-goal')).toContainText('33%');
    await expect(page.getByTestId('learner-profile-operation-card-addition')).toBeVisible();
    await expect(page.getByTestId('learner-profile-operation-card-multiplication')).toBeVisible();

    const playNowLink = page.locator('a[href*="quickStart=training"]').first();
    await expect(playNowLink).toBeVisible();
    await expect(playNowLink).toHaveAttribute('href', /quickStart=training/);

    await expect(page.getByTestId('learner-profile-sessions-empty')).toHaveCount(0);
    await expect(page.getByRole('button', { name: SIGN_IN_TO_SYNC_LABEL_PATTERN })).toHaveCount(0);

    await playNowLink.click();
    await expect(page).toHaveURL(/\/kangur\/game/);
    await expect(page.getByTestId('kangur-game-training-top-section')).toBeVisible();
    await expect(
      page
        .getByTestId('kangur-game-training-top-section')
        .getByRole('heading', { name: TRAINING_HEADING_PATTERN })
    ).toBeVisible();
    await page
      .getByTestId('kangur-game-training-top-section')
      .getByRole('button', { name: BACK_BUTTON_LABEL_PATTERN })
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

    await gotoKangurPath(page, '/kangur/profile');
    await expectLearnerProfileReady(page);

    await expect(page.getByTestId('learner-profile-ai-tutor-mood')).toBeVisible();
    await expect(page.getByTestId('learner-profile-ai-tutor-mood-current')).toContainText(
      PROUD_MOOD_LABEL_PATTERN
    );
    await expect(page.getByTestId('learner-profile-ai-tutor-mood-current')).toHaveAttribute(
      'data-mood-id',
      'proud'
    );
    await expect(page.getByTestId('learner-profile-ai-tutor-mood-baseline')).toContainText(
      SUPPORTIVE_MOOD_LABEL_PATTERN
    );
    await expect(page.getByTestId('learner-profile-ai-tutor-mood-confidence')).toContainText(
      '82%'
    );
    await expect(page.getByTestId('learner-profile-ai-tutor-mood-updated')).not.toContainText(
      UPDATED_MOOD_FALLBACK_PATTERN
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

    await gotoKangurPath(page, '/kangur/profile');
    await expectLearnerProfileReady(page);

    const openLessonsLink = page.locator('a[href*="focus=division"]').first();
    await expect(openLessonsLink).toBeVisible();
    await expect(openLessonsLink).toHaveAttribute('href', /focus=division/);
    await openLessonsLink.click();

    await expect(page).toHaveURL(/\/kangur\/lessons/);
    await expect(page).not.toHaveURL(/focus=/);
    await expect(
      page
        .getByTestId('active-lesson-header')
        .getByRole('heading', { name: DIVISION_LESSON_HEADING_PATTERN })
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

    await gotoKangurPath(page, '/kangur/profile');
    await expectLearnerProfileReady(page);

    const playNowLink = page.locator('a[href*="quickStart=training"]').first();
    await expect(playNowLink).toBeVisible();
    await playNowLink.click();

    await expect(page).toHaveURL(/\/kangur\/game/);
    await expect(page.getByTestId('kangur-game-training-top-section')).toBeVisible();
    await expect(
      page
        .getByTestId('kangur-game-training-top-section')
        .getByRole('heading', { name: TRAINING_HEADING_PATTERN })
    ).toBeVisible();
    await page
      .getByTestId('kangur-game-training-top-section')
      .getByRole('button', { name: BACK_BUTTON_LABEL_PATTERN })
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

    await gotoKangurPath(page, '/kangur/profile');
    await expectLearnerProfileReady(page);

    const operationLink = page.locator(
      'a[href*="quickStart=operation"][href*="operation=division"]'
    ).first();
    await expect(operationLink).toBeVisible();
    await expect(operationLink).toHaveAttribute('href', /difficulty=easy/);

    await operationLink.click();

    await expect(page).toHaveURL(/\/kangur\/game/);
    await expect(page).not.toHaveURL(/quickStart=/);
    await expect(page.getByText(FIRST_GAME_QUESTION_PATTERN)).toBeVisible();
  });
});
