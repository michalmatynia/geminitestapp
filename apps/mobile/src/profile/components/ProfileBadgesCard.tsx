import { Text, View } from 'react-native';
import {
  KangurMobileCard as Card,
  KangurMobilePill as Pill,
} from '../../shared/KangurMobileUi';
import type { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import type { useKangurMobileProfileBadges } from '../useKangurMobileProfileBadges';

type ProfileBadgesCardProps = {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  profileBadges: ReturnType<typeof useKangurMobileProfileBadges>;
};

function ProfileBadgesHeader({ copy }: { copy: ProfileBadgesCardProps['copy'] }): React.JSX.Element {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{copy({ de: 'Abzeichen', en: 'Badges', pl: 'Odznaki' })}</Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>{copy({ de: 'Abzeichen-Zentrale', en: 'Badge hub', pl: 'Centrum odznak' })}</Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Behalte die letzten Freischaltungen und das vollständige Abzeichenraster an einem Ort im Blick.',
          en: 'Keep the latest unlocks and the full badge grid in one place.',
          pl: 'Śledź w jednym miejscu ostatnie odblokowania i pełną siatkę odznak.',
        })}
      </Text>
    </View>
  );
}

function ProfileBadgesMetrics({ copy, profileBadges }: { copy: ProfileBadgesCardProps['copy'], profileBadges: ProfileBadgesCardProps['profileBadges'] }): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Pill label={copy({
        de: `Freigeschaltet ${profileBadges.unlockedBadges}/${profileBadges.totalBadges}`,
        en: `Unlocked ${profileBadges.unlockedBadges}/${profileBadges.totalBadges}`,
        pl: `Odblokowane ${profileBadges.unlockedBadges}/${profileBadges.totalBadges}`,
      })} tone={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', textColor: '#4338ca' }} />
      <Pill label={copy({
        de: `Offen ${profileBadges.remainingBadges}`,
        en: `Remaining ${profileBadges.remainingBadges}`,
        pl: `Do zdobycia ${profileBadges.remainingBadges}`,
      })} tone={{ backgroundColor: '#fff7ed', borderColor: '#fdba74', textColor: '#c2410c' }} />
    </View>
  );
}

function RecentBadgesList({ copy, profileBadges }: { copy: ProfileBadgesCardProps['copy'], profileBadges: ProfileBadgesCardProps['profileBadges'] }): React.JSX.Element | null {
  if (profileBadges.recentBadges.length === 0) {
    return (
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Es gibt noch keine lokal freigeschalteten Abzeichen. Schließe Lektionen, Trainings oder Spiele ab, damit sie hier erscheinen.',
          en: 'There are no locally unlocked badges yet. Finish lessons, practice runs, or games so they appear here.',
          pl: 'Nie ma jeszcze lokalnie odblokowanych odznak. Ukończ lekcje, treningi albo gry, aby pojawiły się tutaj.',
        })}
      </Text>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>{copy({ de: 'Zuletzt freigeschaltet', en: 'Recently unlocked', pl: 'Ostatnio odblokowane' })}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {profileBadges.recentBadges.map((badge) => (
          <Pill key={badge.id} label={`${badge.emoji} ${badge.name}`} tone={{ backgroundColor: '#fff7ed', borderColor: '#fdba74', textColor: '#c2410c' }} />
        ))}
      </View>
    </View>
  );
}

function AllBadgesList({ copy, profileBadges }: { copy: ProfileBadgesCardProps['copy'], profileBadges: ProfileBadgesCardProps['profileBadges'] }): React.JSX.Element {
  return (
    <>
      <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>{copy({ de: 'Alle Abzeichen', en: 'All badges', pl: 'Wszystkie odznaki' })}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {profileBadges.allBadges.map((badge) => (
          <Pill key={badge.id} label={`${badge.emoji} ${badge.name}`} tone={badge.unlocked ? { backgroundColor: '#eef2ff', borderColor: '#c7d2fe', textColor: '#4338ca' } : { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', textColor: '#64748b' }} />
        ))}
      </View>
    </>
  );
}

export function ProfileBadgesCard({ copy, profileBadges }: ProfileBadgesCardProps): React.JSX.Element {
  return (
    <Card>
      <ProfileBadgesHeader copy={copy} />
      <ProfileBadgesMetrics copy={copy} profileBadges={profileBadges} />
      <RecentBadgesList copy={copy} profileBadges={profileBadges} />
      <AllBadgesList copy={copy} profileBadges={profileBadges} />
    </Card>
  );
}
