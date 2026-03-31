'use client';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type {
  KangurDuelDifficulty,
  KangurDuelLobbyEntry,
  KangurDuelMode,
  KangurDuelOperation,
} from '@/features/kangur/shared/contracts/kangur-duels';
import {
  formatDurationLabel,
  formatDuelDifficultyLabel,
  formatDuelOperationLabel,
  formatRelativeAge,
  resolveLobbyHostInitial,
} from '@/features/kangur/ui/pages/duels/duels-helpers';

import type { KangurGameOperationSelectorTranslations as LobbyTranslations } from '@/features/kangur/ui/components/game-setup/KangurGameOperationSelectorWidget.types';
export type { LobbyTranslations };
export type LobbySortValue =
  | 'recent'
  | 'time_fast'
  | 'time_slow'
  | 'questions_low'
  | 'questions_high';
export type LobbyJoinClickSource = 'invite_join' | 'join';
export type LobbyLoginClickSource = 'banner' | 'empty_state_create';
export type LobbyRefreshClickSource = 'manual' | 'error_state';
export type LobbyEntryCardVariant = 'invite' | 'public';
export type LobbyStatusChipAccent = 'amber' | 'emerald' | 'rose' | 'slate';

export const DUEL_OPERATION_FILTER_OPTIONS: KangurDuelOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
];
export const DUEL_DIFFICULTY_FILTER_OPTIONS: KangurDuelDifficulty[] = ['easy', 'medium', 'hard'];
export const LOBBY_ENTRY_MOTION_CLASS =
  'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:ease-out';
export const LOBBY_ENTRY_HOVER_CLASS =
  'transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-md focus-within:-translate-y-1 focus-within:shadow-md motion-reduce:transform-none motion-reduce:transition-none';

export type DuelsLobbyPanelsProps = {
  inviteLobbyEntries: KangurDuelLobbyEntry[];
  inviteHeadingId: string;
  inviteListId: string;
  lobbyHeadingId: string;
  lobbyDescriptionId: string;
  lobbyListId: string;
  lobbyEntries: KangurDuelLobbyEntry[];
  lobbyCountLabel: string;
  lobbyLastUpdatedAt: string | null;
  relativeNow: number;
  lobbyRefreshSeconds: number;
  lobbyStreamStatus: 'idle' | 'connecting' | 'connected' | 'fallback';
  loadLobby: (options?: { showLoading?: boolean }) => Promise<void>;
  isLobbyLoading: boolean;
  lobbyModeFilter: 'all' | KangurDuelMode;
  setLobbyModeFilter: Dispatch<SetStateAction<'all' | KangurDuelMode>>;
  lobbyOperationFilter: 'all' | KangurDuelOperation;
  setLobbyOperationFilter: Dispatch<SetStateAction<'all' | KangurDuelOperation>>;
  lobbyDifficultyFilter: 'all' | KangurDuelDifficulty;
  setLobbyDifficultyFilter: Dispatch<SetStateAction<'all' | KangurDuelDifficulty>>;
  lobbySort: LobbySortValue;
  setLobbySort: Dispatch<SetStateAction<LobbySortValue>>;
  publicLobbyEntries: KangurDuelLobbyEntry[];
  filteredPublicLobbyEntries: KangurDuelLobbyEntry[];
  hasAnyPublicLobbyEntries: boolean;
  hasVisiblePublicLobbyEntries: boolean;
  lobbyError: string | null;
  isBusy: boolean;
  joiningSessionId: string | null;
  isPageActive: boolean;
  isOnline: boolean;
  isLobbyStale: boolean;
  canJoinLobby: boolean;
  onRequireLogin: () => void;
  handleJoinLobbySession: (sessionId: string) => Promise<void>;
  handleCreateChallenge: () => Promise<void>;
  lobbyFreshRef: MutableRefObject<Map<string, number>>;
  lobbyFreshWindowMs: number;
};

export type LobbyEntryRuntime = {
  hostInitial: string;
  isFresh: boolean;
  estimatedDurationSec: number;
  isJoining: boolean;
  updatedLabel: string;
  operationLabel: string;
  difficultyLabel: string;
};

export type LobbyEntryCardProps = {
  entry: KangurDuelLobbyEntry;
  index: number;
  canJoinLobby: boolean;
  isBusy: boolean;
  joiningSessionId: string | null;
  relativeNow: number;
  lobbyFreshRef: MutableRefObject<Map<string, number>>;
  lobbyFreshWindowMs: number;
  commonTranslations: LobbyTranslations;
  lobbyTranslations: LobbyTranslations;
  compactActionClassName: string;
  onJoinLobby: (entry: KangurDuelLobbyEntry, source: LobbyJoinClickSource) => void;
  variant: LobbyEntryCardVariant;
};

export type LobbyStatusChipEntry = {
  accent: LobbyStatusChipAccent;
  label: string;
};

export const resolveCompactActionClassName = (isCoarsePointer: boolean): string =>
  isCoarsePointer
    ? 'w-full min-h-12 px-4 touch-manipulation select-none active:scale-[0.985] sm:w-auto'
    : 'w-full sm:w-auto';

export const resolveLobbyEntryRuntime = ({
  entry,
  canJoinLobby,
  joiningSessionId,
  relativeNow,
  lobbyFreshRef,
  lobbyFreshWindowMs,
  commonTranslations,
}: {
  entry: KangurDuelLobbyEntry;
  canJoinLobby: boolean;
  joiningSessionId: string | null;
  relativeNow: number;
  lobbyFreshRef: MutableRefObject<Map<string, number>>;
  lobbyFreshWindowMs: number;
  commonTranslations: LobbyTranslations;
}): LobbyEntryRuntime => {
  const freshAt = lobbyFreshRef.current.get(entry.sessionId);
  return {
    hostInitial: resolveLobbyHostInitial(entry.host.displayName),
    isFresh: typeof freshAt === 'number' && relativeNow - freshAt < lobbyFreshWindowMs,
    estimatedDurationSec: entry.questionCount * entry.timePerQuestionSec,
    isJoining: joiningSessionId === entry.sessionId && canJoinLobby,
    updatedLabel: formatRelativeAge(entry.updatedAt, relativeNow, commonTranslations),
    operationLabel: formatDuelOperationLabel(entry.operation, commonTranslations),
    difficultyLabel: formatDuelDifficultyLabel(entry.difficulty, commonTranslations),
  };
};

export const resolveLobbyJoinButtonLabel = ({
  canJoinLobby,
  isJoining,
  lobbyTranslations,
}: {
  canJoinLobby: boolean;
  isJoining: boolean;
  lobbyTranslations: LobbyTranslations;
}): string => {
  if (!canJoinLobby) {
    return lobbyTranslations('buttons.loginToJoin');
  }
  if (isJoining) {
    return lobbyTranslations('buttons.connecting');
  }
  return lobbyTranslations('buttons.join');
};

export const resolveLobbyJoinAriaLabel = ({
  variant,
  canJoinLobby,
  lobbyTranslations,
  name,
}: {
  variant: LobbyEntryCardVariant;
  canJoinLobby: boolean;
  lobbyTranslations: LobbyTranslations;
  name: string;
}): string => {
  if (variant === 'invite') {
    return canJoinLobby
      ? lobbyTranslations('invite.joinAria', { name })
      : lobbyTranslations('invite.loginToJoinAria', { name });
  }
  return canJoinLobby
    ? lobbyTranslations('publicJoinAria', { name })
    : lobbyTranslations('publicLoginToJoinAria', { name });
};

export const resolveLobbyEntryCardLabel = ({
  variant,
  entry,
  runtime,
  lobbyTranslations,
}: {
  variant: LobbyEntryCardVariant;
  entry: KangurDuelLobbyEntry;
  runtime: LobbyEntryRuntime;
  lobbyTranslations: LobbyTranslations;
}): string =>
  variant === 'invite'
    ? lobbyTranslations('invite.cardAria', {
        name: entry.host.displayName,
        operation: runtime.operationLabel,
        difficulty: runtime.difficultyLabel,
        questionCount: entry.questionCount,
        seconds: entry.timePerQuestionSec,
      })
    : lobbyTranslations('publicCardAria', {
        name: entry.host.displayName,
        operation: runtime.operationLabel,
        difficulty: runtime.difficultyLabel,
        questionCount: entry.questionCount,
        seconds: entry.timePerQuestionSec,
      });

export const resolveLobbyEntryMetaLabel = ({
  variant,
  runtime,
  lobbyTranslations,
}: {
  variant: LobbyEntryCardVariant;
  runtime: LobbyEntryRuntime;
  lobbyTranslations: LobbyTranslations;
}): string =>
  variant === 'invite'
    ? lobbyTranslations('invite.meta', { updated: runtime.updatedLabel })
    : lobbyTranslations('meta.waitingForOpponent', { updated: runtime.updatedLabel });

export const resolveLobbyEntryCardAccent = (
  variant: LobbyEntryCardVariant
): 'indigo' | 'slate' => (variant === 'invite' ? 'indigo' : 'slate');

export const resolveLobbyEntryCardTone = (
  variant: LobbyEntryCardVariant
): 'accent' | 'neutral' => (variant === 'invite' ? 'accent' : 'neutral');

export const resolveLobbyEntryButtonVariant = (
  variant: LobbyEntryCardVariant
): 'primary' | 'secondary' => (variant === 'invite' ? 'primary' : 'secondary');

export const resolveLobbyEntryVisibilityChip = ({
  variant,
  lobbyTranslations,
}: {
  variant: LobbyEntryCardVariant;
  lobbyTranslations: LobbyTranslations;
}): { accent: 'indigo' | 'slate'; label: string } =>
  variant === 'invite'
    ? { accent: 'indigo', label: lobbyTranslations('chips.private') }
    : { accent: 'slate', label: lobbyTranslations('chips.public') };

export const resolveLobbyEntryAvatarClassName = (variant: LobbyEntryCardVariant): string =>
  variant === 'invite'
    ? 'flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-base font-extrabold text-indigo-700 sm:h-12 sm:w-12 sm:text-lg'
    : 'flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-extrabold text-indigo-700';

export const resolveLobbyEntryNameClassName = (variant: LobbyEntryCardVariant): string =>
  variant === 'invite'
    ? 'text-sm font-semibold text-slate-800 truncate'
    : 'text-sm font-semibold text-slate-800';

export const resolveLobbyEntryMetaContainerClassName = (
  variant: LobbyEntryCardVariant
): string => (variant === 'invite' ? 'min-w-0' : '');

export const resolveLobbyEntryBodyClassName = (variant: LobbyEntryCardVariant): string =>
  variant === 'invite'
    ? 'flex items-center kangur-panel-gap min-w-0'
    : 'flex items-center kangur-panel-gap';

export const resolveLobbyStateStatusChips = ({
  showPausedChip,
  showOfflineChip,
  showErrorChip,
  showConnectingChip,
  showLiveChip,
  showStaleChip,
  lobbyTranslations,
}: {
  showPausedChip: boolean;
  showOfflineChip: boolean;
  showErrorChip: boolean;
  showConnectingChip: boolean;
  showLiveChip: boolean;
  showStaleChip: boolean;
  lobbyTranslations: LobbyTranslations;
}): LobbyStatusChipEntry[] => {
  const chips: LobbyStatusChipEntry[] = [];
  if (showPausedChip) {
    chips.push({ accent: 'amber', label: lobbyTranslations('chips.refreshPaused') });
  }
  if (showOfflineChip) {
    chips.push({ accent: 'rose', label: lobbyTranslations('chips.offline') });
  }
  if (showErrorChip) {
    chips.push({ accent: 'rose', label: lobbyTranslations('chips.connectionProblem') });
  }
  if (showConnectingChip) {
    chips.push({ accent: 'slate', label: lobbyTranslations('chips.connectingLive') });
  }
  if (showLiveChip) {
    chips.push({ accent: 'emerald', label: lobbyTranslations('chips.live') });
  }
  if (showStaleChip) {
    chips.push({ accent: 'rose', label: lobbyTranslations('chips.stale') });
  }
  return chips;
};

export const resolveLobbyTimestampStatusChip = ({
  lobbyLastUpdatedAt,
  relativeNow,
  commonTranslations,
  lobbyTranslations,
}: {
  lobbyLastUpdatedAt: string | null;
  relativeNow: number;
  commonTranslations: LobbyTranslations;
  lobbyTranslations: LobbyTranslations;
}): LobbyStatusChipEntry[] => {
  if (lobbyLastUpdatedAt) {
    return [
      {
        accent: 'slate',
        label: lobbyTranslations('meta.updated', {
          value: formatRelativeAge(lobbyLastUpdatedAt, relativeNow, commonTranslations),
        }),
      },
    ];
  }
  return [];
};

export const resolveLobbyCadenceStatusChip = ({
  showLiveChip,
  lobbyRefreshSeconds,
  lobbyTranslations,
}: {
  showLiveChip: boolean;
  lobbyRefreshSeconds: number;
  lobbyTranslations: LobbyTranslations;
}): LobbyStatusChipEntry => ({
  accent: 'slate',
  label: showLiveChip
    ? lobbyTranslations('meta.fallbackEvery', { seconds: lobbyRefreshSeconds })
    : lobbyTranslations('meta.autoEvery', { seconds: lobbyRefreshSeconds }),
});

export const resolveLobbyStatusChips = ({
  showPausedChip,
  showOfflineChip,
  showErrorChip,
  showConnectingChip,
  showLiveChip,
  showStaleChip,
  lobbyLastUpdatedAt,
  relativeNow,
  lobbyRefreshSeconds,
  commonTranslations,
  lobbyTranslations,
}: {
  showPausedChip: boolean;
  showOfflineChip: boolean;
  showErrorChip: boolean;
  showConnectingChip: boolean;
  showLiveChip: boolean;
  showStaleChip: boolean;
  lobbyLastUpdatedAt: string | null;
  relativeNow: number;
  lobbyRefreshSeconds: number;
  commonTranslations: LobbyTranslations;
  lobbyTranslations: LobbyTranslations;
}): LobbyStatusChipEntry[] => [
  ...resolveLobbyStateStatusChips({
    showPausedChip,
    showOfflineChip,
    showErrorChip,
    showConnectingChip,
    showLiveChip,
    showStaleChip,
    lobbyTranslations,
  }),
  ...resolveLobbyTimestampStatusChip({
    lobbyLastUpdatedAt,
    relativeNow,
    commonTranslations,
    lobbyTranslations,
  }),
  resolveLobbyCadenceStatusChip({
    showLiveChip,
    lobbyRefreshSeconds,
    lobbyTranslations,
  }),
];

export { formatDurationLabel };
