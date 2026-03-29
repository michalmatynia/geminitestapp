'use client';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import type {
  KangurDuelDifficulty,
  KangurDuelLobbyEntry,
  KangurDuelMode,
  KangurDuelOperation,
} from '@/features/kangur/shared/contracts/kangur-duels';
import { cn } from '@/features/kangur/shared/utils';
import {
  KangurButton,
  KangurGlassPanel,
  KangurInfoCard,
  KangurPanelRow,
  KangurSelectField,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
  KANGUR_WRAP_ROW_TIGHT_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  LOBBY_MODE_ACCENTS,
  formatDurationLabel,
  formatDuelDifficultyLabel,
  formatLobbyModeLabel,
  formatDuelOperationLabel,
  formatRelativeAge,
  formatSessionStatusLabel,
  resolveLobbyHostInitial,
  resolveSessionAccent,
} from '@/features/kangur/ui/pages/duels/duels-helpers';

type LobbyTranslations = ReturnType<typeof useTranslations>;
type LobbySortValue =
  | 'recent'
  | 'time_fast'
  | 'time_slow'
  | 'questions_low'
  | 'questions_high';
type LobbyJoinClickSource = 'invite_join' | 'join';
type LobbyLoginClickSource = 'banner' | 'empty_state_create';
type LobbyRefreshClickSource = 'manual' | 'error_state';
type LobbyEntryCardVariant = 'invite' | 'public';
type LobbyStatusChipAccent = 'amber' | 'emerald' | 'rose' | 'slate';

const DUEL_OPERATION_FILTER_OPTIONS: KangurDuelOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
];
const DUEL_DIFFICULTY_FILTER_OPTIONS: KangurDuelDifficulty[] = ['easy', 'medium', 'hard'];
const LOBBY_ENTRY_MOTION_CLASS =
  'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:ease-out';
const LOBBY_ENTRY_HOVER_CLASS =
  'transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-md focus-within:-translate-y-1 focus-within:shadow-md motion-reduce:transform-none motion-reduce:transition-none';

type DuelsLobbyPanelsProps = {
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

type LobbyEntryRuntime = {
  hostInitial: string;
  isFresh: boolean;
  estimatedDurationSec: number;
  isJoining: boolean;
  updatedLabel: string;
  operationLabel: string;
  difficultyLabel: string;
};

type LobbyEntryCardProps = {
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

type LobbyStatusChipEntry = {
  accent: LobbyStatusChipAccent;
  label: string;
};

const resolveCompactActionClassName = (isCoarsePointer: boolean): string =>
  isCoarsePointer
    ? 'w-full min-h-12 px-4 touch-manipulation select-none active:scale-[0.985] sm:w-auto'
    : 'w-full sm:w-auto';

const resolveLobbyEntryRuntime = ({
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

const resolveLobbyJoinButtonLabel = ({
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

const resolveLobbyJoinAriaLabel = ({
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

const resolveLobbyEntryCardLabel = ({
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

const resolveLobbyEntryMetaLabel = ({
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

const resolveLobbyEntryCardAccent = (variant: LobbyEntryCardVariant): 'indigo' | 'slate' =>
  variant === 'invite' ? 'indigo' : 'slate';

const resolveLobbyEntryCardTone = (variant: LobbyEntryCardVariant): 'accent' | 'neutral' =>
  variant === 'invite' ? 'accent' : 'neutral';

const resolveLobbyEntryButtonVariant = (variant: LobbyEntryCardVariant): 'primary' | 'secondary' =>
  variant === 'invite' ? 'primary' : 'secondary';

const resolveLobbyEntryVisibilityChip = ({
  variant,
  lobbyTranslations,
}: {
  variant: LobbyEntryCardVariant;
  lobbyTranslations: LobbyTranslations;
}): { accent: 'indigo' | 'slate'; label: string } =>
  variant === 'invite'
    ? { accent: 'indigo', label: lobbyTranslations('chips.private') }
    : { accent: 'slate', label: lobbyTranslations('chips.public') };

const resolveLobbyEntryAvatarClassName = (variant: LobbyEntryCardVariant): string =>
  variant === 'invite'
    ? 'flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-base font-extrabold text-indigo-700 sm:h-12 sm:w-12 sm:text-lg'
    : 'flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-extrabold text-indigo-700';

const resolveLobbyEntryNameClassName = (variant: LobbyEntryCardVariant): string =>
  variant === 'invite'
    ? 'text-sm font-semibold text-slate-800 truncate'
    : 'text-sm font-semibold text-slate-800';

const resolveLobbyEntryMetaContainerClassName = (variant: LobbyEntryCardVariant): string =>
  variant === 'invite' ? 'min-w-0' : '';

const resolveLobbyEntryBodyClassName = (variant: LobbyEntryCardVariant): string =>
  variant === 'invite' ? 'flex items-center kangur-panel-gap min-w-0' : 'flex items-center kangur-panel-gap';

const resolveLobbyStateStatusChips = ({
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

const resolveLobbyTimestampStatusChip = ({
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

const resolveLobbyCadenceStatusChip = ({
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

const resolveLobbyStatusChips = ({
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

function DuelsLobbyEntryHeader(props: {
  variant: LobbyEntryCardVariant;
  entry: KangurDuelLobbyEntry;
  runtime: LobbyEntryRuntime;
  lobbyTranslations: LobbyTranslations;
  compactActionClassName: string;
  canJoinLobby: boolean;
  isBusy: boolean;
  onJoinLobby: (entry: KangurDuelLobbyEntry, source: LobbyJoinClickSource) => void;
}): React.JSX.Element {
  const {
    variant,
    entry,
    runtime,
    lobbyTranslations,
    compactActionClassName,
    canJoinLobby,
    isBusy,
    onJoinLobby,
  } = props;
  const actionLabel = resolveLobbyJoinButtonLabel({
    canJoinLobby,
    isJoining: runtime.isJoining,
    lobbyTranslations,
  });
  const actionAriaLabel = resolveLobbyJoinAriaLabel({
    variant,
    canJoinLobby,
    lobbyTranslations,
    name: entry.host.displayName,
  });
  const joinSource: LobbyJoinClickSource = variant === 'invite' ? 'invite_join' : 'join';

  return (
    <KangurPanelRow className='sm:items-start sm:justify-between'>
      <div className={resolveLobbyEntryBodyClassName(variant)}>
        <div className={resolveLobbyEntryAvatarClassName(variant)} aria-hidden='true'>
          {runtime.hostInitial}
        </div>
        <div className={resolveLobbyEntryMetaContainerClassName(variant)}>
          <div className={resolveLobbyEntryNameClassName(variant)}>{entry.host.displayName}</div>
          <div className='text-xs text-slate-500 leading-tight'>
            {resolveLobbyEntryMetaLabel({ variant, runtime, lobbyTranslations })}
          </div>
        </div>
      </div>
      <KangurButton
        onClick={() => {
          onJoinLobby(entry, joinSource);
        }}
        variant={resolveLobbyEntryButtonVariant(variant)}
        disabled={isBusy || runtime.isJoining}
        aria-busy={runtime.isJoining ? 'true' : undefined}
        aria-label={actionAriaLabel}
        className={compactActionClassName}
      >
        {actionLabel}
      </KangurButton>
    </KangurPanelRow>
  );
}

function DuelsLobbyEntryChips(props: {
  variant: LobbyEntryCardVariant;
  entry: KangurDuelLobbyEntry;
  runtime: LobbyEntryRuntime;
  lobbyTranslations: LobbyTranslations;
  commonTranslations: LobbyTranslations;
}): React.JSX.Element {
  const { variant, entry, runtime, lobbyTranslations, commonTranslations } = props;
  const visibilityChip = resolveLobbyEntryVisibilityChip({ variant, lobbyTranslations });

  return (
    <div className={KANGUR_WRAP_ROW_CLASSNAME}>
      <KangurStatusChip accent={resolveSessionAccent(entry.status)} size='sm'>
        {formatSessionStatusLabel(entry.status, commonTranslations)}
      </KangurStatusChip>
      {runtime.isFresh ? (
        <KangurStatusChip accent='emerald' size='sm'>
          {lobbyTranslations('chips.fresh')}
        </KangurStatusChip>
      ) : null}
      <KangurStatusChip accent={LOBBY_MODE_ACCENTS[entry.mode]} size='sm'>
        {formatLobbyModeLabel(entry.mode, commonTranslations)}
      </KangurStatusChip>
      <KangurStatusChip accent='slate' size='sm'>
        {runtime.operationLabel}
      </KangurStatusChip>
      <KangurStatusChip accent='slate' size='sm'>
        {runtime.difficultyLabel}
      </KangurStatusChip>
      {entry.series ? (
        <KangurStatusChip accent='slate' size='sm'>
          BO{entry.series.bestOf}
        </KangurStatusChip>
      ) : null}
      <KangurStatusChip accent={visibilityChip.accent} size='sm'>
        {visibilityChip.label}
      </KangurStatusChip>
    </div>
  );
}

function DuelsLobbyEntryFacts(props: {
  entry: KangurDuelLobbyEntry;
  runtime: LobbyEntryRuntime;
  lobbyTranslations: LobbyTranslations;
}): React.JSX.Element {
  const { entry, runtime, lobbyTranslations } = props;

  return (
    <div className={`${KANGUR_WRAP_ROW_TIGHT_CLASSNAME} text-xs text-slate-500`}>
      <span>{lobbyTranslations('meta.questionCount', { count: entry.questionCount })}</span>
      <span>
        {lobbyTranslations('meta.secondsPerQuestion', {
          seconds: entry.timePerQuestionSec,
        })}
      </span>
      <span>
        {lobbyTranslations('meta.estimatedDuration', {
          duration: formatDurationLabel(runtime.estimatedDurationSec),
        })}
      </span>
    </div>
  );
}

function DuelsLobbyEntryCard(props: LobbyEntryCardProps): React.JSX.Element {
  const {
    entry,
    index,
    canJoinLobby,
    isBusy,
    joiningSessionId,
    relativeNow,
    lobbyFreshRef,
    lobbyFreshWindowMs,
    commonTranslations,
    lobbyTranslations,
    compactActionClassName,
    onJoinLobby,
    variant,
  } = props;
  const runtime = resolveLobbyEntryRuntime({
    entry,
    canJoinLobby,
    joiningSessionId,
    relativeNow,
    lobbyFreshRef,
    lobbyFreshWindowMs,
    commonTranslations,
  });

  return (
    <li>
      <KangurInfoCard
        accent={resolveLobbyEntryCardAccent(variant)}
        padding='md'
        tone={resolveLobbyEntryCardTone(variant)}
        className={cn(
          'flex flex-col kangur-panel-gap',
          LOBBY_ENTRY_MOTION_CLASS,
          LOBBY_ENTRY_HOVER_CLASS,
          runtime.isFresh && 'ring-2 ring-emerald-200/70'
        )}
        style={{ animationDelay: `${index * 70}ms` }}
        role='group'
        aria-label={resolveLobbyEntryCardLabel({
          variant,
          entry,
          runtime,
          lobbyTranslations,
        })}
      >
        <DuelsLobbyEntryHeader
          variant={variant}
          entry={entry}
          runtime={runtime}
          lobbyTranslations={lobbyTranslations}
          compactActionClassName={compactActionClassName}
          canJoinLobby={canJoinLobby}
          isBusy={isBusy}
          onJoinLobby={onJoinLobby}
        />
        <DuelsLobbyEntryChips
          variant={variant}
          entry={entry}
          runtime={runtime}
          lobbyTranslations={lobbyTranslations}
          commonTranslations={commonTranslations}
        />
        <DuelsLobbyEntryFacts
          entry={entry}
          runtime={runtime}
          lobbyTranslations={lobbyTranslations}
        />
      </KangurInfoCard>
    </li>
  );
}

function DuelsLobbyInviteSection(props: {
  inviteLobbyEntries: KangurDuelLobbyEntry[];
  inviteHeadingId: string;
  inviteListId: string;
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
}): React.JSX.Element | null {
  const {
    inviteLobbyEntries,
    inviteHeadingId,
    inviteListId,
    canJoinLobby,
    isBusy,
    joiningSessionId,
    relativeNow,
    lobbyFreshRef,
    lobbyFreshWindowMs,
    commonTranslations,
    lobbyTranslations,
    compactActionClassName,
    onJoinLobby,
  } = props;

  if (inviteLobbyEntries.length === 0) {
    return null;
  }

  return (
    <KangurGlassPanel
      className={cn('flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}
      padding='lg'
      surface='solid'
      role='region'
      aria-labelledby={inviteHeadingId}
    >
      <KangurPanelRow className='sm:flex-wrap sm:items-center sm:justify-between'>
        <div className='space-y-1'>
          <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
            <h3 id={inviteHeadingId} className='text-lg font-semibold text-slate-900 sm:text-xl'>
              {lobbyTranslations('invite.heading')}
            </h3>
            <KangurStatusChip accent='indigo' size='sm'>
              {inviteLobbyEntries.length}
            </KangurStatusChip>
          </div>
          <p className='text-sm leading-relaxed text-slate-600'>
            {lobbyTranslations('invite.description')}
          </p>
        </div>
      </KangurPanelRow>

      <ul
        className='grid kangur-panel-gap sm:grid-cols-2'
        role='list'
        aria-label={lobbyTranslations('invite.listAria')}
        id={inviteListId}
      >
        {inviteLobbyEntries.map((entry, index) => (
          <DuelsLobbyEntryCard
            key={entry.sessionId}
            entry={entry}
            index={index}
            canJoinLobby={canJoinLobby}
            isBusy={isBusy}
            joiningSessionId={joiningSessionId}
            relativeNow={relativeNow}
            lobbyFreshRef={lobbyFreshRef}
            lobbyFreshWindowMs={lobbyFreshWindowMs}
            commonTranslations={commonTranslations}
            lobbyTranslations={lobbyTranslations}
            compactActionClassName={compactActionClassName}
            onJoinLobby={onJoinLobby}
            variant='invite'
          />
        ))}
      </ul>
    </KangurGlassPanel>
  );
}

function DuelsLobbyStatusChips(props: {
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
}): React.JSX.Element {
  const chips = resolveLobbyStatusChips(props);

  return (
    <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
      {chips.map((chip) => (
        <KangurStatusChip key={`${chip.accent}-${chip.label}`} accent={chip.accent} size='sm'>
          {chip.label}
        </KangurStatusChip>
      ))}
    </div>
  );
}

function DuelsLobbyMainHeader(props: {
  lobbyHeadingId: string;
  lobbyDescriptionId: string;
  lobbyCountLabel: string;
  hasLobbyEntries: boolean;
  showPausedChip: boolean;
  showOfflineChip: boolean;
  showErrorChip: boolean;
  showConnectingChip: boolean;
  showLiveChip: boolean;
  showStaleChip: boolean;
  lobbyLastUpdatedAt: string | null;
  relativeNow: number;
  lobbyRefreshSeconds: number;
  isLobbyLoading: boolean;
  isOnline: boolean;
  compactActionClassName: string;
  commonTranslations: LobbyTranslations;
  lobbyTranslations: LobbyTranslations;
  onRefresh: () => void;
}): React.JSX.Element {
  const {
    lobbyHeadingId,
    lobbyDescriptionId,
    lobbyCountLabel,
    hasLobbyEntries,
    showPausedChip,
    showOfflineChip,
    showErrorChip,
    showConnectingChip,
    showLiveChip,
    showStaleChip,
    lobbyLastUpdatedAt,
    relativeNow,
    lobbyRefreshSeconds,
    isLobbyLoading,
    isOnline,
    compactActionClassName,
    commonTranslations,
    lobbyTranslations,
    onRefresh,
  } = props;

  return (
    <KangurPanelRow className='sm:items-center sm:justify-between'>
      <div className='space-y-1 min-w-0'>
        <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME} aria-live='polite' aria-atomic='true'>
          <h3 id={lobbyHeadingId} className='text-lg font-semibold text-slate-900 sm:text-xl'>
            {lobbyTranslations('heading')}
          </h3>
          <KangurStatusChip accent={hasLobbyEntries ? 'emerald' : 'slate'} size='sm'>
            {lobbyCountLabel}
          </KangurStatusChip>
        </div>
        <p id={lobbyDescriptionId} className='text-sm leading-relaxed text-slate-600 max-w-2xl'>
          {lobbyTranslations('description')}
        </p>
      </div>
      <div className={`w-full ${KANGUR_TIGHT_ROW_CLASSNAME} sm:w-auto sm:items-center sm:justify-end`}>
        <DuelsLobbyStatusChips
          showPausedChip={showPausedChip}
          showOfflineChip={showOfflineChip}
          showErrorChip={showErrorChip}
          showConnectingChip={showConnectingChip}
          showLiveChip={showLiveChip}
          showStaleChip={showStaleChip}
          lobbyLastUpdatedAt={lobbyLastUpdatedAt}
          relativeNow={relativeNow}
          lobbyRefreshSeconds={lobbyRefreshSeconds}
          commonTranslations={commonTranslations}
          lobbyTranslations={lobbyTranslations}
        />
        <KangurButton
          onClick={onRefresh}
          variant='ghost'
          disabled={isLobbyLoading || !isOnline}
          aria-label={lobbyTranslations('buttons.refreshAria')}
          aria-busy={isLobbyLoading}
          aria-live='polite'
          className={compactActionClassName}
        >
          {isLobbyLoading
            ? lobbyTranslations('buttons.refreshing')
            : lobbyTranslations('buttons.refresh')}
        </KangurButton>
      </div>
    </KangurPanelRow>
  );
}

function DuelsLobbyGuestBanner(props: {
  lobbyTranslations: LobbyTranslations;
  compactActionClassName: string;
  onRequireLogin: () => void;
}): React.JSX.Element {
  const { lobbyTranslations, compactActionClassName, onRequireLogin } = props;

  return (
    <KangurInfoCard accent='slate' padding='md' tone='accent' role='status' aria-live='polite'>
      <KangurPanelRow className='sm:items-center sm:justify-between'>
        <div className='text-sm text-slate-700'>{lobbyTranslations('guestBanner.description')}</div>
        <KangurButton
          onClick={onRequireLogin}
          variant='secondary'
          className={compactActionClassName}
        >
          {lobbyTranslations('buttons.loginToPlay')}
        </KangurButton>
      </KangurPanelRow>
    </KangurInfoCard>
  );
}

function DuelsLobbyFilters(props: {
  lobbyTranslations: LobbyTranslations;
  commonTranslations: LobbyTranslations;
  lobbyModeFilter: 'all' | KangurDuelMode;
  lobbyOperationFilter: 'all' | KangurDuelOperation;
  lobbyDifficultyFilter: 'all' | KangurDuelDifficulty;
  lobbySort: LobbySortValue;
  publicLobbyEntriesCount: number;
  filteredPublicLobbyEntriesCount: number;
  onModeChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onOperationChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onDifficultyChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onSortChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}): React.JSX.Element {
  const {
    lobbyTranslations,
    commonTranslations,
    lobbyModeFilter,
    lobbyOperationFilter,
    lobbyDifficultyFilter,
    lobbySort,
    publicLobbyEntriesCount,
    filteredPublicLobbyEntriesCount,
    onModeChange,
    onOperationChange,
    onDifficultyChange,
    onSortChange,
  } = props;

  return (
    <div className='grid w-full kangur-panel-gap rounded-2xl border border-slate-200/70 bg-white/70 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4'>
      <div className='min-w-0 space-y-1'>
        <div className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
          {lobbyTranslations('filters.mode.label')}
        </div>
        <KangurSelectField
          value={lobbyModeFilter}
          onChange={onModeChange}
          aria-label={lobbyTranslations('filters.mode.aria')}
          size='sm'
          accent='slate'
        >
          <option value='all'>{lobbyTranslations('filters.mode.all')}</option>
          <option value='challenge'>{lobbyTranslations('filters.mode.challenge')}</option>
          <option value='quick_match'>{lobbyTranslations('filters.mode.quickMatch')}</option>
        </KangurSelectField>
      </div>
      <div className='min-w-0 space-y-1'>
        <div className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
          {lobbyTranslations('filters.operation.label')}
        </div>
        <KangurSelectField
          value={lobbyOperationFilter}
          onChange={onOperationChange}
          aria-label={lobbyTranslations('filters.operation.aria')}
          size='sm'
          accent='slate'
        >
          <option value='all'>{lobbyTranslations('filters.operation.all')}</option>
          {DUEL_OPERATION_FILTER_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {formatDuelOperationLabel(value, commonTranslations)}
            </option>
          ))}
        </KangurSelectField>
      </div>
      <div className='min-w-0 space-y-1'>
        <div className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
          {lobbyTranslations('filters.difficulty.label')}
        </div>
        <KangurSelectField
          value={lobbyDifficultyFilter}
          onChange={onDifficultyChange}
          aria-label={lobbyTranslations('filters.difficulty.aria')}
          size='sm'
          accent='slate'
        >
          <option value='all'>{lobbyTranslations('filters.difficulty.all')}</option>
          {DUEL_DIFFICULTY_FILTER_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {formatDuelDifficultyLabel(value, commonTranslations)}
            </option>
          ))}
        </KangurSelectField>
      </div>
      <div className='min-w-0 space-y-1'>
        <div className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
          {lobbyTranslations('filters.sort.label')}
        </div>
        <KangurSelectField
          value={lobbySort}
          onChange={onSortChange}
          aria-label={lobbyTranslations('filters.sort.aria')}
          size='sm'
          accent='slate'
        >
          <option value='recent'>{lobbyTranslations('filters.sort.recent')}</option>
          <option value='time_fast'>{lobbyTranslations('filters.sort.timeFast')}</option>
          <option value='time_slow'>{lobbyTranslations('filters.sort.timeSlow')}</option>
          <option value='questions_low'>{lobbyTranslations('filters.sort.questionsLow')}</option>
          <option value='questions_high'>{lobbyTranslations('filters.sort.questionsHigh')}</option>
        </KangurSelectField>
      </div>
      {publicLobbyEntriesCount > 0 ? (
        <div className='text-xs text-slate-500 sm:col-span-2 sm:text-right lg:col-span-4'>
          {lobbyTranslations('meta.visibleCount', { count: filteredPublicLobbyEntriesCount })}
        </div>
      ) : null}
    </div>
  );
}

function DuelsLobbyErrorCard(props: {
  lobbyError: string;
  lobbyTranslations: LobbyTranslations;
  isLobbyLoading: boolean;
  isOnline: boolean;
  compactActionClassName: string;
  onRetry: () => void;
}): React.JSX.Element {
  const {
    lobbyError,
    lobbyTranslations,
    isLobbyLoading,
    isOnline,
    compactActionClassName,
    onRetry,
  } = props;

  return (
    <KangurInfoCard accent='rose' padding='md' tone='accent' role='alert' aria-live='assertive'>
      <KangurPanelRow className='sm:items-center sm:justify-between'>
        <div className='text-sm text-rose-900'>{lobbyError}</div>
        <KangurButton
          onClick={onRetry}
          variant='secondary'
          disabled={isLobbyLoading || !isOnline}
          aria-busy={isLobbyLoading}
          className={compactActionClassName}
        >
          {lobbyTranslations('buttons.retry')}
        </KangurButton>
      </KangurPanelRow>
    </KangurInfoCard>
  );
}

function DuelsLobbyLoadingState(props: {
  lobbyTranslations: LobbyTranslations;
}): React.JSX.Element {
  const { lobbyTranslations } = props;

  return (
    <div className='grid kangur-panel-gap sm:grid-cols-2' role='status' aria-live='polite'>
      <span className='sr-only'>{lobbyTranslations('loading')}</span>
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={`lobby-skeleton-${index}`}
          className='flex flex-col kangur-panel-gap rounded-2xl border border-slate-200 bg-white/70 p-4 animate-pulse'
          aria-hidden='true'
        >
          <div className='flex items-center kangur-panel-gap'>
            <div className='h-12 w-12 rounded-2xl bg-slate-200/70' />
            <div className='flex-1 space-y-2'>
              <div className='h-3 w-32 rounded-full bg-slate-200/70' />
              <div className='h-2 w-24 rounded-full bg-slate-200/70' />
            </div>
          </div>
          <div className={KANGUR_WRAP_ROW_CLASSNAME}>
            <div className='h-5 w-16 rounded-full bg-slate-200/70' />
            <div className='h-5 w-20 rounded-full bg-slate-200/70' />
            <div className='h-5 w-24 rounded-full bg-slate-200/70' />
          </div>
        </div>
      ))}
    </div>
  );
}

function DuelsLobbyNoEntriesState(props: {
  canJoinLobby: boolean;
  isBusy: boolean;
  lobbyTranslations: LobbyTranslations;
  compactActionClassName: string;
  onCreateChallenge: () => void;
}): React.JSX.Element {
  const { canJoinLobby, isBusy, lobbyTranslations, compactActionClassName, onCreateChallenge } = props;

  return (
    <KangurInfoCard accent='slate' padding='md' tone='accent' role='status' aria-live='polite'>
      <div className='flex flex-col kangur-panel-gap'>
        <div className='text-sm text-slate-700'>{lobbyTranslations('empty.noEntries')}</div>
        <KangurButton
          onClick={onCreateChallenge}
          variant='secondary'
          disabled={isBusy}
          className={compactActionClassName}
        >
          {canJoinLobby
            ? lobbyTranslations('buttons.createChallenge')
            : lobbyTranslations('buttons.loginToCreate')}
        </KangurButton>
      </div>
    </KangurInfoCard>
  );
}

function DuelsLobbyNoMatchesState(props: {
  lobbyTranslations: LobbyTranslations;
  isBusy: boolean;
  compactActionClassName: string;
  onResetFilters: () => void;
}): React.JSX.Element {
  const { lobbyTranslations, isBusy, compactActionClassName, onResetFilters } = props;

  return (
    <KangurInfoCard accent='slate' padding='md' tone='accent' role='status' aria-live='polite'>
      <div className='flex flex-col kangur-panel-gap'>
        <div className='text-sm text-slate-700'>{lobbyTranslations('empty.noMatches')}</div>
        <KangurButton
          onClick={onResetFilters}
          variant='ghost'
          disabled={isBusy}
          className={compactActionClassName}
        >
          {lobbyTranslations('buttons.showAll')}
        </KangurButton>
      </div>
    </KangurInfoCard>
  );
}

function DuelsLobbyPublicList(props: {
  filteredPublicLobbyEntries: KangurDuelLobbyEntry[];
  canJoinLobby: boolean;
  isBusy: boolean;
  joiningSessionId: string | null;
  relativeNow: number;
  lobbyFreshRef: MutableRefObject<Map<string, number>>;
  lobbyFreshWindowMs: number;
  commonTranslations: LobbyTranslations;
  lobbyTranslations: LobbyTranslations;
  compactActionClassName: string;
  lobbyListId: string;
  onJoinLobby: (entry: KangurDuelLobbyEntry, source: LobbyJoinClickSource) => void;
}): React.JSX.Element {
  const {
    filteredPublicLobbyEntries,
    canJoinLobby,
    isBusy,
    joiningSessionId,
    relativeNow,
    lobbyFreshRef,
    lobbyFreshWindowMs,
    commonTranslations,
    lobbyTranslations,
    compactActionClassName,
    lobbyListId,
    onJoinLobby,
  } = props;

  return (
    <ul
      className='grid kangur-panel-gap sm:grid-cols-2'
      role='list'
      aria-label={lobbyTranslations('publicListAria')}
      id={lobbyListId}
    >
      {filteredPublicLobbyEntries.map((entry, index) => (
        <DuelsLobbyEntryCard
          key={entry.sessionId}
          entry={entry}
          index={index}
          canJoinLobby={canJoinLobby}
          isBusy={isBusy}
          joiningSessionId={joiningSessionId}
          relativeNow={relativeNow}
          lobbyFreshRef={lobbyFreshRef}
          lobbyFreshWindowMs={lobbyFreshWindowMs}
          commonTranslations={commonTranslations}
          lobbyTranslations={lobbyTranslations}
          compactActionClassName={compactActionClassName}
          onJoinLobby={onJoinLobby}
          variant='public'
        />
      ))}
    </ul>
  );
}

function DuelsLobbyPublicState(props: {
  isLobbyLoading: boolean;
  hasAnyPublicLobbyEntries: boolean;
  hasVisiblePublicLobbyEntries: boolean;
  canJoinLobby: boolean;
  isBusy: boolean;
  joiningSessionId: string | null;
  filteredPublicLobbyEntries: KangurDuelLobbyEntry[];
  relativeNow: number;
  lobbyFreshRef: MutableRefObject<Map<string, number>>;
  lobbyFreshWindowMs: number;
  commonTranslations: LobbyTranslations;
  lobbyTranslations: LobbyTranslations;
  compactActionClassName: string;
  lobbyListId: string;
  onJoinLobby: (entry: KangurDuelLobbyEntry, source: LobbyJoinClickSource) => void;
  onCreateChallenge: () => void;
  onResetFilters: () => void;
}): React.JSX.Element {
  const {
    isLobbyLoading,
    hasAnyPublicLobbyEntries,
    hasVisiblePublicLobbyEntries,
    canJoinLobby,
    isBusy,
    joiningSessionId,
    filteredPublicLobbyEntries,
    relativeNow,
    lobbyFreshRef,
    lobbyFreshWindowMs,
    commonTranslations,
    lobbyTranslations,
    compactActionClassName,
    lobbyListId,
    onJoinLobby,
    onCreateChallenge,
    onResetFilters,
  } = props;

  if (isLobbyLoading && !hasAnyPublicLobbyEntries) {
    return <DuelsLobbyLoadingState lobbyTranslations={lobbyTranslations} />;
  }
  if (!hasAnyPublicLobbyEntries) {
    return (
      <DuelsLobbyNoEntriesState
        canJoinLobby={canJoinLobby}
        isBusy={isBusy}
        lobbyTranslations={lobbyTranslations}
        compactActionClassName={compactActionClassName}
        onCreateChallenge={onCreateChallenge}
      />
    );
  }
  if (!hasVisiblePublicLobbyEntries) {
    return (
      <DuelsLobbyNoMatchesState
        lobbyTranslations={lobbyTranslations}
        isBusy={isBusy}
        compactActionClassName={compactActionClassName}
        onResetFilters={onResetFilters}
      />
    );
  }
  return (
    <DuelsLobbyPublicList
      filteredPublicLobbyEntries={filteredPublicLobbyEntries}
      canJoinLobby={canJoinLobby}
      isBusy={isBusy}
      joiningSessionId={joiningSessionId}
      relativeNow={relativeNow}
      lobbyFreshRef={lobbyFreshRef}
      lobbyFreshWindowMs={lobbyFreshWindowMs}
      commonTranslations={commonTranslations}
      lobbyTranslations={lobbyTranslations}
      compactActionClassName={compactActionClassName}
      lobbyListId={lobbyListId}
      onJoinLobby={onJoinLobby}
    />
  );
}

function DuelsLobbyMainSection(props: {
  lobbyHeadingId: string;
  lobbyDescriptionId: string;
  lobbyListId: string;
  lobbyEntries: KangurDuelLobbyEntry[];
  lobbyCountLabel: string;
  lobbyLastUpdatedAt: string | null;
  relativeNow: number;
  lobbyRefreshSeconds: number;
  lobbyStreamStatus: 'idle' | 'connecting' | 'connected' | 'fallback';
  isLobbyLoading: boolean;
  lobbyModeFilter: 'all' | KangurDuelMode;
  lobbyOperationFilter: 'all' | KangurDuelOperation;
  lobbyDifficultyFilter: 'all' | KangurDuelDifficulty;
  lobbySort: LobbySortValue;
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
  compactActionClassName: string;
  commonTranslations: LobbyTranslations;
  lobbyTranslations: LobbyTranslations;
  lobbyFreshRef: MutableRefObject<Map<string, number>>;
  lobbyFreshWindowMs: number;
  onRefresh: () => void;
  onGuestLogin: () => void;
  onModeChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onOperationChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onDifficultyChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onSortChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onRetry: () => void;
  onJoinLobby: (entry: KangurDuelLobbyEntry, source: LobbyJoinClickSource) => void;
  onCreateChallenge: () => void;
  onResetFilters: () => void;
}): React.JSX.Element {
  const {
    lobbyHeadingId,
    lobbyDescriptionId,
    lobbyListId,
    lobbyEntries,
    lobbyCountLabel,
    lobbyLastUpdatedAt,
    relativeNow,
    lobbyRefreshSeconds,
    lobbyStreamStatus,
    isLobbyLoading,
    lobbyModeFilter,
    lobbyOperationFilter,
    lobbyDifficultyFilter,
    lobbySort,
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
    compactActionClassName,
    commonTranslations,
    lobbyTranslations,
    lobbyFreshRef,
    lobbyFreshWindowMs,
    onRefresh,
    onGuestLogin,
    onModeChange,
    onOperationChange,
    onDifficultyChange,
    onSortChange,
    onRetry,
    onJoinLobby,
    onCreateChallenge,
    onResetFilters,
  } = props;
  const showPausedChip = !isPageActive;
  const showOfflineChip = !isOnline;
  const showStaleChip = isLobbyStale && !lobbyError && isPageActive && isOnline;
  const showErrorChip = Boolean(lobbyError) && !showOfflineChip;
  const showLiveChip = lobbyStreamStatus === 'connected';
  const showConnectingChip = lobbyStreamStatus === 'connecting';

  return (
    <KangurGlassPanel
      className={cn('flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}
      padding='lg'
      surface='solid'
      role='region'
      aria-labelledby={lobbyHeadingId}
      aria-describedby={lobbyDescriptionId}
      aria-busy={isLobbyLoading}
    >
      <DuelsLobbyMainHeader
        lobbyHeadingId={lobbyHeadingId}
        lobbyDescriptionId={lobbyDescriptionId}
        lobbyCountLabel={lobbyCountLabel}
        hasLobbyEntries={lobbyEntries.length > 0}
        showPausedChip={showPausedChip}
        showOfflineChip={showOfflineChip}
        showErrorChip={showErrorChip}
        showConnectingChip={showConnectingChip}
        showLiveChip={showLiveChip}
        showStaleChip={showStaleChip}
        lobbyLastUpdatedAt={lobbyLastUpdatedAt}
        relativeNow={relativeNow}
        lobbyRefreshSeconds={lobbyRefreshSeconds}
        isLobbyLoading={isLobbyLoading}
        isOnline={isOnline}
        compactActionClassName={compactActionClassName}
        commonTranslations={commonTranslations}
        lobbyTranslations={lobbyTranslations}
        onRefresh={onRefresh}
      />

      {!canJoinLobby ? (
        <DuelsLobbyGuestBanner
          lobbyTranslations={lobbyTranslations}
          compactActionClassName={compactActionClassName}
          onRequireLogin={onGuestLogin}
        />
      ) : null}

      <DuelsLobbyFilters
        lobbyTranslations={lobbyTranslations}
        commonTranslations={commonTranslations}
        lobbyModeFilter={lobbyModeFilter}
        lobbyOperationFilter={lobbyOperationFilter}
        lobbyDifficultyFilter={lobbyDifficultyFilter}
        lobbySort={lobbySort}
        publicLobbyEntriesCount={publicLobbyEntries.length}
        filteredPublicLobbyEntriesCount={filteredPublicLobbyEntries.length}
        onModeChange={onModeChange}
        onOperationChange={onOperationChange}
        onDifficultyChange={onDifficultyChange}
        onSortChange={onSortChange}
      />

      {lobbyError ? (
        <DuelsLobbyErrorCard
          lobbyError={lobbyError}
          lobbyTranslations={lobbyTranslations}
          isLobbyLoading={isLobbyLoading}
          isOnline={isOnline}
          compactActionClassName={compactActionClassName}
          onRetry={onRetry}
        />
      ) : null}

      <DuelsLobbyPublicState
        isLobbyLoading={isLobbyLoading}
        hasAnyPublicLobbyEntries={hasAnyPublicLobbyEntries}
        hasVisiblePublicLobbyEntries={hasVisiblePublicLobbyEntries}
        canJoinLobby={canJoinLobby}
        isBusy={isBusy}
        joiningSessionId={joiningSessionId}
        filteredPublicLobbyEntries={filteredPublicLobbyEntries}
        relativeNow={relativeNow}
        lobbyFreshRef={lobbyFreshRef}
        lobbyFreshWindowMs={lobbyFreshWindowMs}
        commonTranslations={commonTranslations}
        lobbyTranslations={lobbyTranslations}
        compactActionClassName={compactActionClassName}
        lobbyListId={lobbyListId}
        onJoinLobby={onJoinLobby}
        onCreateChallenge={onCreateChallenge}
        onResetFilters={onResetFilters}
      />
    </KangurGlassPanel>
  );
}

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
