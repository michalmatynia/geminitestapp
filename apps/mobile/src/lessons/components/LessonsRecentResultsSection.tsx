import React from 'react';
import { View, Text } from 'react-native';
import { KangurMobileCard as Card, KangurMobileLinkButton as LinkButton } from '../shared/KangurMobileUi';
import { LessonRecentResultRow } from './lesson-row-primitives';

interface LessonsRecentResultsSectionProps {
  lessonRecentResults: any;
  copy: (v: Record<string, string>) => string;
  resultsHref: any;
}

export function LessonsRecentResultsSection({
  lessonRecentResults,
  copy,
  resultsHref,
}: LessonsRecentResultsSectionProps): React.JSX.Element {
  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
          {copy({ de: 'Ergebniszentrale', en: 'Results hub', pl: 'Centrum wyników' })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Die letzten Ergebnisse bleiben hier griffbereit, damit du direkt wieder ins Training, die passende Lektion oder die Modus-Historie springen kannst.',
            en: 'The latest results stay close here so you can jump right back into practice, the matching lesson, or the mode history.',
            pl: 'Ostatnie wyniki są tutaj pod ręką, aby można było od razu wrócić do treningu, pasującej lekcji albo historii trybu.',
          })}
        </Text>
      </View>

      {lessonRecentResults.entries.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Hier sind noch keine Ergebnisse.',
            en: 'No results here yet.',
            pl: 'Brak wyników.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {lessonRecentResults.entries.map((item: any) => (
            <LessonRecentResultRow key={item.id} item={item} />
          ))}
          <LinkButton
            href={resultsHref}
            label={copy({ de: 'Alle Ergebnisse', en: 'All results', pl: 'Wszystkie wyniki' })}
          />
        </View>
      )}
    </Card>
  );
}
