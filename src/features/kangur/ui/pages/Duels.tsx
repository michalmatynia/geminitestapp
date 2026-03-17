'use client';

import React, { useMemo, useState } from 'react';
import { DuelsLobbyPanel } from './duels/DuelsLobbyPanel';
import { useDuelsLobby } from './duels/useDuelsLobby';
import { useDuelState } from './duels/useDuelState';
import type { KangurDuelMode } from '@/features/kangur/shared/contracts/kangur-duels';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import {
  KangurPageShell,
  KangurPageContainer,
} from '@/features/kangur/ui/design/primitives';
import { cn } from '@/features/kangur/shared/utils';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { LOBBY_FRESH_WINDOW_MS, LOBBY_POLL_INTERVAL_MS } from './duels/constants';

type LobbySort = 'recent' | 'time_fast' | 'time_slow' | 'questions_low' | 'questions_high';

const formatLobbyCountLabel = (count: number): string => {
  if (count === 1) return '1 aktywny';
  if (count > 1 && count < 5) return `${count} aktywne`;
  return `${count} aktywnych`;
};

/**
 * Duels Page
 * Modularized version of the 3.7k LOC Duels.tsx
 */
function DuelsContent(): React.JSX.Element {
  const { isAuthenticated } = useKangurAuth();
  const isGuest = !isAuthenticated;
  const [lobbyModeFilter, setLobbyModeFilter] = useState<'all' | KangurDuelMode>('all');
  const [lobbySort, setLobbySort] = useState<LobbySort>('recent');
  
  useKangurRoutePageReady({
    pageKey: 'Duels',
    ready: true,
  });

  const lobby = useDuelsLobby({
    canBrowseLobby: true,
    canPlay: isAuthenticated,
    isGuest,
    isOnline: true,
    isPageActive: true,
  });

  useDuelState({
    isGuest,
    isOnline: true,
    isPageActive: true,
  });

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
  const lobbyCountLabel = formatLobbyCountLabel(publicLobbyCount);
  const lobbyRefreshSeconds = Math.round(LOBBY_POLL_INTERVAL_MS / 1000);
  const lobbyFresh = lobby.lobbyFresh ?? new Map();

  return (
    <KangurPageShell id='kangur-duels-page'>
      <KangurPageContainer
        id='kangur-duels-main'
        className={cn(
          'w-full max-w-5xl pb-10 pt-6',
          KANGUR_PANEL_GAP_CLASSNAME
        )}
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
      </KangurPageContainer>
    </KangurPageShell>
  );
}

export default function Duels(): React.JSX.Element {
  return <DuelsContent />;
}
