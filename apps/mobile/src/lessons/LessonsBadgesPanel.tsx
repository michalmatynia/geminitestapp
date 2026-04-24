import React from 'react';
import { View, Text } from 'react-native';
import {
  KangurMobileCard as Card,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePill as Pill,
} from '../shared/KangurMobileUi';
import { LessonBadgeChip } from './lesson-row-primitives';
import type { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import type { useKangurMobileLessonsBadges } from './useKangurMobileLessonsBadges';

type LessonsCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type LessonBadgesState = ReturnType<typeof useKangurMobileLessonsBadges>;

export function LessonsBadgesPanel({
  copy,
  lessonBadges,
  profileHref,
}: {
  copy: LessonsCopy;
  lessonBadges: LessonBadgesState;
  profileHref: string;
}): React.JSX.Element {
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
          de: 'Behalte im Blick, was bereits freigeschaltet ist.',
          en: 'Keep track of what is already unlocked.',
          pl: 'Śledź, co jest już odblokowane.',
        })}
      </Text>

      <BadgeStats copy={copy} lessonBadges={lessonBadges} />
      <RecentBadgesSection copy={copy} lessonBadges={lessonBadges} />

      <LinkButton
        href={profileHref}
        label={copy({
          de: 'Profil und Abzeichen öffnen',
          en: 'Open profile and badges',
          pl: 'Otwórz profil i odznaki',
        })}
        style={{ marginTop: 12 }}
        tone='secondary'
      />
    </Card>
  );
}

function BadgeStats({ copy, lessonBadges }: { copy: LessonsCopy, lessonBadges: LessonBadgesState }): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
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
  );
}

function RecentBadgesSection({ copy, lessonBadges }: { copy: LessonsCopy, lessonBadges: LessonBadgesState }): React.JSX.Element {
  if (lessonBadges.recentBadges.length === 0) {
    return (
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20, marginTop: 12 }}>
        {copy({
          de: 'Noch keine freigeschalteten Abzeichen.',
          en: 'No unlocked badges yet.',
          pl: 'Brak odblokowanych odznak.',
        })}
      </Text>
    );
  }
  return (
    <View style={{ gap: 10, marginTop: 12 }}>
      <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
        {copy({ de: 'Zuletzt freigeschaltet', en: 'Recently unlocked', pl: 'Ostatnio odblokowane' })}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {lessonBadges.recentBadges.map((item) => <LessonBadgeChip key={item.id} item={item} />)}
      </View>
    </View>
  );
}
