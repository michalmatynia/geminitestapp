import { Link } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileInsetPanel as InsetPanel,
} from '../shared/KangurMobileUi';
import { renderPracticeLink } from './practice-primitives-utils';
import type { KangurMobileLessonCheckpointItem } from '../lessons/useKangurMobileLessonCheckpoints';

function CheckpointHeader({ item }: { item: KangurMobileLessonCheckpointItem }): React.JSX.Element {
  return (
    <View style={{ borderRadius: 999, borderWidth: 1, borderColor: '#c7d2fe', backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 7 }}>
      <Text style={{ color: '#4338ca', fontSize: 12, fontWeight: '700' }}>{item.bestScorePercent}%</Text>
    </View>
  );
}

export function LessonCheckpointRow({
  item,
}: {
  item: KangurMobileLessonCheckpointItem;
}): React.JSX.Element {
  const { copy, localeTag } = useKangurMobileI18n();

  return (
    <InsetPanel gap={8} padding={12} style={{ borderRadius: 18, backgroundColor: '#ffffff' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>{item.emoji} {item.title}</Text>
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({ de: `Letztes Ergebnis ${item.lastScorePercent}% • Beherrschung ${item.masteryPercent}%`, en: `Last score ${item.lastScorePercent}% • mastery ${item.masteryPercent}%`, pl: `Ostatni wynik ${item.lastScorePercent}% • opanowanie ${item.masteryPercent}%` })}
          </Text>
        </View>
        <CheckpointHeader item={item} />
      </View>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({ de: 'Zuletzt gespeichert', en: 'Last saved', pl: 'Ostatni zapis' })}{' '}
        {new Intl.DateTimeFormat(localeTag, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.lastCompletedAt))}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Link href={item.lessonHref} asChild>
          <Pressable accessibilityRole='button' style={{ alignSelf: 'flex-start', borderRadius: 999, backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 9 }}>
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>{`${copy({ de: 'Zur Lektion zurück', en: 'Return to lesson', pl: 'Wróć do lekcji' })}: ${item.title}`}</Text>
          </Pressable>
        </Link>
        {renderPracticeLink({ href: item.practiceHref, label: `${copy({ de: 'Danach trainieren', en: 'Practice after', pl: 'Potem trenuj' })}: ${item.title}` })}
      </View>
    </InsetPanel>
  );
}
