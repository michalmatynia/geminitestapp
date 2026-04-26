import React from 'react';
import { View, Text } from 'react-native';
import { Card, KangurMobileInsetPanel as InsetPanel, KangurMobilePill as Pill, KangurMobileLinkButton as LinkButton } from '../shared/KangurMobileUi';
import { LessonBadgeChip } from './lesson-row-primitives';

interface LessonsBadgesSectionProps {
  lessonBadges: any;
  copy: (v: Record<string, string>) => string;
  profileHref: any;
}

export function LessonsBadgesSection({
  lessonBadges,
  copy,
  profileHref,
}: LessonsBadgesSectionProps): React.JSX.Element {
  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({ de: 'Abzeichen', en: 'Badges', pl: 'Odznaki' })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
        {copy({ de: 'Abzeichen-Zentrale', en: 'Badge hub', pl: 'Centrum odznak' })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Behalte im Blick, was bereits freigeschaltet ist und welches lokale Ziel am nächsten an der nächsten Abzeichenstufe liegt.',
          en: 'Keep track of what is already unlocked and which local goal is closest to the next badge threshold.',
          pl: 'Śledź, co jest już odblokowane i który lokalny cel jest najbliżej kolejnego progu odznaki.',
        })}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={copy({
            de: `Freigeschaltet ${lessonBadges.unlockedBadges}/${lessonBadges.totalBadges}`,
            en: `Unlocked ${lessonBadges.unlockedBadges}/${lessonBadges.totalBadges}`,
            pl: `Odblokowane ${lessonBadges.unlockedBadges}/${lessonBadges.totalBadges}`,
          })}
          tone={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', textColor: '#4338ca' }}
        />
        <Pill
          label={copy({
            de: `Offen ${lessonBadges.remainingBadges}`,
            en: `Remaining ${lessonBadges.remainingBadges}`,
            pl: `Do zdobycia ${lessonBadges.remainingBadges}`,
          })}
          tone={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' }}
        />
      </View>

      {lessonBadges.recentBadges.length === 0 ? (
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
            {lessonBadges.recentBadges.map((item: any) => (
              <LessonBadgeChip key={item.id} item={item} />
            ))}
          </View>
        </View>
      )}

      <LinkButton
        href={profileHref}
        label={copy({ de: 'Profil und Abzeichen öffnen', en: 'Open profile and badges', pl: 'Otwórz profil i odznaki' })}
        tone='secondary'
      />
    </Card>
  );
}
