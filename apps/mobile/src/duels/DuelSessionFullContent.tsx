import { View } from 'react-native';
import {
  BadgesCard,
  LessonCheckpointsCard,
  LessonMasteryCard,
  NextStepsCard,
} from './duels-primitives';
import { DuelSessionActionsCard } from './DuelSessionActionsCard';
import { DuelSessionDetailsCard } from './DuelSessionDetailsCard';
import { DuelSessionPlayersCard } from './DuelSessionPlayersCard';
import { DuelSessionQuestionCard } from './DuelSessionQuestionCard';
import { DuelSessionReactionsCard } from './DuelSessionReactionsCard';
import { DuelSessionSeriesCard } from './DuelSessionSeriesCard';
import { DuelSessionSummaryCard } from './DuelSessionSummaryCard';
import { DuelSessionWaitingRoomCard } from './DuelSessionWaitingRoomCard';
import { type DuelsSessionViewProps } from './duels-screen-session-view';

export function DuelSessionFullContent(props: DuelsSessionViewProps): React.JSX.Element {
  const { canShareInvite, copy, duel, hasWaitingSession, inviteeName, inviteShareError, isFinishedSession, isLobbyActionPending, locale, onHandleInviteShare, onHandleRematch, onOpenLobby, roundProgress, sessionTimelineItems } = props;
  return (
    <View>
      <DuelSessionDetailsCard copy={copy} duel={duel} hasWaitingSession={hasWaitingSession} locale={locale} roundProgress={roundProgress} sessionTimelineItems={sessionTimelineItems} />
      <DuelSessionSeriesCard copy={copy} duel={duel} locale={locale} />
      <DuelSessionPlayersCard copy={copy} duel={duel} locale={locale} />
      <DuelSessionReactionsCard copy={copy} duel={duel} locale={locale} />
      <DuelSessionWaitingRoomCard canShareInvite={canShareInvite} copy={copy} duel={duel} inviteeName={inviteeName} inviteShareError={inviteShareError} onHandleInviteShare={onHandleInviteShare} />
      <DuelSessionQuestionCard copy={copy} duel={duel} />
      <DuelSessionSummaryCard copy={copy} duel={duel} isFinishedSession={isFinishedSession} isLobbyActionPending={isLobbyActionPending} locale={locale} onHandleRematch={onHandleRematch} onOpenLobby={onOpenLobby} />
      <DuelSessionActionsCard copy={copy} duel={duel} hasWaitingSession={hasWaitingSession} isFinishedSession={isFinishedSession} onOpenLobby={onOpenLobby} />
      <LessonCheckpointsCard context='session' />
      <LessonMasteryCard context='session' />
      <BadgesCard context='session' />
      <NextStepsCard context='session' />
    </View>
  );
}
