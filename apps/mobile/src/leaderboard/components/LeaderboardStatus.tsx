import { Text, View } from 'react-native';
import { KangurMobileCard as Card } from '../../shared/KangurMobileUi';
import { type KangurMobileCopy } from '../../i18n/kangurMobileI18n';

interface LeaderboardItem {
  id: string;
  isCurrentUser: boolean;
  rankLabel: string;
  playerName: string;
  metaLabel: string;
  currentUserBadgeLabel: string;
  operationSummary: string;
  scoreLabel: string;
  timeLabel: string;
}

function LeaderboardEntryRow({ item }: { item: LeaderboardItem }): React.JSX.Element {
  return (
    <View style={{ borderRadius: 22, backgroundColor: item.isCurrentUser ? '#eef2ff' : '#ffffff', borderWidth: 1, borderColor: item.isCurrentUser ? '#c7d2fe' : '#e2e8f0', padding: 16, gap: 8 }}>
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
  );
}

export function LeaderboardStatus({
  error,
  isLoading,
  isRestoringAuth,
  items,
  copy,
}: {
  error: string | null;
  isLoading: boolean;
  isRestoringAuth: boolean;
  items: LeaderboardItem[];
  copy: KangurMobileCopy;
}): React.JSX.Element {
  if (isLoading) {
    return (
      <Card padding={20}>
        <Text style={{ color: '#334155', fontSize: 15 }}>
          {isRestoringAuth
            ? copy({ de: 'Die Anmeldung und die Rangliste werden wiederhergestellt...', en: 'Restoring sign-in and leaderboard...', pl: 'Przywracamy logowanie i ranking...' })
            : copy({ de: 'Die Rangliste wird geladen...', en: 'Loading leaderboard...', pl: 'Ładujemy ranking...' })}
        </Text>
      </Card>
    );
  }
  if (error !== null && error !== '') {
    return (
      <Card gap={8} padding={20}>
        <Text style={{ color: '#991b1b', fontWeight: '800', fontSize: 16 }}>
          {copy({ de: 'Rangliste nicht verfügbar', en: 'Leaderboard unavailable', pl: 'Ranking niedostępny' })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 21 }}>
          {error}
        </Text>
      </Card>
    );
  }
  if (items.length === 0) {
    return (
      <Card padding={20}>
        <Text style={{ color: '#334155', fontSize: 15 }}>
          {copy({ de: 'Kein Ergebnis passt zu den aktuellen Filtern.', en: 'No result matches the current filters.', pl: 'Żaden wynik nie pasuje do obecnych filtrów.' })}
        </Text>
      </Card>
    );
  }
  return <View style={{ gap: 10 }}>{items.map((item) => <LeaderboardEntryRow key={item.id} item={item} />)}</View>;
}
