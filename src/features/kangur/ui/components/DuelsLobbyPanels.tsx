'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import type {
  KangurDuelDifficulty,
  KangurDuelLobbyEntry,
  KangurDuelMode,
  KangurDuelOperation,
} from '@/features/kangur/shared/contracts/kangur-duels';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  type DuelsLobbyPanelsProps,
  type LobbyJoinClickSource,
  type LobbyLoginClickSource,
  type LobbyRefreshClickSource,
  type LobbySortValue,
  resolveCompactActionClassName,
} from './DuelsLobbyPanels.shared';
import {
  DuelsLobbyMainSection,
} from './DuelsLobbyPanels.sections';
import { DuelsLobbyInviteSection } from './DuelsLobbyPanels.entry-cards';


export function DuelsLobbyPanels(props: DuelsLobbyPanelsProps): React.JSX.Element {
  const lobbyTranslations = useTranslations('KangurDuels.lobby');
  const commonTranslations = useTranslations('KangurDuels.common');
  const isCoarsePointer = useKangurCoarsePointer();
  const {
    inviteLobbyEntries,
    inviteHeadingId,
    inviteListId,
    lobbyHeadingId,
    lobbyDescriptionId,
    lobbyListId,
    lobbyEntries,
    lobbyCountLabel,
    lobbyLastUpdatedAt,
    relativeNow,
    lobbyRefreshSeconds,
    lobbyStreamStatus,
    loadLobby,
    isLobbyLoading,
    lobbyModeFilter,
    setLobbyModeFilter,
    lobbyOperationFilter,
    setLobbyOperationFilter,
    lobbyDifficultyFilter,
    setLobbyDifficultyFilter,
    lobbySort,
    setLobbySort,
    publicLobbyEntries,
    filteredPublicLobbyEntries,
    hasAnyPublicLobbyEntries,
    hasVisiblePublicLobbyEntries,
    lobbyError,
    isBusy,
    joiningSessionId,
    isPageActive,
    isOnline,
    isLobbyStale,
    canJoinLobby,
    onRequireLogin,
    handleJoinLobbySession,
    handleCreateChallenge,
    lobbyFreshRef,
    lobbyFreshWindowMs,
  } = props;
  const isGuest = !canJoinLobby;
  const compactActionClassName = resolveCompactActionClassName(isCoarsePointer);

  const handleRefresh = useCallback(
    (source: LobbyRefreshClickSource): void => {
      trackKangurClientEvent('kangur_duels_lobby_refresh_clicked', {
        isGuest,
        ...(source === 'error_state' ? { source } : {}),
      });
      void loadLobby({ showLoading: true });
    },
    [isGuest, loadLobby]
  );

  const handleGuestLogin = useCallback(
    (source: LobbyLoginClickSource): void => {
      trackKangurClientEvent('kangur_duels_lobby_login_clicked', {
        source,
        isGuest: true,
      });
      onRequireLogin();
    },
    [onRequireLogin]
  );

  const handleJoinLobby = useCallback(
    (entry: KangurDuelLobbyEntry, source: LobbyJoinClickSource): void => {
      if (!canJoinLobby) {
        trackKangurClientEvent('kangur_duels_lobby_login_clicked', {
          source,
          visibility: entry.visibility,
          mode: entry.mode,
          isGuest: true,
        });
        onRequireLogin();
        return;
      }
      trackKangurClientEvent('kangur_duels_lobby_join_clicked', {
        visibility: entry.visibility,
        mode: entry.mode,
        operation: entry.operation,
        difficulty: entry.difficulty,
        questionCount: entry.questionCount,
        timePerQuestionSec: entry.timePerQuestionSec,
        isGuest: false,
      });
      void handleJoinLobbySession(entry.sessionId);
    },
    [canJoinLobby, handleJoinLobbySession, onRequireLogin]
  );

  const handleCreateLobby = useCallback((): void => {
    if (!canJoinLobby) {
      handleGuestLogin('empty_state_create');
      return;
    }
    trackKangurClientEvent('kangur_duels_lobby_create_clicked', {
      source: 'empty_state',
      isGuest: false,
    });
    void handleCreateChallenge();
  }, [canJoinLobby, handleCreateChallenge, handleGuestLogin]);

  const handleModeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      const nextValue = event.target.value as 'all' | KangurDuelMode;
      trackKangurClientEvent('kangur_duels_lobby_filter_changed', {
        modeFilter: nextValue,
        operationFilter: lobbyOperationFilter,
        difficultyFilter: lobbyDifficultyFilter,
        isGuest,
      });
      setLobbyModeFilter(nextValue);
    },
    [isGuest, lobbyDifficultyFilter, lobbyOperationFilter, setLobbyModeFilter]
  );

  const handleOperationChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      const nextValue = event.target.value as 'all' | KangurDuelOperation;
      trackKangurClientEvent('kangur_duels_lobby_filter_changed', {
        modeFilter: lobbyModeFilter,
        operationFilter: nextValue,
        difficultyFilter: lobbyDifficultyFilter,
        isGuest,
      });
      setLobbyOperationFilter(nextValue);
    },
    [isGuest, lobbyDifficultyFilter, lobbyModeFilter, setLobbyOperationFilter]
  );

  const handleDifficultyChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      const nextValue = event.target.value as 'all' | KangurDuelDifficulty;
      trackKangurClientEvent('kangur_duels_lobby_filter_changed', {
        modeFilter: lobbyModeFilter,
        operationFilter: lobbyOperationFilter,
        difficultyFilter: nextValue,
        isGuest,
      });
      setLobbyDifficultyFilter(nextValue);
    },
    [isGuest, lobbyModeFilter, lobbyOperationFilter, setLobbyDifficultyFilter]
  );

  const handleSortChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      const nextValue = event.target.value as LobbySortValue;
      trackKangurClientEvent('kangur_duels_lobby_sort_changed', {
        sort: nextValue,
        isGuest,
      });
      setLobbySort(nextValue);
    },
    [isGuest, setLobbySort]
  );

  const handleResetFilters = useCallback((): void => {
    setLobbyModeFilter('all');
    setLobbyOperationFilter('all');
    setLobbyDifficultyFilter('all');
    setLobbySort('recent');
  }, [setLobbyDifficultyFilter, setLobbyModeFilter, setLobbyOperationFilter, setLobbySort]);

  const handleRefreshClick = useCallback((): void => {
    handleRefresh('manual');
  }, [handleRefresh]);

  const handleRetryClick = useCallback((): void => {
    handleRefresh('error_state');
  }, [handleRefresh]);

  const handleGuestBannerLogin = useCallback((): void => {
    handleGuestLogin('banner');
  }, [handleGuestLogin]);

  return (
    <>
      <DuelsLobbyInviteSection
        inviteLobbyEntries={inviteLobbyEntries}
        inviteHeadingId={inviteHeadingId}
        inviteListId={inviteListId}
        canJoinLobby={canJoinLobby}
        isBusy={isBusy}
        joiningSessionId={joiningSessionId}
        relativeNow={relativeNow}
        lobbyFreshRef={lobbyFreshRef}
        lobbyFreshWindowMs={lobbyFreshWindowMs}
        commonTranslations={commonTranslations}
        lobbyTranslations={lobbyTranslations}
        compactActionClassName={compactActionClassName}
        onJoinLobby={handleJoinLobby}
      />

      <DuelsLobbyMainSection
        lobbyHeadingId={lobbyHeadingId}
        lobbyDescriptionId={lobbyDescriptionId}
        lobbyListId={lobbyListId}
        lobbyEntries={lobbyEntries}
        lobbyCountLabel={lobbyCountLabel}
        lobbyLastUpdatedAt={lobbyLastUpdatedAt}
        relativeNow={relativeNow}
        lobbyRefreshSeconds={lobbyRefreshSeconds}
        lobbyStreamStatus={lobbyStreamStatus}
        isLobbyLoading={isLobbyLoading}
        lobbyModeFilter={lobbyModeFilter}
        lobbyOperationFilter={lobbyOperationFilter}
        lobbyDifficultyFilter={lobbyDifficultyFilter}
        lobbySort={lobbySort}
        publicLobbyEntries={publicLobbyEntries}
        filteredPublicLobbyEntries={filteredPublicLobbyEntries}
        hasAnyPublicLobbyEntries={hasAnyPublicLobbyEntries}
        hasVisiblePublicLobbyEntries={hasVisiblePublicLobbyEntries}
        lobbyError={lobbyError}
        isBusy={isBusy}
        joiningSessionId={joiningSessionId}
        isPageActive={isPageActive}
        isOnline={isOnline}
        isLobbyStale={isLobbyStale}
        canJoinLobby={canJoinLobby}
        compactActionClassName={compactActionClassName}
        commonTranslations={commonTranslations}
        lobbyTranslations={lobbyTranslations}
        lobbyFreshRef={lobbyFreshRef}
        lobbyFreshWindowMs={lobbyFreshWindowMs}
        onRefresh={handleRefreshClick}
        onGuestLogin={handleGuestBannerLogin}
        onModeChange={handleModeChange}
        onOperationChange={handleOperationChange}
        onDifficultyChange={handleDifficultyChange}
        onSortChange={handleSortChange}
        onRetry={handleRetryClick}
        onJoinLobby={handleJoinLobby}
        onCreateChallenge={handleCreateLobby}
        onResetFilters={handleResetFilters}
      />
    </>
  );
}
