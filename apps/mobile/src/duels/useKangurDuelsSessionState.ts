import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { formatKangurMobileScoreDateTime } from '../scores/mobileScoreSummary';
import { type UseKangurMobileDuelSessionResult as DuelSessionState } from './useKangurMobileDuelSession';
import {
  isWaitingSessionStatus,
  resolveRoundProgress,
} from '../utils/duels-ui';

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
  const hasWaitingSession = duel.session !== null && isWaitingSessionStatus(duel.session.status);
  const isFinishedSession = duel.session !== null && (duel.session.status === 'completed' || duel.session.status === 'aborted');
  const roundProgress = duel.session !== null
    ? resolveRoundProgress(duel.session, duel.player, duel.isSpectating)
    : null;
  const activePlayersCount =
    duel.session?.players.filter((player) => player.status !== 'left').length ?? 0;
  const hasPendingInvitedPlayer =
    duel.session?.players.some((player) => player.status === 'invited') ?? false;

  let isInvitedLearnerMissing = false;
  if (duel.session?.invitedLearnerId !== null && duel.session?.invitedLearnerId !== undefined) {
    const invitedId = duel.session.invitedLearnerId;
    isInvitedLearnerMissing = !duel.session.players.some(
      (p) => p.learnerId === invitedId && p.status !== 'left',
    );
  }

  const needsMorePlayersToStart = duel.session !== null && activePlayersCount < (duel.session.minPlayersToStart ?? 2);
  const canShareInvite = Boolean(
    duel.session !== null &&
      duel.player !== null &&
      !duel.isSpectating &&
      duel.session.visibility === 'private' &&
      hasWaitingSession &&
      (hasPendingInvitedPlayer || isInvitedLearnerMissing || needsMorePlayersToStart),
  );

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
