'use client';

import type { MutableRefObject } from 'react';
import React from 'react';

import type { KangurDuelLobbyEntry } from '@/features/kangur/shared/contracts/kangur-duels';
import { cn } from '@/features/kangur/shared/utils';
import {
  KangurButton,
  KangurGlassPanel,
  KangurInfoCard,
  KangurPanelRow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
  KANGUR_WRAP_ROW_TIGHT_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import {
  LOBBY_MODE_ACCENTS,
  formatLobbyModeLabel,
  formatSessionStatusLabel,
  resolveSessionAccent,
} from '@/features/kangur/ui/pages/duels/duels-helpers';

import {
  formatDurationLabel,
  LOBBY_ENTRY_HOVER_CLASS,
  LOBBY_ENTRY_MOTION_CLASS,
  type LobbyEntryCardProps,
  type LobbyEntryCardVariant,
  type LobbyEntryRuntime,
  type LobbyJoinClickSource,
  type LobbyTranslations,
  resolveLobbyEntryAvatarClassName,
  resolveLobbyEntryBodyClassName,
  resolveLobbyEntryButtonVariant,
  resolveLobbyEntryCardAccent,
  resolveLobbyEntryCardLabel,
  resolveLobbyEntryCardTone,
  resolveLobbyEntryMetaContainerClassName,
  resolveLobbyEntryMetaLabel,
  resolveLobbyEntryNameClassName,
  resolveLobbyEntryRuntime,
  resolveLobbyEntryVisibilityChip,
  resolveLobbyJoinAriaLabel,
  resolveLobbyJoinButtonLabel,
} from './DuelsLobbyPanels.shared';

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

export function DuelsLobbyInviteSection(props: {
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

export function DuelsLobbyPublicList(props: {
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
