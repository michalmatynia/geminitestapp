import { Text, View } from 'react-native';

import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { useKangurMobileDuelsBadges, type KangurMobileDuelsBadgeItem } from '../useKangurMobileDuelsBadges';
import {
  KangurMobileCard as Card,
  KangurMobilePill as Pill,
} from '../../shared/KangurMobileUi';
import {
  PROFILE_ROUTE,
} from '../duels-ui';
import { LinkButton } from './BaseComponents';

function DuelsBadgeChip({
  item,
}: {
  item: KangurMobileDuelsBadgeItem;
}): React.JSX.Element {
  return (
    <Pill
      label={`${item.emoji} ${item.name}`}
      tone={{
        backgroundColor: '#fff7ed',
        borderColor: '#fde68a',
        textColor: '#9a3412',
      }}
    />
  );
}

function BadgesList({
  badges,
}: {
  badges: KangurMobileDuelsBadgeItem[];
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
        {copy({
          de: 'Zuletzt freigeschaltet',
          en: 'Recently unlocked',
          pl: 'Ostatnio odblokowane',
        })}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {badges.map((item) => (
          <DuelsBadgeChip key={item.id} item={item} />
        ))}
      </View>
    </View>
  );
}

export function BadgesCard({
  context,
}: {
  context: 'lobby' | 'session';
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const badges = useKangurMobileDuelsBadges();

  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({
            de: 'Abzeichen',
            en: 'Badges',
            pl: 'Odznaki',
          })}
        </Text>
        <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
          {copy({
            de: 'Abzeichen-Zentrale',
            en: 'Badge hub',
            pl: 'Centrum odznak',
          })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {context === 'session'
            ? copy({
                de: 'Auch während einer Duellsitzung siehst du, welche lokalen Abzeichen bereits freigeschaltet sind und welches Ziel dem nächsten Schwellenwert am nächsten ist.',
                en: 'Even during a duel session, you can see which local badges are already unlocked and which goal is closest to the next threshold.',
                pl: 'Nawet w trakcie sesji pojedynku widzisz, które lokalne odznaki są już odblokowane i który cel jest najbliżej kolejnego progu.',
              })
            : copy({
                de: 'Aus der Lobby heraus kannst du prüfen, welche lokalen Abzeichen schon freigeschaltet sind und welches Ziel am nächsten an der nächsten Stufe liegt.',
                en: 'From the lobby, you can check which local badges are already unlocked and which goal is closest to the next tier.',
                pl: 'Z lobby możesz sprawdzić, które lokalne odznaki są już odblokowane i który cel jest najbliżej kolejnego poziomu.',
              })}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={copy({
            de: `Freigeschaltet ${badges.unlockedBadges}/${badges.totalBadges}`,
            en: `Unlocked ${badges.unlockedBadges}/${badges.totalBadges}`,
            pl: `Odblokowane ${badges.unlockedBadges}/${badges.totalBadges}`,
          })}
          tone={{
            backgroundColor: '#eef2ff',
            borderColor: '#c7d2fe',
            textColor: '#4338ca',
          }}
        />
        <Pill
          label={copy({
            de: `Offen ${badges.remainingBadges}`,
            en: `Remaining ${badges.remainingBadges}`,
            pl: `Do zdobycia ${badges.remainingBadges}`,
          })}
          tone={{
            backgroundColor: '#fffbeb',
            borderColor: '#fde68a',
            textColor: '#b45309',
          }}
        />
      </View>

      {badges.recentBadges.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine lokal freigeschalteten Abzeichen. Schließe Lektionen, Trainings oder Spiele ab, damit sie hier erscheinen.',
            en: 'There are no locally unlocked badges yet. Finish lessons, practice runs, or games so they appear here.',
            pl: 'Nie ma jeszcze lokalnie odblokowanych odznak. Ukończ lekcje, treningi albo gry, aby pojawiły się tutaj.',
          })}
        </Text>
      ) : (
        <BadgesList badges={badges.recentBadges} />
      )}

      <LinkButton
        href={PROFILE_ROUTE}
        label={copy({
          de: 'Profil und Abzeichen öffnen',
          en: 'Open profile and badges',
          pl: 'Otwórz profil i odznaki',
        })}
        stretch
      />
    </Card>
  );
}
