import React from 'react';
import { View, Text } from 'react-native';
import { KangurMobileCard as Card } from '../shared/KangurMobileUi';
import { type useKangurMobileLessonsRecentResults } from './useKangurMobileLessonsRecentResults';
import { LessonRecentResultRow } from './lesson-row-primitives';
import type { useKangurMobileI18n } from '../i18n/kangurMobileI18n';

export function LessonsRecentResultsPanel({
  copy,
  lessonRecentResults,
}: {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  lessonRecentResults: ReturnType<typeof useKangurMobileLessonsRecentResults>;
}): React.JSX.Element | null {
  if (lessonRecentResults.recentResultItems.length === 0) {
    return null;
  }

  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({ de: 'Nach den Lektionen', en: 'After lessons', pl: 'Po lekcjach' })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
        {copy({ de: 'Ergebniszentrale', en: 'Results hub', pl: 'Centrum wyników' })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Die letzten Ergebnisse bleiben hier griffbereit.',
          en: 'The latest results stay close here.',
          pl: 'Ostatnie wyniki są tutaj pod ręką.',
        })}
      </Text>
      <View style={{ gap: 10, marginTop: 12 }}>
        {lessonRecentResults.recentResultItems.map((item) => (
          <LessonRecentResultRow key={item.result.id} item={item} />
        ))}
      </View>
    </Card>
  );
}
