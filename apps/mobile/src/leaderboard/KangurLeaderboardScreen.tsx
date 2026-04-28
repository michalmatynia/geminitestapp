import { Text, View } from 'react-native';

import { createKangurDuelsHref } from '../duels/duelsHref';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileCard as Card,
  KangurMobileLinkButton as LinkButton,
  KangurMobileScrollScreen,
  KangurMobileSectionTitle,
} from '../shared/KangurMobileUi';
import {
  PLAN_ROUTE,
} from './leaderboard-primitives';
import { useKangurMobileLeaderboard } from './useKangurLeaderboard';
import { useKangurMobileLeaderboardDuels } from './useKangurMobileLeaderboardDuels';
import { LeaderboardStatsSection } from './components/LeaderboardStatsSection';

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
  
  const renderStatus = (): React.JSX.Element => {
    if (isLoading) {
      return (
        <Card padding={20}>
          <Text style={{ color: '#334155', fontSize: 15 }}>
            {isRestoringAuth
              ? copy({
                  de: 'Die Anmeldung und die Rangliste werden wiederhergestellt...',
                  en: 'Restoring sign-in and leaderboard...',
                  pl: 'Przywracamy logowanie i ranking...',
                })
              : copy({
                  de: 'Die Rangliste wird geladen...',
                  en: 'Loading leaderboard...',
                  pl: 'Ładujemy ranking...',
              })}
          </Text>
        </Card>
      );
    }
    if (error !== null && error !== '') {
      return (
        <Card gap={8} padding={20}>
          <Text style={{ color: '#991b1b', fontWeight: '800', fontSize: 16 }}>
            {copy({
              de: 'Rangliste nicht verfügbar',
              en: 'Leaderboard unavailable',
              pl: 'Ranking niedostępny',
            })}
          </Text>
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 21 }}>
            {error}{' '}
            {copy({
              de: 'Starte die Kangur-Web-API unter der konfigurierten Adresse und aktualisiere danach die Rangliste.',
              en: 'Start the Kangur web API at the configured address and then refresh the leaderboard.',
              pl: 'Uruchom webowe API Kangura pod skonfigurowanym adresem, a potem odśwież ranking.',
            })}
          </Text>
        </Card>
      );
    }
    if (items.length === 0) {
      return (
        <Card padding={20}>
          <Text style={{ color: '#334155', fontSize: 15 }}>
            {copy({
              de: 'Kein Ergebnis passt zu den aktuellen Filtern.',
              en: 'No result matches the current filters.',
              pl: 'Żaden wynik nie pasuje do obecnych filtrów.',
            })}
          </Text>
        </Card>
      );
    }
    return (
      <View style={{ gap: 10 }}>
        {items.map((item) => (
          <View
            key={item.id}
            style={{
              borderRadius: 22,
              backgroundColor: item.isCurrentUser ? '#eef2ff' : '#ffffff',
              borderWidth: 1,
              borderColor: item.isCurrentUser ? '#c7d2fe' : '#e2e8f0',
              padding: 16,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>{item.rankLabel}</Text>
                <View>
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>{item.playerName}</Text>
                  <Text style={{ color: '#64748b', fontSize: 13 }}>{item.metaLabel}</Text>
                </View>
              </View>
              {item.isCurrentUser ? (
                <View style={{ borderRadius: 999, backgroundColor: '#1d4ed8', paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>{item.currentUserBadgeLabel}</Text>
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <Text style={{ color: '#475569', fontSize: 14 }}>{item.operationSummary}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#1d4ed8', fontSize: 18, fontWeight: '800' }}>{item.scoreLabel}</Text>
                <Text style={{ color: '#64748b', fontSize: 13 }}>{item.timeLabel}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <KangurMobileScrollScreen
      contentContainerStyle={{
        gap: 18,
        paddingHorizontal: 20,
        paddingVertical: 24,
      }}
    >
        <View style={{ alignItems: 'flex-start', gap: 14 }}>
          <LinkButton
            href='/'
            label={copy({ de: 'Zurück', en: 'Back', pl: 'Wróć' })}
          />

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

        {renderStatus()}
    </KangurMobileScrollScreen>
  );
}
