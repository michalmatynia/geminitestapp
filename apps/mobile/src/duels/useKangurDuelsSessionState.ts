import { type KangurDuelSession, type KangurDuelPlayer } from '@kangur/contracts/kangur-duels';
import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { formatKangurMobileScoreDateTime } from '../scores/mobileScoreSummary';
import { type UseKangurMobileDuelSessionResult as DuelSessionState } from './useKangurMobileDuelSession';
import {
  isWaitingSessionStatus,
  resolveRoundProgress
} from './utils/duels-status';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type DuelLocale = ReturnType<typeof useKangurMobileI18n>['locale'];

function getInviteeName(duel: DuelSessionState, copy: DuelCopy): string {
  const rawInviteeName = duel.session?.invitedLearnerName?.trim();
  if (typeof rawInviteeName === 'string' && rawInviteeName !== '') {
    return rawInviteeName;
  }
  return copy({
    de: 'der zweiten Person',
    en: 'the other player',
    pl: 'drugiej osoby',
  });
}

function getSessionTimelineItems(
  duel: DuelSessionState,
  copy: DuelCopy,
  locale: DuelLocale,
): string[] {
  const items: string[] = [];
  if (duel.session === null) {
    return items;
  }

  items.push(
    copy({
      de: `Erstellt ${formatKangurMobileScoreDateTime(duel.session.createdAt, locale)}`,
      en: `Created ${formatKangurMobileScoreDateTime(duel.session.createdAt, locale)}`,
      pl: `Utworzono ${formatKangurMobileScoreDateTime(duel.session.createdAt, locale)}`,
    }),
  );
  if (duel.session.startedAt !== null) {
    items.push(
      copy({
        de: `Gestartet ${formatKangurMobileScoreDateTime(duel.session.startedAt, locale)}`,
        en: `Started ${formatKangurMobileScoreDateTime(duel.session.startedAt, locale)}`,
        pl: `Rozpoczęto ${formatKangurMobileScoreDateTime(duel.session.startedAt, locale)}`,
      }),
    );
  }
  items.push(
    copy({
      de: `Zuletzt aktualisiert ${formatKangurMobileScoreDateTime(duel.session.updatedAt, locale)}`,
      en: `Last updated ${formatKangurMobileScoreDateTime(duel.session.updatedAt, locale)}`,
      pl: `Ostatnia aktualizacja ${formatKangurMobileScoreDateTime(duel.session.updatedAt, locale)}`,
    }),
  );
  if (duel.session.endedAt !== null) {
    items.push(
      copy({
        de: `Beendet ${formatKangurMobileScoreDateTime(duel.session.endedAt, locale)}`,
        en: `Ended ${formatKangurMobileScoreDateTime(duel.session.endedAt, locale)}`,
        pl: `Zakończenie ${formatKangurMobileScoreDateTime(duel.session.endedAt, locale)}`,
      }),
    );
  }
  return items;
}

function resolveIsInvitedLearnerMissing(session: KangurDuelSession | null): boolean {
  if (session?.invitedLearnerId === null || session?.invitedLearnerId === undefined) {
    return false;
  }
  const invitedId = session.invitedLearnerId;
  return !session.players.some(
    (p) => p.learnerId === invitedId && p.status !== 'left',
  );
}

function resolveActivePlayersCount(session: KangurDuelSession | null): number {
  return session?.players.filter((player) => player.status !== 'left').length ?? 0;
}

function resolveHasPendingInvitedPlayer(session: KangurDuelSession | null): boolean {
  return session?.players.some((player) => player.status === 'invited') ?? false;
}

function resolveCanShareInvite(options: {
  session: KangurDuelSession | null;
  player: KangurDuelPlayer | null;
  isSpectating: boolean;
  hasWaitingSession: boolean;
  hasPendingInvitedPlayer: boolean;
  isInvitedLearnerMissing: boolean;
  needsMorePlayersToStart: boolean;
}): boolean {
  const { session, player, isSpectating, hasWaitingSession, hasPendingInvitedPlayer, isInvitedLearnerMissing, needsMorePlayersToStart } = options;
  return (
    session !== null &&
    player !== null &&
    !isSpectating &&
    session.visibility === 'private' &&
    hasWaitingSession &&
    (hasPendingInvitedPlayer || isInvitedLearnerMissing || needsMorePlayersToStart)
  );
}

function resolveHasWaitingSession(session: KangurDuelSession | null): boolean {
  return session !== null && isWaitingSessionStatus(session.status);
}

function resolveIsFinishedSession(session: KangurDuelSession | null): boolean {
  return session !== null && (session.status === 'completed' || session.status === 'aborted');
}

function resolveNeedsMorePlayersToStart(session: KangurDuelSession | null, activePlayersCount: number): boolean {
  return session !== null && activePlayersCount < (session.minPlayersToStart ?? 2);
}

export type UseKangurDuelsSessionStateResult = {
  activePlayersCount: number;
  canShareInvite: boolean;
  hasPendingInvitedPlayer: boolean;
  hasWaitingSession: boolean;
  inviteeName: string;
  isFinishedSession: boolean;
  isInvitedLearnerMissing: boolean;
  needsMorePlayersToStart: boolean;
  roundProgress: {
    total: number;
    current: number;
    percent: number;
  } | null;
  sessionTimelineItems: string[];
};

export function useKangurDuelsSessionState(
  copy: DuelCopy,
  locale: DuelLocale,
  duel: DuelSessionState,
): UseKangurDuelsSessionStateResult {
  const session = duel.session;
  const hasWaitingSession = resolveHasWaitingSession(session);
  const isFinishedSession = resolveIsFinishedSession(session);
  const roundProgress = session !== null
    ? resolveRoundProgress(session, duel.player, duel.isSpectating)
    : null;
  
  const activePlayersCount = resolveActivePlayersCount(session);
  const hasPendingInvitedPlayer = resolveHasPendingInvitedPlayer(session);
  const isInvitedLearnerMissing = resolveIsInvitedLearnerMissing(session);
  const needsMorePlayersToStart = resolveNeedsMorePlayersToStart(session, activePlayersCount);
  
  const canShareInvite = resolveCanShareInvite({
    session,
    player: duel.player,
    isSpectating: duel.isSpectating,
    hasWaitingSession,
    hasPendingInvitedPlayer,
    isInvitedLearnerMissing,
    needsMorePlayersToStart,
  });

  return {
    activePlayersCount,
    canShareInvite,
    hasPendingInvitedPlayer,
    hasWaitingSession,
    inviteeName: getInviteeName(duel, copy),
    isFinishedSession,
    isInvitedLearnerMissing,
    needsMorePlayersToStart,
    roundProgress,
    sessionTimelineItems: getSessionTimelineItems(duel, copy, locale),
  };
}
