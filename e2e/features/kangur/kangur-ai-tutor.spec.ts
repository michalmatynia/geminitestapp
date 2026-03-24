import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  AVATAR_SIZE,
  GUIDED_AVATAR_SURFACE_GAP,
  KANGUR_AI_TUTOR_HOME_ONBOARDING_STORAGE_KEY,
} from '@/features/kangur/ui/components/KangurAiTutorWidget.shared';

import { mockKangurTutorEnvironment, selectTextInElement } from '../../support/kangur-tutor-fixtures';

async function openTutorFromSelection(page: Page): Promise<void> {
  const selectionAction = page.getByTestId('kangur-ai-tutor-selection-action');
  try {
    await selectionAction.waitFor({ state: 'visible', timeout: 1_500 });
    await selectionAction.getByRole('button', { name: 'Zapytaj o to' }).evaluate((button) => {
      (button as HTMLButtonElement).click();
    });
    return;
  } catch {
    throw new Error(
      'Selection CTA was not rendered. Tests must not fall back to the legacy avatar-to-panel flow.'
    );
  }
}

async function selectAllTextInElement(page: Page, selector: string): Promise<void> {
  const root = page.locator(selector).first();
  await root.waitFor();
  await root.scrollIntoViewIfNeeded();

  await page.evaluate((nextSelector) => {
    const rootElement = document.querySelector(nextSelector);
    if (!rootElement) {
      throw new Error(`Missing selection root for selector: ${nextSelector}`);
    }

    const range = document.createRange();
    range.selectNodeContents(rootElement);

    const selection = window.getSelection();
    if (!selection) {
      throw new Error('Selection API is unavailable in this browser context.');
    }

    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('scroll'));
  }, selector);
}

async function gotoTutorRoute(page: Page, href: string): Promise<void> {
  await page.goto(href, { waitUntil: 'domcontentloaded' });
}

async function openLessonByTitle(
  page: Page,
  lessonTitle: string,
  expectedSelectedText?: string
): Promise<Locator> {
  await page.getByRole('button', { name: lessonTitle }).click();

  const lessonBlock = expectedSelectedText
    ? page
        .locator('[data-testid^="lesson-text-block-"]')
        .filter({ hasText: expectedSelectedText })
        .first()
    : page.locator('[data-testid^="lesson-text-block-"]').first();

  await expect(lessonBlock).toBeVisible();
  if (expectedSelectedText) {
    await expect(lessonBlock).toContainText(expectedSelectedText);
  }

  return lessonBlock;
}

async function openTestQuestionFromSuite(page: Page, suiteId = 'suite-add-1'): Promise<string> {
  const suiteCard = page.getByTestId(`kangur-test-suite-card-${suiteId}`);
  await expect(suiteCard).toBeVisible();
  await suiteCard.getByRole('button').click();

  const questionAnchor = page.getByTestId('kangur-test-question-anchor');
  await expect(questionAnchor).toBeVisible();

  const questionPrompt = (await questionAnchor.getByRole('heading').textContent())?.trim() ?? '';
  expect(questionPrompt.length).toBeGreaterThan(0);

  return questionPrompt;
}

async function enableDarkTheme(page: Page): Promise<void> {
  const themeToggle = page.getByRole('button', { name: 'Switch to Dark theme' });
  if ((await themeToggle.count()) > 0) {
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    await expect(page.locator('[data-kangur-appearance="dark"]').first()).toBeVisible();
    return;
  }

  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    document.documentElement.setAttribute('data-kangur-appearance-mode', 'dark');
    document.body.setAttribute('data-kangur-appearance-mode', 'dark');
    document.querySelectorAll('[data-kangur-appearance]').forEach((element) => {
      element.setAttribute('data-kangur-appearance', 'dark');
    });
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.getAttribute('data-kangur-appearance-mode') === 'dark' &&
          document.body.getAttribute('data-kangur-appearance-mode') === 'dark' &&
          Array.from(document.querySelectorAll('[data-kangur-appearance]')).every(
            (element) => element.getAttribute('data-kangur-appearance') === 'dark'
          )
      )
    )
    .toBe(true);
}

async function triggerOnboardingAcknowledge(onboarding: Locator): Promise<void> {
  await onboarding.getByRole('button', { name: 'Rozumiem' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
}

async function triggerOnboardingFinish(onboarding: Locator): Promise<void> {
  await onboarding.getByRole('button', { name: 'Zakończ' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
}

async function triggerTutorAvatar(page: Page): Promise<void> {
  await page.getByTestId('kangur-ai-tutor-avatar').click();
}

async function dragTutorAvatarToAnchor(page: Page, anchor: Locator): Promise<void> {
  const avatar = page.getByTestId('kangur-ai-tutor-avatar');
  const [avatarBox, anchorBox] = await Promise.all([avatar.boundingBox(), anchor.boundingBox()]);

  expect(avatarBox).not.toBeNull();
  expect(anchorBox).not.toBeNull();

  if (!avatarBox || !anchorBox) {
    return;
  }

  await page.mouse.move(avatarBox.x + avatarBox.width / 2, avatarBox.y + avatarBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(anchorBox.x + anchorBox.width / 2, anchorBox.y + anchorBox.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
}

async function dismissHomeOnboardingIfVisible(page: Page): Promise<void> {
  const onboarding = page.getByTestId('kangur-ai-tutor-home-onboarding');
  const avatar = page.getByTestId('kangur-ai-tutor-avatar');

  if ((await onboarding.count()) === 0) {
    try {
      await onboarding.waitFor({ state: 'visible', timeout: 1_500 });
    } catch {
      return;
    }
  }

  await expect(onboarding).toBeVisible();
  await triggerOnboardingFinish(onboarding);
  await expect(onboarding).toHaveCount(0);
  await expect(avatar).toHaveAttribute('data-avatar-placement', 'floating');
}

async function openDivisionQuestionFromGameHome(page: Page): Promise<string> {
  await dismissHomeOnboardingIfVisible(page);
  await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();

  await page.getByRole('button', { name: /grajmy/i }).click();
  await expect(page.getByTestId('kangur-game-operation-top-section')).toBeVisible();

  await page.getByTestId('operation-card-division').click();

  const questionAnchor = page.getByTestId('kangur-game-question-anchor');
  await expect(questionAnchor).toBeVisible();

  const questionPrompt = (await questionAnchor.getByRole('heading').textContent())?.trim() ?? '';
  expect(questionPrompt.length).toBeGreaterThan(0);

  return questionPrompt;
}

const readHomeOnboardingStatus = async (page: Page): Promise<string | null> =>
  page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as { status?: unknown } | null;
      return typeof parsed?.status === 'string' ? parsed.status : null;
    } catch {
      return null;
    }
  }, KANGUR_AI_TUTOR_HOME_ONBOARDING_STORAGE_KEY);

async function expectLocatorsNotToOverlap(
  first: Locator,
  second: Locator
): Promise<void> {
  const [firstBox, secondBox] = await Promise.all([first.boundingBox(), second.boundingBox()]);

  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();

  if (!firstBox || !secondBox) {
    return;
  }

  const overlapsHorizontally =
    firstBox.x < secondBox.x + secondBox.width && firstBox.x + firstBox.width > secondBox.x;
  const overlapsVertically =
    firstBox.y < secondBox.y + secondBox.height && firstBox.y + firstBox.height > secondBox.y;

  expect(overlapsHorizontally && overlapsVertically).toBeFalsy();
}

async function expectLocatorsToOverlap(
  first: Locator,
  second: Locator
): Promise<void> {
  const [firstBox, secondBox] = await Promise.all([first.boundingBox(), second.boundingBox()]);

  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();

  if (!firstBox || !secondBox) {
    return;
  }

  const overlapsHorizontally =
    firstBox.x < secondBox.x + secondBox.width && firstBox.x + firstBox.width > secondBox.x;
  const overlapsVertically =
    firstBox.y < secondBox.y + secondBox.height && firstBox.y + firstBox.height > secondBox.y;

  expect(overlapsHorizontally && overlapsVertically).toBeTruthy();
}

async function expectGuidedAvatarAndCalloutToStayAdjacent(
  avatar: Locator,
  callout: Locator
): Promise<void> {
  const [avatarBox, calloutBox, avatarPlacement] = await Promise.all([
    avatar.boundingBox(),
    callout.boundingBox(),
    avatar.getAttribute('data-guidance-avatar-placement'),
  ]);

  expect(avatarBox).not.toBeNull();
  expect(calloutBox).not.toBeNull();
  expect(avatarPlacement).toBeTruthy();

  if (!avatarBox || !calloutBox || !avatarPlacement) {
    return;
  }

  const overlapsHorizontally =
    avatarBox.x < calloutBox.x + calloutBox.width && avatarBox.x + avatarBox.width > calloutBox.x;
  const overlapsVertically =
    avatarBox.y < calloutBox.y + calloutBox.height &&
    avatarBox.y + avatarBox.height > calloutBox.y;

  expect(overlapsHorizontally && overlapsVertically).toBeFalsy();

  const gap =
    avatarPlacement === 'left'
      ? calloutBox.x - (avatarBox.x + avatarBox.width)
      : avatarPlacement === 'right'
        ? avatarBox.x - (calloutBox.x + calloutBox.width)
        : avatarPlacement === 'top'
          ? calloutBox.y - (avatarBox.y + avatarBox.height)
          : avatarBox.y - (calloutBox.y + calloutBox.height);

  expect(gap).toBeGreaterThanOrEqual(Math.max(4, GUIDED_AVATAR_SURFACE_GAP - 12));
  expect(gap).toBeLessThanOrEqual(AVATAR_SIZE);
}

async function expectLocatorToStayNearFocus(
  locator: Locator,
  focus: Locator,
  maxDistancePx: number
): Promise<void> {
  const [locatorBox, focusBox] = await Promise.all([locator.boundingBox(), focus.boundingBox()]);

  expect(locatorBox).not.toBeNull();
  expect(focusBox).not.toBeNull();

  if (!locatorBox || !focusBox) {
    return;
  }

  const horizontalGap = Math.max(
    0,
    focusBox.x - (locatorBox.x + locatorBox.width),
    locatorBox.x - (focusBox.x + focusBox.width)
  );
  const verticalGap = Math.max(
    0,
    focusBox.y - (locatorBox.y + locatorBox.height),
    locatorBox.y - (focusBox.y + focusBox.height)
  );
  const distance = Math.hypot(horizontalGap, verticalGap);

  expect(distance).toBeLessThanOrEqual(maxDistancePx);
}

async function expectGuidedArrowheadToStayAnchoredToAvatar(arrowhead: Locator): Promise<void> {
  const anchorLeft = Number(await arrowhead.getAttribute('data-guidance-anchor-avatar-left'));
  const anchorTop = Number(await arrowhead.getAttribute('data-guidance-anchor-avatar-top'));

  expect(anchorLeft).toBeGreaterThanOrEqual(0);
  expect(anchorLeft).toBeLessThanOrEqual(56);
  expect(anchorTop).toBeGreaterThanOrEqual(0);
  expect(anchorTop).toBeLessThanOrEqual(56);
}

async function expectSelectionGradientEmphasisToBeActive(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.querySelectorAll('[data-kangur-ai-tutor-selection-emphasis="gradient"]').length
      )
    )
    .toBeGreaterThan(0);
}

async function expectSelectionGradientTextToAnimate(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const element = document.querySelector(
          '[data-kangur-ai-tutor-selection-emphasis="gradient"]'
        );
        if (!element) {
          return null;
        }

        const style = window.getComputedStyle(element);
        return {
          backgroundImage: style.backgroundImage,
          animationName: style.animationName,
        };
      })
    )
    .toEqual(
      expect.objectContaining({
        backgroundImage: expect.stringContaining('gradient'),
        animationName: expect.not.stringMatching(/^none$/),
      })
    );
}

async function expectSelectionGlowOverlayToBeVisible(page: Page): Promise<void> {
  const glowOverlay = page.getByTestId('kangur-ai-tutor-selection-glow').first();
  await expect(glowOverlay).toBeVisible();
  await expect
    .poll(() =>
      glowOverlay.evaluate((element) => {
        const style = window.getComputedStyle(element as HTMLElement);
        return {
          backgroundImage: style.backgroundImage,
          boxShadow: style.boxShadow,
        };
      })
    )
    .toEqual(
      expect.objectContaining({
        backgroundImage: expect.stringContaining('gradient'),
        boxShadow: expect.not.stringMatching(/^none$/),
      })
    );
}

async function expectLocatorToStayStill(
  page: Page,
  locator: Locator,
  waitMs = 280
): Promise<void> {
  const initialBox = await locator.boundingBox();
  expect(initialBox).not.toBeNull();

  await page.waitForTimeout(waitMs);

  const settledBox = await locator.boundingBox();
  expect(settledBox).not.toBeNull();

  if (!initialBox || !settledBox) {
    return;
  }

  expect(Math.abs(settledBox.x - initialBox.x)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(settledBox.y - initialBox.y)).toBeLessThanOrEqual(1.5);
}

async function expectGuidedArrowheadToTargetLocator(
  arrowhead: Locator,
  target: Locator
): Promise<void> {
  const targetBox = await target.boundingBox();
  const targetX = Number(await arrowhead.getAttribute('data-guidance-target-x'));
  const targetY = Number(await arrowhead.getAttribute('data-guidance-target-y'));

  expect(targetBox).not.toBeNull();

  if (!targetBox) {
    return;
  }

  expect(targetX).toBeGreaterThanOrEqual(targetBox.x);
  expect(targetX).toBeLessThanOrEqual(targetBox.x + targetBox.width);
  expect(targetY).toBeGreaterThanOrEqual(targetBox.y);
  expect(targetY).toBeLessThanOrEqual(targetBox.y + targetBox.height);
}

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
