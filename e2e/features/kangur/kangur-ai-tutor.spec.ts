import { expect, test } from '@playwright/test';

import {
  dismissHomeOnboardingIfVisible,
  dragTutorAvatarToAnchor,
  enableDarkTheme,
  expectGuidedArrowheadToStayAnchoredToAvatar,
  expectGuidedArrowheadToTargetLocator,
  expectGuidedAvatarAndCalloutToStayAdjacent,
  expectLocatorToStayNearFocus,
  expectLocatorsNotToOverlap,
  expectLocatorsToOverlap,
  expectLocatorToStayStill,
  expectSelectionGlowOverlayToBeVisible,
  expectSelectionGradientEmphasisToBeActive,
  expectSelectionGradientTextToAnimate,
  gotoTutorRoute,
  openDivisionQuestionFromGameHome,
  openLessonByTitle,
  openTestQuestionFromSuite,
  openTutorFromSelection,
  readHomeOnboardingStatus,
  selectAllTextInElement,
  triggerOnboardingAcknowledge,
  triggerOnboardingFinish,
  triggerTutorAvatar,
} from './kangur-ai-tutor.spec-support';
import { mockKangurTutorEnvironment, selectTextInElement } from '../../support/kangur-tutor-fixtures';

test.describe('Kangur AI Tutor', () => {
  test('advances Game home onboarding with Rozumiem and docks the tutor after Zakończ', async ({
    page,
  }) => {
    await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur');

    const onboarding = page.getByTestId('kangur-ai-tutor-home-onboarding');
    const avatar = page.getByTestId('kangur-ai-tutor-avatar');

    await expect(onboarding).toBeVisible();
    await expect(onboarding).toContainText('Krok 1 z 5');
    await expect(onboarding).toContainText('Tutaj wybierasz, jak chcesz zacząć.');
    await expect(onboarding.getByRole('button', { name: 'Rozumiem' })).toBeVisible();
    await expect(onboarding.getByRole('button', { name: 'Zakończ' })).toBeVisible();
    await expect(avatar).toHaveAttribute('data-avatar-placement', 'guided');
    await expect(avatar).toHaveAttribute('data-guidance-target', 'home_actions');

    await triggerOnboardingAcknowledge(onboarding);

    await expect(onboarding).toContainText('Krok 2 z 5');
    await expect(onboarding).toContainText('Tutaj pojawia się Twoja aktualna misja.');
    await expect(avatar).toHaveAttribute('data-guidance-target', 'home_quest');
    await expect.poll(() => readHomeOnboardingStatus(page)).toBe('shown');

    await triggerOnboardingFinish(onboarding);

    await expect(onboarding).toHaveCount(0);
    await expect(avatar).toHaveAttribute('data-avatar-placement', 'floating');
    await expect(avatar).toHaveAttribute('data-anchor-kind', 'dock');
    await expect.poll(() => readHomeOnboardingStatus(page)).toBe('dismissed');
  });

  test('reopens the authenticated home onboarding prompt from the docked Game tutor avatar after closing onboarding', async ({
    page,
  }) => {
    await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur');

    const onboarding = page.getByTestId('kangur-ai-tutor-home-onboarding');
    const avatar = page.getByTestId('kangur-ai-tutor-avatar');

    await expect(onboarding).toBeVisible();
    await triggerOnboardingFinish(onboarding);

    await expect(onboarding).toHaveCount(0);
    await expect(avatar).toHaveAttribute('data-avatar-placement', 'floating');
    await expect(avatar).toHaveAttribute('data-anchor-kind', 'dock');
    await expect.poll(() => readHomeOnboardingStatus(page)).toBe('dismissed');

    await avatar.click();

    const onboardingPrompt = page.getByTestId('kangur-ai-tutor-guest-intro');
    await expect(onboardingPrompt).toBeVisible();
    await expect(onboardingPrompt).toContainText(
      'Czy chcesz, żebym pokazała główne przyciski oraz elementy wyniku i postępu?'
    );
    await expect(onboardingPrompt).toContainText(
      'Mogę przeprowadzić Cię po najważniejszych akcjach na stronie głównej oraz po miejscach, w których zobaczysz ranking, punkty i tempo nauki.'
    );
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);

    await onboardingPrompt.getByRole('button', { name: 'Tak' }).click();

    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-home-onboarding')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-home-onboarding')).toContainText(
      'Tutaj wybierasz, jak chcesz zacząć.'
    );
  });

  test('floats to selected lesson text and explains it automatically', async ({ page }) => {
    const {
      chatRequests,
      lessonTitle,
      lessonSelectedText,
    } = await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur/lessons');
    await enableDarkTheme(page);
    const selectedLessonBlock = await openLessonByTitle(page, lessonTitle, lessonSelectedText);

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await openTutorFromSelection(page);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    const tutorArrowhead = page.getByTestId('kangur-ai-tutor-guided-arrowhead');
    const tutorPanel = page.getByTestId('kangur-ai-tutor-panel');
    const diagnostics = page.getByTestId('kangur-ai-tutor-surface-diagnostics');
    const selectedLessonTextLocator = selectedLessonBlock.getByText(lessonSelectedText, {
      exact: true,
    });

    await expect(tutorAvatar).toHaveAttribute('data-guidance-target', 'selection_excerpt');
    await expect(tutorAvatar).toHaveAttribute('data-avatar-placement', 'guided');
    await expect.poll(() =>
      page.evaluate(() => window.getSelection()?.toString().trim() ?? '')
    ).toBe('');
    await expectSelectionGradientEmphasisToBeActive(page);
    await expectSelectionGradientTextToAnimate(page);
    await expect(page.locator('[data-kangur-ai-tutor-selection-emphasis="gradient"]')).toHaveCount(1);
    await expectSelectionGlowOverlayToBeVisible(page);
    await expect(page.getByTestId('kangur-ai-tutor-selection-spotlight')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeVisible();
    await expectLocatorToStayStill(
      page,
      tutorAvatar
    );
    await expect(tutorArrowhead).toBeVisible();
    await expectLocatorsToOverlap(tutorAvatar, tutorArrowhead);
    await expectGuidedAvatarAndCalloutToStayAdjacent(
      tutorAvatar,
      page.getByTestId('kangur-ai-tutor-selection-guided-callout')
    );
    await expectLocatorToStayNearFocus(tutorAvatar, selectedLessonTextLocator, 114);
    await expectGuidedArrowheadToStayAnchoredToAvatar(tutorArrowhead);
    await expectLocatorsNotToOverlap(
      page.getByTestId('kangur-ai-tutor-selection-guided-callout'),
      selectedLessonTextLocator
    );
    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toContainText(
      'Wyjaśniam ten fragment.'
    );
    const guidedAvatarPlacement = await tutorAvatar.getAttribute('data-guidance-avatar-placement');
    expect(guidedAvatarPlacement).toBeTruthy();
    await expect(page.getByTestId('kangur-ai-tutor-selection-preview')).toHaveAttribute(
      'data-avatar-avoid-edge',
      guidedAvatarPlacement ?? 'none'
    );
    await expect(page.getByTestId('kangur-ai-tutor-selection-action')).toHaveCount(0);

    await expect.poll(() => chatRequests.length).toBe(1);
    expect(chatRequests[0]?.context?.selectedText).toBe(lessonSelectedText);
    expect(chatRequests[0]?.context?.focusKind).toBe('document');
    expect(chatRequests[0]?.context?.promptMode).toBe('selected_text');
    expect(chatRequests[0]?.context?.interactionIntent).toBe('explain');

    await expect(tutorPanel).toHaveCount(0);
    await expect(diagnostics).toHaveAttribute('data-tutor-surface', 'selection_guided');
    await expect(diagnostics).toHaveAttribute('data-contextual-mode', 'selection_explain');
    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-guided-arrowhead')).toBeVisible();
    await expect(
      selectedLessonBlock.getByText(lessonSelectedText, { exact: true })
    ).toBeVisible();
  });

  test('opens the docked tutor with the home progress badge-track explanation after the browser selection clears', async ({
    page,
  }) => {
    const { chatRequests, hintResponse } = await mockKangurTutorEnvironment(page, {
      chatResponseDelayMs: 200,
      initialProgress: {
        totalXp: 280,
        gamesPlayed: 4,
        perfectGames: 1,
        lessonsCompleted: 3,
        recommendedSessionsCompleted: 0,
        clockPerfect: 1,
        calendarPerfect: 1,
        geometryPerfect: 0,
        badges: ['first_game', 'lesson_hero', 'clock_master', 'calendar_keeper'],
        operationsPlayed: ['addition', 'subtraction'],
        lessonMastery: {
          adding: {
            attempts: 1,
            completions: 1,
            masteryPercent: 80,
            bestScorePercent: 80,
            lastScorePercent: 80,
            lastCompletedAt: '2026-03-07T12:00:00.000Z',
          },
          subtracting: {
            attempts: 1,
            completions: 1,
            masteryPercent: 76,
            bestScorePercent: 76,
            lastScorePercent: 76,
            lastCompletedAt: '2026-03-07T12:00:00.000Z',
          },
        },
        totalCorrectAnswers: 50,
        totalQuestionsAnswered: 60,
        bestWinStreak: 2,
        activityStats: {},
        dailyQuestsCompleted: 0,
      },
    });

    await gotoTutorRoute(page, '/kangur');
    await dismissHomeOnboardingIfVisible(page);

    const masteryTrack = page.getByTestId('player-progress-badge-track-mastery');
    await expect(masteryTrack).toBeVisible();
    await expect(masteryTrack).toContainText('Mistrzostwo');
    await expect(masteryTrack).toContainText('Budowniczy mistrzostwa');

    await selectAllTextInElement(page, '[data-testid="player-progress-badge-track-mastery"]');
    await openTutorFromSelection(page);

    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeVisible();
    await expect.poll(() => chatRequests.length, { timeout: 20_000 }).toBe(1);
    expect(chatRequests[0]?.context?.focusId).toBe('kangur-game-home-progress');
    expect(chatRequests[0]?.context?.focusKind).toBe('progress');
    expect(chatRequests[0]?.context?.promptMode).toBe('selected_text');
    expect(chatRequests[0]?.context?.selectedText).toContain('MISTRZOSTWO');
    expect(chatRequests[0]?.context?.selectedText).toContain('Budowniczy mistrzostwa');

    await expect(
      page.getByTestId('kangur-ai-tutor-selection-guided-answer')
    ).toContainText(hintResponse, { timeout: 20_000 });
    await expect(
      page.getByText('Już przygotowuję wyjaśnienie dokładnie dla zaznaczonego tekstu.')
    ).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeVisible();
  });

  test('shows the knowledge-backed selected-text answer on the test screen when the tutor returns page-content guidance', async ({
    page,
  }) => {
    test.slow();

    const questionPrompt =
      'Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach?';
    const testQuestionResponse =
      'To zadanie sprawdza, czy po rozcięciu powstają dwie identyczne czy różne części.';
    const { chatRequests } = await mockKangurTutorEnvironment(page, {
      questionPrompt,
      testQuestionResponse,
      testQuestionAnswerResolutionMode: 'page_content',
    });

    await gotoTutorRoute(page, '/en/kangur/tests');
    await expect(page.getByTestId('kangur-route-shell')).toBeVisible();
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();

    const renderedQuestionPrompt = await openTestQuestionFromSuite(page);
    expect(renderedQuestionPrompt).toBe(questionPrompt);

    await selectTextInElement(page, '[data-testid="kangur-test-question-anchor"]', questionPrompt);
    await openTutorFromSelection(page);

    await expect.poll(() => chatRequests.length).toBe(1);
    expect(chatRequests[0]?.context?.surface).toBe('test');
    expect(chatRequests[0]?.context?.selectedText).toBe(questionPrompt);
    expect(chatRequests[0]?.context?.focusKind).toBe('question');
    expect(chatRequests[0]?.context?.promptMode).toBe('selected_text');
    expect(chatRequests[0]?.context?.interactionIntent).toBe('explain');

    await expect(
      page.getByTestId('kangur-ai-tutor-selection-guided-page-content-badge')
    ).toContainText('Zapisana treść strony');
    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-answer')).toContainText(
      testQuestionResponse
    );
    await expect(page.getByTestId('kangur-ai-tutor-selection-hint-followup')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
  });

  test('shows the minimalist tutor modal from the avatar for a logged-in learner without resurfacing onboarding', async ({
    page,
  }) => {
    const { lessonTitle } = await mockKangurTutorEnvironment(page, {
      proactiveNudges: 'off',
      rememberTutorContext: false,
      allowCrossPagePersistence: false,
    });

    await page.addInitScript(() => {
      window.sessionStorage.removeItem('kangur-ai-tutor-widget-v1');
      window.localStorage.removeItem('kangur-ai-tutor-guest-intro-v1');
      window.localStorage.removeItem('kangur-ai-tutor-home-onboarding-v1');
    });

    await gotoTutorRoute(page, '/kangur/lessons');
    await openLessonByTitle(page, lessonTitle);
    await dismissHomeOnboardingIfVisible(page);

    await triggerTutorAvatar(page);

    const diagnostics = page.getByTestId('kangur-ai-tutor-surface-diagnostics');
    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toHaveAttribute(
      'data-modal-surface',
      'canonical-onboarding'
    );
    await expect(diagnostics).toHaveAttribute('data-tutor-surface', 'onboarding');
    await expect(diagnostics).toHaveAttribute('data-canonical-modal-visible', 'true');
    await expect(diagnostics).toHaveAttribute('data-guest-intro-rendered', 'true');
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-ask-modal')).toHaveCount(0);
  });

  test('keeps the selection guidance arrow attached to the avatar on a narrow lesson viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { lessonTitle, lessonSelectedText } = await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur/lessons');
    const selectedLessonBlock = await openLessonByTitle(page, lessonTitle, lessonSelectedText);

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await openTutorFromSelection(page);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    const tutorArrowhead = page.getByTestId('kangur-ai-tutor-guided-arrowhead');
    const guidedCallout = page.getByTestId('kangur-ai-tutor-selection-guided-callout');

    await expect(tutorAvatar).toHaveAttribute('data-avatar-placement', 'guided');
    await expect(tutorArrowhead).toBeVisible();
    await expect(guidedCallout).toBeVisible();
    await expectLocatorsToOverlap(tutorAvatar, tutorArrowhead);
    await expectGuidedAvatarAndCalloutToStayAdjacent(tutorAvatar, guidedCallout);
    await expectGuidedArrowheadToStayAnchoredToAvatar(tutorArrowhead);
    await expectGuidedArrowheadToTargetLocator(tutorArrowhead, selectedLessonBlock);
    await expectLocatorsNotToOverlap(
      guidedCallout,
      selectedLessonBlock.getByText(lessonSelectedText, { exact: true })
    );
  });

  test('keeps the uploaded tutor avatar image visible while the tutor is thinking', async ({
    page,
  }) => {
    const tutorPersonaImageUrl = '/uploads/agentcreator/personas/persona-mila/neutral/avatar.png';
    const {
      chatRequests,
      lessonTitle,
      lessonSelectedText,
    } = await mockKangurTutorEnvironment(page, {
      tutorPersonaImageUrl,
      chatResponseDelayMs: 1_000,
    });

    await gotoTutorRoute(page, '/kangur/lessons');
    await openLessonByTitle(page, lessonTitle, lessonSelectedText);

    await expect(
      page.getByTestId('kangur-ai-tutor-avatar-image').locator('img').first()
    ).toHaveAttribute('src', tutorPersonaImageUrl);

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await openTutorFromSelection(page);

    await expect(
      page.getByTestId('kangur-ai-tutor-avatar-image').locator('img').first()
    ).toHaveAttribute('src', tutorPersonaImageUrl);

    await expect.poll(() => chatRequests.length).toBe(1);
    await expect(
      page.getByTestId('kangur-ai-tutor-avatar-image').locator('img').first()
    ).toHaveAttribute('src', tutorPersonaImageUrl);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeVisible();
    await expect(
      page.getByTestId('kangur-ai-tutor-avatar-image').locator('img').first()
    ).toHaveAttribute('src', tutorPersonaImageUrl);
  });

  test('keeps the minimalist selection guidance surface active when learner mood data is present', async ({ page }) => {
    const {
      lessonTitle,
      lessonSelectedText,
    } = await mockKangurTutorEnvironment(page, {
      tutorLearnerMoodId: 'calm',
    });

    await gotoTutorRoute(page, '/kangur/lessons');
    await openLessonByTitle(page, lessonTitle, lessonSelectedText);

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await openTutorFromSelection(page);

    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-surface-diagnostics')).toHaveAttribute(
      'data-tutor-surface',
      'selection_guided'
    );
  });

  test('hides proactive tutor nudges when parent settings disable them', async ({ page }) => {
    const {
      lessonTitle,
      lessonSelectedText,
    } = await mockKangurTutorEnvironment(page, {
      proactiveNudges: 'off',
    });

    await gotoTutorRoute(page, '/kangur/lessons');
    await openLessonByTitle(page, lessonTitle, lessonSelectedText);

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await openTutorFromSelection(page);

    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-proactive-nudge')).toHaveCount(0);
  });

  test('closes the lesson tutor on outside click and re-docks the avatar', async ({ page }) => {
    const {
      chatRequests,
      lessonTitle,
      lessonSelectedText,
    } = await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur/lessons');
    await openLessonByTitle(page, lessonTitle, lessonSelectedText);

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await openTutorFromSelection(page);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');

    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeVisible();
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'selection_excerpt');
    await expect.poll(() => chatRequests.length).toBe(1);

    await page.mouse.click(24, 24);

    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'dock');
    await expect(page.getByTestId('kangur-ai-tutor-selection-action')).toHaveCount(0);
  });

  test('does not reopen the tutor automatically when a new lesson fragment is selected after dismissing selection guidance', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const {
      chatRequests,
      lessonTitle,
      lessonSelectedText,
    } = await mockKangurTutorEnvironment(page);
    const followUpSelectedText = 'kolejny krok';

    await gotoTutorRoute(page, '/kangur/lessons');
    await openLessonByTitle(page, lessonTitle, lessonSelectedText);

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await openTutorFromSelection(page);

    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeVisible();
    await expect.poll(() => chatRequests.length, { timeout: 20_000 }).toBe(1);

    await page.mouse.click(24, 24);

    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-anchor-kind',
      'dock'
    );

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', followUpSelectedText);

    const selectionAction = page.getByTestId('kangur-ai-tutor-selection-action');
    await expect(selectionAction).toBeVisible();
    await expect(selectionAction.getByRole('button', { name: 'Zapytaj o to' })).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-anchor-kind',
      'dock'
    );
    await expect.poll(() => chatRequests.length).toBe(1);
  });

  test('lets the learner drag the docked tutor avatar onto a page section and starts section guidance', async ({
    page,
  }) => {
    await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur');
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
    await dismissHomeOnboardingIfVisible(page);

    const leaderboardAnchor = page.getByTestId('leaderboard-shell');
    await expect(leaderboardAnchor).toBeVisible();

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    await expect(tutorAvatar).toBeVisible();
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'dock');

    await dragTutorAvatarToAnchor(page, leaderboardAnchor);

    await expect(page.getByTestId('kangur-ai-tutor-section-guided-callout')).toContainText(
      'Wyjaśniam sekcję:'
    );
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
  });

  test('keeps the guided lesson surface active when the learner clicks the guided avatar again', async ({
    page,
  }) => {
    const {
      chatRequests,
      lessonTitle,
      lessonSelectedText,
    } = await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur/lessons');
    await openLessonByTitle(page, lessonTitle, lessonSelectedText);

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);
    await openTutorFromSelection(page);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');

    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeVisible();
    await expect(tutorAvatar).toHaveAttribute('data-anchor-kind', 'selection_excerpt');
    await expect.poll(() => chatRequests.length).toBe(1);

    await triggerTutorAvatar(page);

    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeVisible();
    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toHaveCount(0);
    await expect.poll(() => chatRequests.length).toBe(1);
  });

  test('keeps the tutor docked in static mode while still using selected-text context', async ({
    page,
  }) => {
    const {
      chatRequests,
      lessonTitle,
      lessonSelectedText,
    } = await mockKangurTutorEnvironment(page, {
      uiMode: 'static',
    });

    await gotoTutorRoute(page, '/kangur/lessons');
    await openLessonByTitle(page, lessonTitle, lessonSelectedText);

    await selectTextInElement(page, '[data-testid^="lesson-text-block-"]', lessonSelectedText);

    await openTutorFromSelection(page);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');

    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(tutorAvatar).toHaveCount(1);
    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeVisible();

    await expect.poll(() => chatRequests.length).toBe(1);
    expect(chatRequests[0]?.context?.selectedText).toBe(lessonSelectedText);
    expect(chatRequests[0]?.context?.focusKind).toBe('document');
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
  });

  test('keeps the selection guidance arrow attached on highlighted game-question text', async ({
    page,
  }) => {
    const { chatRequests } = await mockKangurTutorEnvironment(page);

    await gotoTutorRoute(page, '/kangur');
    await expect(page.getByTestId('kangur-route-shell')).toBeVisible();
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();

    const questionPrompt = await openDivisionQuestionFromGameHome(page);
    const questionAnchor = page.getByTestId('kangur-game-question-anchor');
    await expect(questionAnchor.getByRole('heading', { name: questionPrompt, exact: true })).toBeVisible();

    await selectTextInElement(page, '[data-testid="kangur-game-question-anchor"]', questionPrompt);
    await openTutorFromSelection(page);

    const tutorAvatar = page.getByTestId('kangur-ai-tutor-avatar');
    const tutorArrowhead = page.getByTestId('kangur-ai-tutor-guided-arrowhead');
    const guidedCallout = page.getByTestId('kangur-ai-tutor-selection-guided-callout');

    await expect(tutorAvatar).toHaveAttribute('data-guidance-target', 'selection_excerpt');
    await expect.poll(() =>
      page.evaluate(() => window.getSelection()?.toString().trim() ?? '')
    ).toBe('');
    await expectSelectionGradientEmphasisToBeActive(page);
    await expectSelectionGlowOverlayToBeVisible(page);
    await expect(tutorArrowhead).toBeVisible();
    await expect(guidedCallout).toBeVisible();
    await expectGuidedAvatarAndCalloutToStayAdjacent(tutorAvatar, guidedCallout);
    await expectGuidedArrowheadToStayAnchoredToAvatar(tutorArrowhead);
    await expectGuidedArrowheadToTargetLocator(tutorArrowhead, questionAnchor);
    await expectLocatorToStayNearFocus(
      tutorAvatar,
      questionAnchor.getByRole('heading', { name: questionPrompt, exact: true }),
      112
    );
    await expectLocatorsNotToOverlap(
      guidedCallout,
      questionAnchor.getByRole('heading', { name: questionPrompt, exact: true })
    );
    const guidedAvatarPlacement = await tutorAvatar.getAttribute('data-guidance-avatar-placement');
    expect(guidedAvatarPlacement).toBeTruthy();
    await expect(page.getByTestId('kangur-ai-tutor-selection-preview')).toHaveAttribute(
      'data-avatar-avoid-edge',
      guidedAvatarPlacement ?? 'none'
    );

    await expect.poll(() => chatRequests.length).toBe(1);
    expect(chatRequests[0]?.context?.surface).toBe('game');
    expect(chatRequests[0]?.context?.selectedText).toBe(questionPrompt);
    expect(chatRequests[0]?.context?.focusKind).toBe('question');
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeVisible();
  });

});
