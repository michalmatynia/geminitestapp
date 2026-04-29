import { View } from 'react-native';

import { createKangurDuelsHref } from '../duels/duelsHref';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileScrollScreen,
  KangurMobileSectionTitle,
} from '../shared/KangurMobileUi';
import {
  PLAN_ROUTE,
} from './leaderboard-primitives';
import { useKangurMobileLeaderboard } from './useKangurLeaderboard';
import { useKangurMobileLeaderboardDuels } from './useKangurMobileLeaderboardDuels';
import { LeaderboardStatsSection } from './components/LeaderboardStatsSection';
import { LeaderboardStatus } from './components/LeaderboardStatus';

export function KangurLeaderboardScreen(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const {
    error,
    isLoading,
    isRestoringAuth,
    items,
    visibleCount,
  } = useKangurMobileLeaderboard();
  const duelLeaderboard = useKangurMobileLeaderboardDuels();
  
  return (
    <KangurMobileScrollScreen
      contentContainerStyle={{
        gap: 18,
        paddingHorizontal: 20,
        paddingVertical: 24,
      }}
    >
        <View style={{ alignItems: 'flex-start', gap: 14 }}>
          <KangurMobileSectionTitle
            title={copy({ de: 'Rangliste', en: 'Leaderboard', pl: 'Ranking' })}
            subtitle={copy({
              de: 'Prüfe die letzten Ergebnisse, vergleiche das Duelltempo und springe direkt zurück in die nächsten Lernschritte.',
              en: 'Check the latest results, compare duel momentum, and jump straight back into your next study steps.',
              pl: 'Sprawdź ostatnie wyniki, porównaj tempo w pojedynkach i od razu wróć do kolejnych kroków nauki.',
            })}
          />

          <LeaderboardStatsSection
            copy={copy}
            duelEntriesCount={duelLeaderboard.entries.length}
            duelLoading={duelLeaderboard.isLoading}
            masteryTrackedCount={0}
            visibleCount={visibleCount}
          />

          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            <LinkButton href={PLAN_ROUTE} label={copy({ de: 'Tagesplan jetzt', en: 'Daily plan now', pl: 'Plan dnia teraz' })} stretch />
            <LinkButton href={createKangurDuelsHref()} label={copy({ de: 'Duell-Lobby öffnen', en: 'Open duel lobby', pl: 'Otwórz lobby pojedynków' })} stretch tone='primary' />
          </View>
        </View>

        <LeaderboardStatus 
            error={error} 
            isLoading={isLoading} 
            isRestoringAuth={isRestoringAuth} 
            items={items} 
            copy={copy} 
        />
    </KangurMobileScrollScreen>
  );
}
