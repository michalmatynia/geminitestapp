import { type UseKangurMobileDuelSessionResult as DuelSessionState } from './useKangurMobileDuelSession';
import { type DuelCopy, type DuelLocale, type DuelRoundProgress } from './duels-screen-session-view';
import { KangurMobileCard as Card } from '../shared/KangurMobileUi';
import { DetailsBody } from './components/DetailsBody';

export type DuelSessionDetailsCardProps = {
  copy: DuelCopy;
  duel: DuelSessionState;
  hasWaitingSession: boolean;
  locale: DuelLocale;
  roundProgress: DuelRoundProgress;
  sessionTimelineItems: string[];
};

export function DuelSessionDetailsCard({
  copy,
  duel,
  hasWaitingSession,
  locale,
  roundProgress,
  sessionTimelineItems,
}: DuelSessionDetailsCardProps): React.JSX.Element {
  const session = duel.session;
  if (session === null) return <></>;
  return (
    <Card>
      <DetailsBody
        copy={copy}
        duel={duel}
        hasWaitingSession={hasWaitingSession}
        locale={locale}
        roundProgress={roundProgress}
        session={session}
        sessionTimelineItems={sessionTimelineItems}
      />
    </Card>
  );
}
