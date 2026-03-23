'use client';

import React, { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DuelsLobbyPanel } from './duels/DuelsLobbyPanel';
import { useDuelsLobby } from './duels/useDuelsLobby';
import { useDuelState } from './duels/useDuelState';
import type { KangurDuelMode } from '@/features/kangur/shared/contracts/kangur-duels';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurRouteActivity } from '@/features/kangur/ui/hooks/useKangurRouteActivity';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import { cn } from '@/features/kangur/shared/utils';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import { LOBBY_FRESH_WINDOW_MS, LOBBY_POLL_INTERVAL_MS } from './duels/constants';

type LobbySort = 'recent' | 'time_fast' | 'time_slow' | 'questions_low' | 'questions_high';

/**
 * Duels Page
 * Modularized version of the 3.7k LOC Duels.tsx
 */
function DuelsContent(): React.JSX.Element {
  const lobbyTranslations = useTranslations('KangurDuels.lobby');
  const { basePath } = useKangurRouting();
  const auth = useKangurAuth();
  const { user, isAuthenticated, logout } = auth;
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const { openLoginModal } = useKangurLoginModal();
  const isGuest = !isAuthenticated;
  const isDuelsRouteActive = useKangurRouteActivity('Duels');
  const [lobbyModeFilter, setLobbyModeFilter] = useState<'all' | KangurDuelMode>('all');
  const [lobbySort, setLobbySort] = useState<LobbySort>('recent');
  
  useKangurRoutePageReady({
    pageKey: 'Duels',
    ready: true,
  });

  const hasActiveLearner = Boolean(user?.activeLearner?.id);

  const lobby = useDuelsLobby({
    canBrowseLobby: hasActiveLearner,
    canPlay: hasActiveLearner,
    isGuest,
    isOnline: true,
    isPageActive: isDuelsRouteActive,
  });

  useDuelState({
    isGuest,
    isOnline: true,
    isPageActive: isDuelsRouteActive,
  });

  const navigation = useMemo(
    () => ({
      basePath,
      canManageLearners: Boolean(user?.canManageLearners),
      currentPage: 'Duels' as const,
      guestPlayerName: user ? undefined : guestPlayerName,
      isAuthenticated: Boolean(user),
      onGuestPlayerNameChange: user ? undefined : setGuestPlayerName,
      onLogin: openLoginModal,
      onLogout: () => logout(false),
    }),
    [basePath, guestPlayerName, logout, openLoginModal, setGuestPlayerName, user]
  );

  const publicLobbyEntries = lobby.lobbyEntries ?? [];
  const filteredPublicLobbyEntries = useMemo(() => {
    const filtered =
      lobbyModeFilter === 'all'
        ? publicLobbyEntries
        : publicLobbyEntries.filter((entry) => entry.mode === lobbyModeFilter);
    const sorted = [...filtered];
    switch (lobbySort) {
      case 'time_fast':
        sorted.sort((a, b) => a.timePerQuestionSec - b.timePerQuestionSec);
        break;
      case 'time_slow':
        sorted.sort((a, b) => b.timePerQuestionSec - a.timePerQuestionSec);
        break;
      case 'questions_low':
        sorted.sort((a, b) => a.questionCount - b.questionCount);
        break;
      case 'questions_high':
        sorted.sort((a, b) => b.questionCount - a.questionCount);
        break;
      case 'recent':
      default:
        sorted.sort(
          (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
        );
        break;
    }
    return sorted;
  }, [lobbyModeFilter, lobbySort, publicLobbyEntries]);

  const publicLobbyCount = publicLobbyEntries.length;
  const visibleLobbyCount = filteredPublicLobbyEntries.length;
  const lobbyCountLabel = lobbyTranslations('countLabel', { count: publicLobbyCount });
  const lobbyRefreshSeconds = Math.round(LOBBY_POLL_INTERVAL_MS / 1000);
  const lobbyFresh = lobby.lobbyFresh ?? new Map();

  return (
    <KangurStandardPageLayout
      tone='play'
      id='kangur-duels-page'
      navigation={<KangurTopNavigationController navigation={navigation} />}
      containerProps={{
        className: cn('w-full max-w-5xl pb-10 pt-6', KANGUR_PANEL_GAP_CLASSNAME),
      }}
    >
      <div className={cn('flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
        <DuelsLobbyPanel
          lobbyHeadingId='kangur-duels-lobby-heading'
          lobbyDescriptionId='kangur-duels-lobby-description'
          lobbyListId='kangur-duels-lobby-list'
          lobbyModeFilter={lobbyModeFilter}
          lobbySort={lobbySort}
          lobbyLastUpdatedAt={lobby.lobbyLastUpdatedAt}
          lobbyRefreshSeconds={lobbyRefreshSeconds}
          lobbyCountLabel={lobbyCountLabel}
          lobbyEntriesCount={publicLobbyCount}
          publicLobbyCount={publicLobbyCount}
          visibleLobbyCount={visibleLobbyCount}
          filteredPublicLobbyEntries={filteredPublicLobbyEntries}
          hasAnyPublicLobbyEntries={publicLobbyCount > 0}
          hasVisiblePublicLobbyEntries={visibleLobbyCount > 0}
          lobbyError={lobby.lobbyError}
          isLobbyLoading={lobby.isLobbyLoading}
          isBusy={lobby.isLobbyLoading}
          relativeNow={lobby.relativeNow ?? Date.now()}
          lobbyFresh={lobbyFresh}
          freshWindowMs={LOBBY_FRESH_WINDOW_MS}
          onRefresh={() => {
            void lobby.loadLobby({ showLoading: true });
          }}
          onModeFilterChange={setLobbyModeFilter}
          onSortChange={setLobbySort}
          onJoin={() => undefined}
          onCreateChallenge={() => undefined}
          onResetFilters={() => {
            setLobbyModeFilter('all');
            setLobbySort('recent');
          }}
        />
      </div>
    </KangurStandardPageLayout>
  );
}

export default function Duels(): React.JSX.Element {
  return <DuelsContent />;
}
