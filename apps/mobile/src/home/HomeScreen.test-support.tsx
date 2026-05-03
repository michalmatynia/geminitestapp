/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { createDefaultKangurProgressState } from '@kangur/contracts/kangur';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({
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

export const loadProgressMock = mocks.loadProgressMock;
export const useLocalSearchParamsMock = mocks.useLocalSearchParamsMock;
export const useRouterMock = mocks.useRouterMock;
export const replaceMock = mocks.replaceMock;
export const subscribeToProgressMock = mocks.subscribeToProgressMock;
export const shareKangurDuelInviteMock = mocks.shareKangurDuelInviteMock;
export const useKangurMobileAuthMock = mocks.useKangurMobileAuthMock;
export const useKangurMobileHomeDuelsLeaderboardMock = mocks.useKangurMobileHomeDuelsLeaderboardMock;
export const useKangurMobileHomeDuelsInvitesMock = mocks.useKangurMobileHomeDuelsInvitesMock;
export const useKangurMobileHomeAssignmentsMock = mocks.useKangurMobileHomeAssignmentsMock;
export const useKangurMobileHomeBadgesMock = mocks.useKangurMobileHomeBadgesMock;
export const useKangurMobileHomeLessonCheckpointsMock = mocks.useKangurMobileHomeLessonCheckpointsMock;
export const useKangurMobileHomeLessonMasteryMock = mocks.useKangurMobileHomeLessonMasteryMock;
export const useKangurMobileHomeDuelsPresenceMock = mocks.useKangurMobileHomeDuelsPresenceMock;
export const useKangurMobileHomeDuelsRematchesMock = mocks.useKangurMobileHomeDuelsRematchesMock;
export const useKangurMobileHomeDuelsSpotlightMock = mocks.useKangurMobileHomeDuelsSpotlightMock;
export const useKangurMobileRuntimeMock = mocks.useKangurMobileRuntimeMock;
export const useKangurMobileRecentResultsMock = mocks.useKangurMobileRecentResultsMock;
export const useKangurMobileTrainingFocusMock = mocks.useKangurMobileTrainingFocusMock;
export const useHomeScreenBootStateMock = mocks.useHomeScreenBootStateMock;
export const useHomeScreenDeferredPanelsMock = mocks.useHomeScreenDeferredPanelsMock;

function createPrimitive(tagName: keyof React.JSX.IntrinsicElements) {
  return ({
    accessibilityLabel,
    accessibilityLiveRegion,
    accessibilityRole,
    children,
    onChangeText,
    onPress,
    secureTextEntry,
    testID,
    ...props
  }: {
    accessibilityLabel?: string;
    accessibilityLiveRegion?: 'off' | 'none' | 'polite' | 'assertive';
    accessibilityRole?: string;
    children?: ReactNode;
    onChangeText?: (value: string) => void;
    onPress?: () => void;
    secureTextEntry?: boolean;
    testID?: string;
  } & Record<string, unknown>) =>
    React.createElement(
      tagName,
      {
        ...props,
        ...(testID !== undefined ? { 'data-testid': testID } : {}),
        ...(accessibilityLabel !== undefined ? { 'aria-label': accessibilityLabel } : {}),
        ...(accessibilityRole !== undefined ? { role: accessibilityRole } : {}),
        ...(accessibilityLiveRegion !== undefined ? { 'aria-live': accessibilityLiveRegion } : {}),
        ...(onPress !== undefined ? { onClick: onPress } : {}),
        ...(onChangeText !== undefined
          ? {
              onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                onChangeText(event.target.value),
            }
          : {}),
        ...(secureTextEntry === true ? { type: 'password' } : {}),
      },
      children,
    );
}

vi.mock('react-native', () => ({
  Pressable: createPrimitive('button'),
  ScrollView: createPrimitive('div'),
  Text: createPrimitive('span'),
  TextInput: createPrimitive('input'),
  View: createPrimitive('div'),
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: createPrimitive('div'),
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  useLocalSearchParams: useLocalSearchParamsMock,
  useRouter: useRouterMock,
}));

// Mock modules...
vi.mock('../duels/duelInviteShare', () => ({ shareKangurDuelInvite: shareKangurDuelInviteMock }));
vi.mock('../auth/KangurMobileAuthContext', () => ({ useKangurMobileAuth: useKangurMobileAuthMock }));
vi.mock('../providers/KangurRuntimeContext', () => ({ useKangurMobileRuntime: useKangurMobileRuntimeMock }));
vi.mock('./useKangurMobileRecentResults', () => ({ useKangurMobileRecentResults: useKangurMobileRecentResultsMock }));
vi.mock('./useKangurMobileHomeDuelsInvites', () => ({ useKangurMobileHomeDuelsInvites: useKangurMobileHomeDuelsInvitesMock }));
vi.mock('./useKangurMobileHomeDuelsLeaderboard', () => ({ useKangurMobileHomeDuelsLeaderboard: useKangurMobileHomeDuelsLeaderboardMock }));
vi.mock('./useKangurMobileHomeAssignments', () => ({ useKangurMobileHomeAssignments: useKangurMobileHomeAssignmentsMock }));
vi.mock('./useKangurMobileHomeBadges', () => ({ useKangurMobileHomeBadges: useKangurMobileHomeBadgesMock }));
vi.mock('./useKangurMobileHomeLessonCheckpoints', () => ({ useKangurMobileHomeLessonCheckpoints: useKangurMobileHomeLessonCheckpointsMock }));
vi.mock('./useKangurMobileHomeLessonMastery', () => ({ useKangurMobileHomeLessonMastery: useKangurMobileHomeLessonMasteryMock }));
vi.mock('./useKangurMobileHomeDuelsPresence', () => ({ useKangurMobileHomeDuelsPresence: useKangurMobileHomeDuelsPresenceMock }));
vi.mock('./useKangurMobileHomeDuelsRematches', () => ({ useKangurMobileHomeDuelsRematches: useKangurMobileHomeDuelsRematchesMock }));
vi.mock('./useKangurMobileHomeDuelsSpotlight', () => ({ useKangurMobileHomeDuelsSpotlight: useKangurMobileHomeDuelsSpotlightMock }));
vi.mock('./useKangurMobileTrainingFocus', () => ({ useKangurMobileTrainingFocus: useKangurMobileTrainingFocusMock }));
vi.mock('./useHomeScreenBootState', () => ({ useHomeScreenBootState: useHomeScreenBootStateMock }));
vi.mock('./useHomeScreenDeferredPanels', () => ({
  useHomeScreenDeferredPanels: useHomeScreenDeferredPanelsMock,
  useHomeScreenDeferredPanelGroup: (
    panelKeys: readonly string[],
    isBlocked: boolean,
  ): boolean[] => panelKeys.map((panelKey) => useHomeScreenDeferredPanelsMock(panelKey, isBlocked) === true),
  useHomeScreenDeferredPanelSequence: (
    panelKeys: readonly string[],
    isBlocked: boolean,
  ): boolean[] => {
    let isCurrentPanelBlocked = isBlocked;
    return panelKeys.map((panelKey): boolean => {
      const isPanelReady = useHomeScreenDeferredPanelsMock(panelKey, isCurrentPanelBlocked) === true;
      isCurrentPanelBlocked = !isPanelReady;
      return isPanelReady;
    });
  },
}));

import type { default as HomeScreenType } from '../../app/index';
import type { KangurMobileI18nProvider as KangurMobileI18nProviderType } from '../i18n/kangurMobileI18n';

let HomeScreen: typeof HomeScreenType;
let KangurMobileI18nProvider: typeof KangurMobileI18nProviderType;

export const renderHomeScreen = (locale?: 'pl' | 'en' | 'de'): ReturnType<typeof render> =>
  render(
    locale !== undefined ? (
      <KangurMobileI18nProvider locale={locale}>
        <HomeScreen />
      </KangurMobileI18nProvider>
    ) : (
      <HomeScreen />
    ),
  );

export const persistedLessonCheckpointBootSnapshot = {
  guest: { adding: { attempts: 3, bestScorePercent: 72, completions: 1, lastCompletedAt: '2026-03-21T08:12:00.000Z', lastScorePercent: 70, masteryPercent: 68 } },
};

export const persistedHeroRecentScoresBootSnapshot = {
  'learner:learner-1': [{ correct_answers: 7, created_by: 'user-1', created_date: '2026-03-21T08:00:00.000Z', id: 'score-1', learner_id: 'learner-1', operation: 'addition', owner_user_id: 'user-1', player_name: 'Ada Learner', score: 7, subject: 'maths', time_taken: 42, total_questions: 8 }],
};

export const persistedHeroTrainingFocusBootSnapshot = {
  'learner:learner-1': { strongestOperation: null, weakestOperation: { averageAccuracyPercent: 52, bestAccuracyPercent: 66, family: 'arithmetic', operation: 'addition', sessions: 3 } },
};

const setupCoreMocks = (): void => {
  const progressSnapshot = createDefaultKangurProgressState();
  const storageSnapshot = new Map<string, string>();
  loadProgressMock.mockReturnValue(progressSnapshot);
  subscribeToProgressMock.mockImplementation(() => () => {});
  shareKangurDuelInviteMock.mockResolvedValue(undefined);
  useLocalSearchParamsMock.mockReturnValue({});
  useRouterMock.mockReturnValue({ replace: replaceMock });
  useHomeScreenBootStateMock.mockReturnValue(false);
  useHomeScreenDeferredPanelsMock.mockReturnValue(true);
  useKangurMobileRuntimeMock.mockReturnValue({
    apiBaseUrl: 'http://localhost:3000',
    apiBaseUrlSource: 'env',
    progressStore: { subscribeToProgress: subscribeToProgressMock, loadProgress: loadProgressMock },
    storage: {
      getItem: (key: string) => storageSnapshot.get(key) ?? null,
      removeItem: (key: string) => storageSnapshot.delete(key),
      setItem: (key: string, value: string) => storageSnapshot.set(key, value),
    },
  });
};

const setupAuthMocks = (): void => {
  useKangurMobileAuthMock.mockReturnValue({
    authError: null,
    authMode: 'learner-session',
    developerAutoSignInEnabled: false,
    hasAttemptedDeveloperAutoSignIn: false,
    isLoadingAuth: false,
    session: { status: 'anonymous', user: null },
    signIn: vi.fn(),
    signInWithLearnerCredentials: vi.fn(),
    signOut: vi.fn(),
    supportsLearnerCredentials: true,
  });
};

const setupDuelsMocks = (): void => {
  useKangurMobileRecentResultsMock.mockReturnValue({ error: null, isEnabled: false, isLoading: false, isRestoringAuth: false, refresh: vi.fn(), results: [] });
  useKangurMobileHomeDuelsInvitesMock.mockReturnValue({ error: null, invites: [], isDeferred: false, isAuthenticated: false, isLoading: false, isRestoringAuth: false, outgoingChallenges: [], refresh: vi.fn() });
  useKangurMobileHomeDuelsLeaderboardMock.mockReturnValue({ entries: [], error: null, isLoading: false, refresh: vi.fn() });
  useKangurMobileHomeDuelsPresenceMock.mockReturnValue({ actionError: null, createPrivateChallenge: vi.fn(), entries: [], error: null, isActionPending: false, isAuthenticated: false, isLoading: false, isRestoringAuth: false, pendingLearnerId: null, refresh: vi.fn() });
  useKangurMobileHomeDuelsRematchesMock.mockReturnValue({ actionError: null, createRematch: vi.fn(), error: null, isActionPending: false, isAuthenticated: false, isLoading: false, isRestoringAuth: false, opponents: [], refresh: vi.fn() });
  useKangurMobileHomeDuelsSpotlightMock.mockReturnValue({ entries: [], error: null, isLoading: false, refresh: vi.fn() });
};

const setupLearnerMocks = (): void => {
  useKangurMobileHomeAssignmentsMock.mockReturnValue({ assignmentItems: [] });
  useKangurMobileHomeBadgesMock.mockReturnValue({ recentBadges: [], remainingBadges: 9, totalBadges: 9, unlockedBadges: 0 });
  useKangurMobileHomeLessonCheckpointsMock.mockReturnValue({ recentCheckpoints: [] });
  useKangurMobileHomeLessonMasteryMock.mockReturnValue({ lessonsNeedingPractice: 0, masteredLessons: 0, strongest: [], trackedLessons: 0, weakest: [] });
  useKangurMobileTrainingFocusMock.mockReturnValue({ error: null, isEnabled: false, isLoading: false, isRestoringAuth: false, recentResults: [], refresh: vi.fn(), strongestLessonFocus: null, strongestOperation: null, weakestLessonFocus: null, weakestOperation: null });
};

export const setupHomeScreenTest = (): void => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal('__DEV__', false);
    ({ KangurMobileI18nProvider } = await import('../i18n/kangurMobileI18n'));
    ({ default: HomeScreen } = await import('../../app/index'));
    setupCoreMocks();
    setupAuthMocks();
    setupDuelsMocks();
    setupLearnerMocks();
  });
  afterEach(() => { vi.unstubAllGlobals(); });
};
