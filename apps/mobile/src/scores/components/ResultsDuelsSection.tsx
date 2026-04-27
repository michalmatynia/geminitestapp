import type { Href } from 'expo-router';
import { ResultsDuelsCard, type ResultsDuelsState } from '../results-duels-card';

interface ResultsDuelsSectionProps {
  duelResults: ResultsDuelsState;
  duelsHref: Href;
  openDuelSession: (sessionId: string) => void;
}

export function ResultsDuelsSection({
  duelResults,
  duelsHref,
  openDuelSession,
}: ResultsDuelsSectionProps): React.JSX.Element {
  return (
    <ResultsDuelsCard
      duelResults={duelResults}
      duelsHref={duelsHref}
      openDuelSession={openDuelSession}
    />
  );
}
