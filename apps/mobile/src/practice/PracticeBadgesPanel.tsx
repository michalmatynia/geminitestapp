import React from 'react';
import { View, Text } from 'react-native';
import { KangurMobileInsetPanel as InsetPanel } from '../shared/KangurMobileUi';
import { KangurMobileLinkButton as LinkButton } from './duels-primitives';
import { PracticeBadgeChip } from './practice-primitives';
import type { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import type { useKangurMobilePracticeBadges } from './useKangurMobilePracticeBadges';

type PracticeCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type PracticeBadgesState = ReturnType<typeof useKangurMobilePracticeBadges>;

export function PracticeBadgesPanel({
  copy,
  practiceBadges,
  profileHref,
}: {
  copy: PracticeCopy;
  practiceBadges: PracticeBadgesState;
  profileHref: string;
}): React.JSX.Element {
  const pillStyle = { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 };
  const pillTextStyle = { fontSize: 12, fontWeight: '700' as const };

  return (
    <InsetPanel gap={10}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{copy({ de: 'Abzeichen', en: 'Badges', pl: 'Odznaki' })}</Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>{copy({ de: 'Abzeichen-Zentrale', en: 'Badge hub', pl: 'Centrum odznak' })}</Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{copy({ de: 'Behalte im Blick, was bereits freigeschaltet ist.', en: 'Keep track of what is unlocked.', pl: 'Śledź odblokowane.' })}</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <View style={[pillStyle, { borderColor: '#c7d2fe', backgroundColor: '#eef2ff' }]}>
          <Text style={[pillTextStyle, { color: '#4338ca' }]}>{copy({ de: `Freigeschaltet ${practiceBadges.unlockedBadges}/${practiceBadges.totalBadges}`, en: `Unlocked ${practiceBadges.unlockedBadges}/${practiceBadges.totalBadges}`, pl: `Odblokowane ${practiceBadges.unlockedBadges}/${practiceBadges.totalBadges}` })}</Text>
        </View>
        <View style={[pillStyle, { borderColor: '#fde68a', backgroundColor: '#fffbeb' }]}>
          <Text style={[pillTextStyle, { color: '#b45309' }]}>{copy({ de: `Offen ${practiceBadges.remainingBadges}`, en: `Remaining ${practiceBadges.remainingBadges}`, pl: `Do zdobycia ${practiceBadges.remainingBadges}` })}</Text>
        </View>
      </View>

      {practiceBadges.recentBadges.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14 }}>{copy({ de: 'Noch keine Abzeichen.', en: 'No badges yet.', pl: 'Brak odznak.' })}</Text>
      ) : (
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>{copy({ de: 'Zuletzt freigeschaltet', en: 'Recently unlocked', pl: 'Ostatnio odblokowane' })}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {practiceBadges.recentBadges.map((item) => <PracticeBadgeChip key={item.id} item={item} />)}
          </View>
        </View>
      )}

      <LinkButton href={profileHref} label={copy({ de: 'Profil öffnen', en: 'Open profile', pl: 'Otwórz profil' })} tone='secondary' />
    </InsetPanel>
  );
}
