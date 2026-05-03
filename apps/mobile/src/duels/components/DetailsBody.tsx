import React from 'react';
import { type KangurDuelSession } from '@kangur/contracts/kangur-duels';
import { type UseKangurMobileDuelSessionResult as DuelSessionState } from '../useKangurMobileDuelSession';
import { type DuelCopy, type DuelLocale, type DuelRoundProgress } from '../duels-screen-session-view';
import { MessageCard } from '../duels-primitives';
import { DetailsHeader } from './DetailsHeader';
import { DetailsPills } from './DetailsPills';
import { RoundProgressBar } from './RoundProgressBar';
import { SessionTimeline } from './SessionTimeline';
import { SpectatorMessage } from './SpectatorMessage';

interface DetailsBodyProps {
  copy: DuelCopy;
  duel: DuelSessionState;
  hasWaitingSession: boolean;
  locale: DuelLocale;
  roundProgress: DuelRoundProgress;
  session: KangurDuelSession;
  sessionTimelineItems: string[];
}

export function DetailsBody(props: DetailsBodyProps): React.JSX.Element {
  const { copy, duel, hasWaitingSession, locale, roundProgress, session, sessionTimelineItems } = props;
  return (
    <>
      <DetailsHeader copy={copy} locale={locale} session={session} />
      <DetailsPills copy={copy} duel={duel} locale={locale} />
      {!hasWaitingSession ? (
        <RoundProgressBar locale={locale} roundProgress={roundProgress} status={session.status} />
      ) : null}
      {sessionTimelineItems.length > 0 ? (
        <SessionTimeline copy={copy} items={sessionTimelineItems} />
      ) : null}
      {duel.isSpectating ? <SpectatorMessage copy={copy} isAuthenticated={duel.isAuthenticated} /> : null}
      {duel.actionError !== null ? (
        <MessageCard title={copy({ de: 'Aktion fehlgeschlagen', en: 'Action failed', pl: 'Akcja nie powiodła się' })} description={duel.actionError} tone='error' />
      ) : null}
    </>
  );
}
