import { Text, View } from 'react-native';

import {
  BadgeChip,
  OutlineLink,
  SectionCard,
  SummaryChip,
} from '../homeScreenPrimitives';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { useKangurMobileHomeBadges } from '../useKangurMobileHomeBadges';
import { PROFILE_ROUTE } from '../home-screen-constants';

export function HomeSecondaryInsightsBadgesSectionGroup(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const homeBadges = useKangurMobileHomeBadges();

  return (
    <SectionCard
      title={copy({
        de: 'Abzeichen-Zentrale',
        en: 'Badge hub',
        pl: 'Centrum odznak',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Die letzten Freischaltungen und der direkte Weg zum vollständigen Abzeichenüberblick bleiben hier griffbereit.',
          en: 'The latest unlocks and the direct path to the full badge overview stay close here.',
          pl: 'Ostatnie odblokowania i bezpośrednie przejście do pełnego przeglądu odznak są tutaj zawsze pod ręką.',
        })}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <SummaryChip
          accent='blue'
          label={copy({
            de: `Freigeschaltet ${homeBadges.unlockedBadges}/${homeBadges.totalBadges}`,
            en: `Unlocked ${homeBadges.unlockedBadges}/${homeBadges.totalBadges}`,
            pl: `Odblokowane ${homeBadges.unlockedBadges}/${homeBadges.totalBadges}`,
          })}
        />
        <SummaryChip
          accent='amber'
          label={copy({
            de: `Offen ${homeBadges.remainingBadges}`,
            en: `Remaining ${homeBadges.remainingBadges}`,
            pl: `Do zdobycia ${homeBadges.remainingBadges}`,
          })}
        />
      </View>
      {homeBadges.recentBadges.length === 0 ? (
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine lokal freigeschalteten Abzeichen. Schließe Lektionen, Trainings oder Spiele ab, damit sie hier erscheinen.',
            en: 'There are no locally unlocked badges yet. Finish lessons, practice runs, or games so they appear here.',
            pl: 'Nie ma jeszcze lokalnie odblokowanych odznak. Ukończ lekcje, treningi albo gry, aby pojawiły się tutaj.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
            {copy({
              de: 'Zuletzt freigeschaltet',
              en: 'Recently unlocked',
              pl: 'Ostatnio odblokowane',
            })}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {homeBadges.recentBadges.map((item) => (
              <BadgeChip key={item.id} item={item} />
            ))}
          </View>
        </View>
      )}
      <OutlineLink
        href={PROFILE_ROUTE}
        hint={copy({
          de: 'Öffnet das Profil mit der vollständigen Abzeichenübersicht.',
          en: 'Opens the profile with the full badge overview.',
          pl: 'Otwiera profil z pełnym przeglądem odznak.',
        })}
        label={copy({
          de: 'Profil und Abzeichen öffnen',
          en: 'Open profile and badges',
          pl: 'Otwórz profil i odznaki',
        })}
      />
    </SectionCard>
  );
}
