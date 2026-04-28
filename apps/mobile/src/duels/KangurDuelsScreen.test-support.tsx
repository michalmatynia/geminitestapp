import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';
import type { UseKangurMobileDuelsLobbyResult } from './useKangurMobileDuelsLobby';

const duelsScreenTestMocks = vi.hoisted(() => ({
  useLocalSearchParamsMock: vi.fn(),
  useRouterMock: vi.fn(),
  replaceMock: vi.fn(),
  shareKangurDuelInviteMock: vi.fn(),
  useKangurMobileAuthMock: vi.fn(),
  useKangurMobileDuelsAssignmentsMock: vi.fn(),
  useKangurMobileDuelsBadgesMock: vi.fn(),
  useKangurMobileDuelsLessonMasteryMock: vi.fn(),
  useKangurMobileDuelLobbyChatMock: vi.fn(),
  useKangurMobileDuelsLobbyMock: vi.fn(),
  useKangurMobileDuelSessionMock: vi.fn(),
  useKangurMobileLessonCheckpointsMock: vi.fn(),
}));

export const {
  useLocalSearchParamsMock,
  useRouterMock,
  replaceMock,
  shareKangurDuelInviteMock,
  useKangurMobileAuthMock,
  useKangurMobileDuelsAssignmentsMock,
  useKangurMobileDuelsBadgesMock,
  useKangurMobileDuelsLessonMasteryMock,
  useKangurMobileDuelLobbyChatMock,
  useKangurMobileDuelsLobbyMock,
  useKangurMobileDuelSessionMock,
  useKangurMobileLessonCheckpointsMock,
} = duelsScreenTestMocks;

vi.mock('react-native', () => {
  const getMappedProps = (props: Record<string, unknown>): Record<string, unknown> => {
    const {
      accessibilityLabel,
      accessibilityLiveRegion,
      accessibilityRole,
      onPress,
      onChangeText,
      secureTextEntry,
      testID,
      ...rest
    } = props;

    const mapped: Record<string, unknown> = { ...rest };

    if (typeof testID === 'string' && testID.length > 0) {
      mapped['data-testid'] = testID;
    }
    if (typeof accessibilityLabel === 'string' && accessibilityLabel.length > 0) {
      mapped['aria-label'] = accessibilityLabel;
    }
    if (typeof accessibilityRole === 'string' && accessibilityRole.length > 0) {
      mapped['role'] = accessibilityRole;
    }
    if (typeof accessibilityLiveRegion === 'string' && accessibilityLiveRegion.length > 0) {
      mapped['aria-live'] = accessibilityLiveRegion;
    }

    if (typeof onPress === 'function') {
      mapped.onClick = onPress;
    }

    if (typeof onChangeText === 'function') {
      mapped.onChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        (onChangeText as (text: string) => void)(event.target.value);
      };
    }

    if (secureTextEntry === true) {
      mapped.type = 'password';
    }

    return mapped;
  };

  const createPrimitive = (tagName: keyof React.JSX.IntrinsicElements) => {
    return ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tagName, getMappedProps(props), children);
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
    >) => {
      const elementProps: Record<string, unknown> = { ...props };
      if (typeof testID === 'string' && testID.length > 0) {
        elementProps['data-testid'] = testID;
      }
      if (typeof accessibilityLabel === 'string' && accessibilityLabel.length > 0) {
        elementProps['aria-label'] = accessibilityLabel;
      }
      if (typeof accessibilityRole === 'string' && accessibilityRole.length > 0) {
        elementProps['role'] = accessibilityRole;
      }
      if (typeof accessibilityLiveRegion === 'string' && accessibilityLiveRegion.length > 0) {
        elementProps['aria-live'] = accessibilityLiveRegion;
      }

      return React.createElement(tagName, elementProps, children);
    };
  };

  return {
    SafeAreaView: createPrimitive('div'),
  };
});

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren): React.JSX.Element | null =>
    (children as React.JSX.Element) ?? null,
  useLocalSearchParams: duelsScreenTestMocks.useLocalSearchParamsMock,
  useRouter: duelsScreenTestMocks.useRouterMock,
}));

vi.mock('../auth/KangurMobileAuthContext', () => ({
  useKangurMobileAuth: duelsScreenTestMocks.useKangurMobileAuthMock,
}));

vi.mock('./useKangurMobileDuelsLobby', () => ({
  useKangurMobileDuelsLobby: duelsScreenTestMocks.useKangurMobileDuelsLobbyMock,
}));

vi.mock('./useKangurMobileDuelLobbyChat', () => ({
  useKangurMobileDuelLobbyChat: duelsScreenTestMocks.useKangurMobileDuelLobbyChatMock,
}));

vi.mock('./useKangurMobileDuelSession', () => ({
  useKangurMobileDuelSession: duelsScreenTestMocks.useKangurMobileDuelSessionMock,
}));

vi.mock('./useKangurMobileDuelsAssignments', () => ({
  useKangurMobileDuelsAssignments:
    duelsScreenTestMocks.useKangurMobileDuelsAssignmentsMock,
}));

vi.mock('./useKangurMobileDuelsBadges', () => ({
  useKangurMobileDuelsBadges: duelsScreenTestMocks.useKangurMobileDuelsBadgesMock,
}));

vi.mock('./useKangurMobileDuelsLessonMastery', () => ({
  useKangurMobileDuelsLessonMastery:
    duelsScreenTestMocks.useKangurMobileDuelsLessonMasteryMock,
}));

vi.mock('./duelInviteShare', () => ({
  shareKangurDuelInvite: duelsScreenTestMocks.shareKangurDuelInviteMock,
}));

vi.mock('../lessons/useKangurMobileLessonCheckpoints', () => ({
  useKangurMobileLessonCheckpoints:
    duelsScreenTestMocks.useKangurMobileLessonCheckpointsMock,
}));

import { KangurDuelsScreen } from './KangurDuelsScreen';

export const renderDuelsScreen = (locale: 'pl' | 'en' | 'de' = 'pl') =>
  render(
    <KangurMobileI18nProvider locale={locale}>
      <KangurDuelsScreen />
    </KangurMobileI18nProvider>
  );

export const createDefaultDuelsLobbyMock = (): UseKangurMobileDuelsLobbyResult => ({
  actionError: null,
  createPrivateChallenge: vi.fn(),
  createPublicChallenge: vi.fn(),
  createQuickMatch: vi.fn(),
  difficulty: 'easy',
  inviteEntries: [],
  isActionPending: false,
  isAuthenticated: true,
  isLoadingAuth: false,
  isLobbyLoading: false,
  isOpponentsLoading: false,
  isPresenceLoading: false,
  isRestoringAuth: false,
  isSearchLoading: false,
  joinDuel: vi.fn(),
  leaderboardEntries: [],
  leaderboardError: null,
  lobbyError: null,
  modeFilter: 'all',
  operation: 'addition',
  opponents: [],
  presenceEntries: [],
  presenceError: null,
  publicEntries: [],
  refresh: vi.fn(),
  searchError: null,
  searchQuery: '',
  searchResults: [],
  searchSubmittedQuery: '',
  seriesBestOf: 1,
  setDifficulty: vi.fn(),
  setModeFilter: vi.fn(),
  setOperation: vi.fn(),
  setSeriesBestOf: vi.fn(),
  setSearchQuery: vi.fn(),
  submitSearch: vi.fn(),
  clearSearch: vi.fn(),
  visiblePublicEntries: [],
});

export const resetDuelsScreenMocks = (): void => {
  vi.clearAllMocks();
  shareKangurDuelInviteMock.mockResolvedValue(undefined);
  useLocalSearchParamsMock.mockReturnValue({});
  useRouterMock.mockReturnValue({
    replace: replaceMock,
  });
  resetAuthMocks();
  resetLobbyMocks();
  resetSessionMocks();
  resetLessonMocks();
};

const resetAuthMocks = (): void => {
  useKangurMobileAuthMock.mockReturnValue({
    isLoadingAuth: false,
    session: {
      status: 'authenticated',
      user: {
        activeLearner: {
          id: 'learner-1',
        },
        id: 'user-1',
      },
    },
    signIn: vi.fn(),
    supportsLearnerCredentials: true,
  });
};

const resetLobbyMocks = (): void => {
  useKangurMobileDuelLobbyChatMock.mockReturnValue({
    error: null,
    isAuthenticated: true,
    isLoading: false,
    isRestoringAuth: false,
    isSending: false,
    maxMessageLength: 280,
    messages: [],
    refresh: vi.fn(),
    sendMessage: vi.fn(),
  });
  useKangurMobileDuelsLobbyMock.mockReturnValue(createDefaultDuelsLobbyMock());
};

const resetSessionMocks = (): void => {
  useKangurMobileDuelSessionMock.mockReturnValue({
    actionError: null,
    currentQuestion: null,
    error: null,
    isAuthenticated: true,
    isLoading: false,
    isMutating: false,
    isRestoringAuth: false,
    isSpectating: false,
    leaveSession: vi.fn(),
    player: null,
    refresh: vi.fn(),
    sendReaction: vi.fn(),
    session: null,
    spectatorCount: 0,
    submitAnswer: vi.fn(),
  });
};

const resetLessonMocks = (): void => {
  useKangurMobileLessonCheckpointsMock.mockReturnValue({
    recentCheckpoints: [],
  });
  useKangurMobileDuelsAssignmentsMock.mockReturnValue({
    assignmentItems: [],
  });
  useKangurMobileDuelsBadgesMock.mockReturnValue({
    recentBadges: [],
    remainingBadges: 9,
    totalBadges: 9,
    unlockedBadges: 0,
  });
  useKangurMobileDuelsLessonMasteryMock.mockReturnValue({
    lessonsNeedingPractice: 0,
    masteredLessons: 0,
    strongest: [],
    trackedLessons: 0,
    weakest: [],
  });
};
