import { View, Text } from 'react-native';
import { Card, KangurMobileSummaryChip, LinkButton } from '../../shared/KangurMobileUi';
import { ResultsBadgeChip } from '../results-primitives';

interface ResultsBadgesSectionProps {
  resultsBadges: {
    unlockedBadges: number;
    totalBadges: number;
    remainingBadges: number;
    recentBadges: { id: string }[];
  };
  copy: (v: Record<string, string>) => string;
  profileHref: string;
}

export function ResultsBadgesSection({
  resultsBadges,
  copy,
  profileHref,
}: ResultsBadgesSectionProps): React.JSX.Element {
  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({ de: 'Abzeichen', en: 'Badges', pl: 'Odznaki' })}
        </Text>
        <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
          {copy({ de: 'Abzeichen-Zentrale', en: 'Badge hub', pl: 'Centrum odznak' })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Behalte im Blick, was schon freigeschaltet ist und welches Ziel am nächsten an der nächsten Abzeichenstufe liegt.',
            en: 'Keep track of what is already unlocked and which goal is closest to the next badge threshold.',
            pl: 'Śledź, co jest już odblokowane i który cel jest najbliżej kolejnego progu odznaki.',
          })}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <KangurMobileSummaryChip
          label={copy({
            de: `Freigeschaltet ${resultsBadges.unlockedBadges}/${resultsBadges.totalBadges}`,
            en: `Unlocked ${resultsBadges.unlockedBadges}/${resultsBadges.totalBadges}`,
            pl: `Odblokowane ${resultsBadges.unlockedBadges}/${resultsBadges.totalBadges}`,
          })}
        />
        <KangurMobileSummaryChip
          label={copy({
            de: `Offen ${resultsBadges.remainingBadges}`,
            en: `Remaining ${resultsBadges.remainingBadges}`,
            pl: `Do zdobycia ${resultsBadges.remainingBadges}`,
          })}
          backgroundColor='#fffbeb'
          borderColor='#fde68a'
          textColor='#b45309'
        />
      </View>

      {resultsBadges.recentBadges.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine lokal freigeschalteten Abzeichen. Schließe Lektionen, Trainings oder Spiele ab, damit sie hier erscheinen.',
            en: 'There are no locally unlocked badges yet. Finish lessons, practice runs, or games so they appear here.',
            pl: 'Nie ma jeszcze lokalnie odblokowanych odznak. Ukończ lekcje, treningi albo gry, aby pojawiły się tutaj.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
            {copy({ de: 'Zuletzt freigeschaltet', en: 'Recently unlocked', pl: 'Ostatnio odblokowane' })}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {resultsBadges.recentBadges.map((item) => (
              <ResultsBadgeChip key={item.id} item={item} />
            ))}
          </View>
        </View>
      )}

      <LinkButton
        href={profileHref}
        label={copy({
          de: 'Profil und Abzeichen öffnen',
          en: 'Open profile and badges',
          pl: 'Otwórz profil i odznaki',
        })}
      />
    </Card>
  );
}
