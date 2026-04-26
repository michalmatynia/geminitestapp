import { View, Text } from 'react-native';
import { Card, LinkButton } from '../../shared/KangurMobileUi';
import { ResultsDuelsCard } from './results-duels-card';

interface ResultsDuelsSectionProps {
  duelResults: any; // Using any as the original type was implicit
  duelsHref: any;
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
