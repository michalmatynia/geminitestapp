/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { createDefaultKangurProgressState } from '@kangur/contracts';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

const homeScreenTestMocks = vi.hoisted(() => ({
  loadProgressMock: vi.fn(),
  useLocalSearchParamsMock: vi.fn(),
  useRouterMock: vi.fn(),
  replaceMock: vi.fn(),
  subscribeToProgressMock: vi.fn(),
  shareKangurDuelInviteMock: vi.fn(),
  useKangurMobileAuthMock: vi.fn(),
  useKangurMobileHomeDuelsLeaderboardMock: vi.fn(),
  useKangurMobileHomeDuelsInvitesMock: vi.fn(),
  useKangurMobileHomeAssignmentsMock: vi.fn(),
  useKangurMobileHomeBadgesMock: vi.fn(),
  useKangurMobileHomeLessonCheckpointsMock: vi.fn(),
  useKangurMobileHomeLessonMasteryMock: vi.fn(),
  useKangurMobileHomeDuelsPresenceMock: vi.fn(),
  useKangurMobileHomeDuelsRematchesMock: vi.fn(),
  useKangurMobileHomeDuelsSpotlightMock: vi.fn(),
  useKangurMobileRuntimeMock: vi.fn(),
  useKangurMobileRecentResultsMock: vi.fn(),
  useKangurMobileTrainingFocusMock: vi.fn(),
  useHomeScreenBootStateMock: vi.fn(),
  useHomeScreenDeferredPanelsMock: vi.fn(),
}));

const {
  loadProgressMock,
  useLocalSearchParamsMock,
  useRouterMock,
  replaceMock,
  subscribeToProgressMock,
  shareKangurDuelInviteMock,
  useKangurMobileAuthMock,
  useKangurMobileHomeDuelsLeaderboardMock,
  useKangurMobileHomeDuelsInvitesMock,
  useKangurMobileHomeAssignmentsMock,
  useKangurMobileHomeBadgesMock,
  useKangurMobileHomeLessonCheckpointsMock,
  useKangurMobileHomeLessonMasteryMock,
  useKangurMobileHomeDuelsPresenceMock,
  useKangurMobileHomeDuelsRematchesMock,
  useKangurMobileHomeDuelsSpotlightMock,
  useKangurMobileRuntimeMock,
  useKangurMobileRecentResultsMock,
  useKangurMobileTrainingFocusMock,
  useHomeScreenBootStateMock,
  useHomeScreenDeferredPanelsMock,
} = homeScreenTestMocks;

export {
  loadProgressMock,
  useLocalSearchParamsMock,
  useRouterMock,
  replaceMock,
  subscribeToProgressMock,
  shareKangurDuelInviteMock,
  useKangurMobileAuthMock,
  useKangurMobileHomeDuelsLeaderboardMock,
  useKangurMobileHomeDuelsInvitesMock,
  useKangurMobileHomeAssignmentsMock,
  useKangurMobileHomeBadgesMock,
  useKangurMobileHomeLessonCheckpointsMock,
  useKangurMobileHomeLessonMasteryMock,
  useKangurMobileHomeDuelsPresenceMock,
  useKangurMobileHomeDuelsRematchesMock,
  useKangurMobileHomeDuelsSpotlightMock,
  useKangurMobileRuntimeMock,
  useKangurMobileRecentResultsMock,
  useKangurMobileTrainingFocusMock,
  useHomeScreenBootStateMock,
  useHomeScreenDeferredPanelsMock,
};

vi.mock('react-native', () => {
  const createPrimitive = (tagName: keyof React.JSX.IntrinsicElements) => {
    return ({
      accessibilityHint: _accessibilityHint,
      accessibilityLabel,
      accessibilityLiveRegion,
      accessibilityRole,
      children,
      contentContainerStyle: _contentContainerStyle,
      keyboardShouldPersistTaps: _keyboardShouldPersistTaps,
      onChangeText,
      onPress,
      secureTextEntry,
      testID,
      textContentType: _textContentType,
      ...props
    }: React.PropsWithChildren<
      Record<string, unknown> & {
        accessibilityHint?: string;
        accessibilityLabel?: string;
        accessibilityLiveRegion?: 'off' | 'none' | 'polite' | 'assertive';
        accessibilityRole?: string;
        contentContainerStyle?: unknown;
        keyboardShouldPersistTaps?: string;
        onChangeText?: (value: string) => void;
        onPress?: () => void;
        secureTextEntry?: boolean;
        testID?: string;
        textContentType?: string;
      }
    >) =>
      React.createElement(
        tagName,
        {
          ...props,
          ...(testID ? { 'data-testid': testID } : {}),
          ...(accessibilityLabel ? { 'aria-label': accessibilityLabel } : {}),
          ...(accessibilityRole ? { role: accessibilityRole } : {}),
          ...(accessibilityLiveRegion ? { 'aria-live': accessibilityLiveRegion } : {}),
          ...(onPress ? { onClick: onPress } : {}),
          ...(onChangeText
            ? {
                onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  onChangeText(event.target.value),
              }
            : {}),
          ...(secureTextEntry ? { type: 'password' } : {}),
        },
        children,
      );
  };

  return {
    Pressable: createPrimitive('button'),
    ScrollView: createPrimitive('div'),
    Text: createPrimitive('span'),
    TextInput: createPrimitive('input'),
    View: createPrimitive('div'),
  };
});

vi.mock('react-native-safe-area-context', () => {
  const createPrimitive = (tagName: keyof React.JSX.IntrinsicElements) => {
    return ({
      accessibilityLabel,
      accessibilityLiveRegion,
      accessibilityRole,
      children,
      testID,
      ...props
    }: React.PropsWithChildren<
      Record<string, unknown> & {
        accessibilityLabel?: string;
        accessibilityLiveRegion?: 'off' | 'none' | 'polite' | 'assertive';
        accessibilityRole?: string;
        testID?: string;
      }
    >) =>
      React.createElement(
        tagName,
        {
          ...props,
          ...(testID ? { 'data-testid': testID } : {}),
          ...(accessibilityLabel ? { 'aria-label': accessibilityLabel } : {}),
          ...(accessibilityRole ? { role: accessibilityRole } : {}),
          ...(accessibilityLiveRegion ? { 'aria-live': accessibilityLiveRegion } : {}),
        },
        children,
      );
  };

  return {
    SafeAreaView: createPrimitive('div'),
  };
});

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
  useLocalSearchParams: useLocalSearchParamsMock,
  useRouter: useRouterMock,
}));

vi.mock('../duels/duelInviteShare', () => ({
  shareKangurDuelInvite: shareKangurDuelInviteMock,
}));

vi.mock('../auth/KangurMobileAuthContext', () => ({
  useKangurMobileAuth: useKangurMobileAuthMock,
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

vi.mock('./useKangurMobileRecentResults', () => ({
  useKangurMobileRecentResults: useKangurMobileRecentResultsMock,
}));

vi.mock('./useKangurMobileHomeDuelsInvites', () => ({
  useKangurMobileHomeDuelsInvites: useKangurMobileHomeDuelsInvitesMock,
}));

vi.mock('./useKangurMobileHomeDuelsLeaderboard', () => ({
  useKangurMobileHomeDuelsLeaderboard: useKangurMobileHomeDuelsLeaderboardMock,
}));

vi.mock('./useKangurMobileHomeAssignments', () => ({
  useKangurMobileHomeAssignments: useKangurMobileHomeAssignmentsMock,
}));

vi.mock('./useKangurMobileHomeBadges', () => ({
  useKangurMobileHomeBadges: useKangurMobileHomeBadgesMock,
}));

vi.mock('./useKangurMobileHomeLessonCheckpoints', () => ({
  useKangurMobileHomeLessonCheckpoints: useKangurMobileHomeLessonCheckpointsMock,
}));

vi.mock('./useKangurMobileHomeLessonMastery', () => ({
  useKangurMobileHomeLessonMastery: useKangurMobileHomeLessonMasteryMock,
}));

vi.mock('./useKangurMobileHomeDuelsPresence', () => ({
  useKangurMobileHomeDuelsPresence: useKangurMobileHomeDuelsPresenceMock,
}));

vi.mock('./useKangurMobileHomeDuelsRematches', () => ({
  useKangurMobileHomeDuelsRematches: useKangurMobileHomeDuelsRematchesMock,
}));

vi.mock('./useKangurMobileHomeDuelsSpotlight', () => ({
  useKangurMobileHomeDuelsSpotlight: useKangurMobileHomeDuelsSpotlightMock,
}));

vi.mock('./useKangurMobileTrainingFocus', () => ({
  useKangurMobileTrainingFocus: useKangurMobileTrainingFocusMock,
}));

vi.mock('./useHomeScreenBootState', () => ({
  useHomeScreenBootState: useHomeScreenBootStateMock,
}));

vi.mock('./useHomeScreenDeferredPanels', () => ({
  useHomeScreenDeferredPanels: useHomeScreenDeferredPanelsMock,
  useHomeScreenDeferredPanelGroup: (
    panelKeys: readonly string[],
    isBlocked: boolean,
  ) => panelKeys.map((panelKey) => useHomeScreenDeferredPanelsMock(panelKey, isBlocked)),
  useHomeScreenDeferredPanelSequence: (
    panelKeys: readonly string[],
    isBlocked: boolean,
  ) => {
    let isCurrentPanelBlocked = isBlocked;

    return panelKeys.map((panelKey) => {
      const isPanelReady = useHomeScreenDeferredPanelsMock(
        panelKey,
        isCurrentPanelBlocked,
      );

      isCurrentPanelBlocked = !isPanelReady;
      return isPanelReady;
    });
  },
}));

let HomeScreen: typeof import('../../app/index').default;
let KangurMobileI18nProvider: typeof import('../i18n/kangurMobileI18n').KangurMobileI18nProvider;

export const renderHomeScreen = (locale?: 'pl' | 'en' | 'de') =>
  render(
    locale ? (
      <KangurMobileI18nProvider locale={locale}>
        <HomeScreen />
      </KangurMobileI18nProvider>
    ) : (
      <HomeScreen />
    ),
  );

export const persistedLessonCheckpointBootSnapshot = {
  guest: {
    adding: {
      attempts: 3,
      bestScorePercent: 72,
      completions: 1,
      lastCompletedAt: '2026-03-21T08:12:00.000Z',
      lastScorePercent: 70,
      masteryPercent: 68,
    },
  },
};

export const persistedHeroRecentScoresBootSnapshot = {
  'learner:learner-1': [
    {
      correct_answers: 7,
      created_by: 'user-1',
      created_date: '2026-03-21T08:00:00.000Z',
      id: 'score-1',
      learner_id: 'learner-1',
      operation: 'addition',
      owner_user_id: 'user-1',
      player_name: 'Ada Learner',
      score: 7,
      subject: 'maths',
      time_taken: 42,
      total_questions: 8,
    },
  ],
};

export const persistedHeroTrainingFocusBootSnapshot = {
  'learner:learner-1': {
    strongestOperation: null,
    weakestOperation: {
      averageAccuracyPercent: 52,
      bestAccuracyPercent: 66,
      family: 'arithmetic',
      operation: 'addition',
      sessions: 3,
    },
  },
};


export const setupHomeScreenTest = () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal('__DEV__', false);
    ({ KangurMobileI18nProvider } = await import('../i18n/kangurMobileI18n'));
    ({ default: HomeScreen } = await import('../../app/index'));
    const progressSnapshot = createDefaultKangurProgressState();
    const storageSnapshot = new Map<string, string>();
    loadProgressMock.mockReturnValue(progressSnapshot);
    subscribeToProgressMock.mockImplementation(() => () => {});
    shareKangurDuelInviteMock.mockResolvedValue(undefined);
    useLocalSearchParamsMock.mockReturnValue({});
    useRouterMock.mockReturnValue({
      replace: replaceMock,
    });
    useHomeScreenBootStateMock.mockReturnValue(false);
    useHomeScreenDeferredPanelsMock.mockReturnValue(true);
    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiBaseUrlSource: 'env',
      progressStore: {
        subscribeToProgress: subscribeToProgressMock,
        loadProgress: loadProgressMock,
      },
      storage: {
        getItem: (key: string) => storageSnapshot.get(key) ?? null,
        removeItem: (key: string) => {
          storageSnapshot.delete(key);
        },
        setItem: (key: string, value: string) => {
          storageSnapshot.set(key, value);
        },
      },
    });
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      developerAutoSignInEnabled: false,
      hasAttemptedDeveloperAutoSignIn: false,
      isLoadingAuth: false,
      session: {
        status: 'anonymous',
        user: null,
      },
      signIn: vi.fn(),
      signInWithLearnerCredentials: vi.fn(),
      signOut: vi.fn(),
      supportsLearnerCredentials: true,
    });
    useKangurMobileRecentResultsMock.mockReturnValue({
      error: null,
      isEnabled: false,
      isLoading: false,
      isRestoringAuth: false,
      refresh: vi.fn(),
      results: [],
    });
    useKangurMobileHomeDuelsInvitesMock.mockReturnValue({
      error: null,
      invites: [],
      isDeferred: false,
      isAuthenticated: false,
      isLoading: false,
      isRestoringAuth: false,
      outgoingChallenges: [],
      refresh: vi.fn(),
    });
    useKangurMobileHomeDuelsLeaderboardMock.mockReturnValue({
      entries: [],
      error: null,
      isLoading: false,
      refresh: vi.fn(),
    });
    useKangurMobileHomeAssignmentsMock.mockReturnValue({
      assignmentItems: [],
    });
    useKangurMobileHomeBadgesMock.mockReturnValue({
      recentBadges: [],
      remainingBadges: 9,
      totalBadges: 9,
      unlockedBadges: 0,
    });
    useKangurMobileHomeLessonCheckpointsMock.mockReturnValue({
      recentCheckpoints: [],
    });
    useKangurMobileHomeLessonMasteryMock.mockReturnValue({
      lessonsNeedingPractice: 0,
      masteredLessons: 0,
      strongest: [],
      trackedLessons: 0,
      weakest: [],
    });
    useKangurMobileHomeDuelsPresenceMock.mockReturnValue({
      actionError: null,
      createPrivateChallenge: vi.fn(),
      entries: [],
      error: null,
      isActionPending: false,
      isAuthenticated: false,
      isLoading: false,
      isRestoringAuth: false,
      pendingLearnerId: null,
      refresh: vi.fn(),
    });
    useKangurMobileHomeDuelsRematchesMock.mockReturnValue({
      actionError: null,
      createRematch: vi.fn(),
      error: null,
      isActionPending: false,
      isAuthenticated: false,
      isLoading: false,
      isRestoringAuth: false,
      opponents: [],
      refresh: vi.fn(),
    });
    useKangurMobileHomeDuelsSpotlightMock.mockReturnValue({
      entries: [],
      error: null,
      isLoading: false,
      refresh: vi.fn(),
    });
    useKangurMobileTrainingFocusMock.mockReturnValue({
      error: null,
      isEnabled: false,
      isLoading: false,
      isRestoringAuth: false,
      recentResults: [],
      refresh: vi.fn(),
      strongestLessonFocus: null,
      strongestOperation: null,
      weakestLessonFocus: null,
      weakestOperation: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
};
