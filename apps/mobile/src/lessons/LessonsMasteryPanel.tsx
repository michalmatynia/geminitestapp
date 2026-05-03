import React from 'react';
import { View, Text } from 'react-native';
import { KangurMobileCard as Card } from '../shared/KangurMobileUi';
import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { type KangurMobileLessonsLessonMasteryItem, type UseKangurMobileLessonsLessonMasteryResult } from './useKangurMobileLessonsLessonMastery';
import { MasteryStatsPanel, MasteryFocusPanel, MasteryInsightsPanel } from './LessonsMasterySubPanels';

type LessonsCopy = ReturnType<typeof useKangurMobileI18n>['copy'];

export function LessonsMasteryPanel({
  copy,
  lessonFocusSummary,
  lessonMastery,
  weakestLesson,
  strongestLesson,
}: {
  copy: LessonsCopy;
  lessonFocusSummary: string | null;
  lessonMastery: UseKangurMobileLessonsLessonMasteryResult;
  weakestLesson: KangurMobileLessonsLessonMasteryItem | null;
  strongestLesson: KangurMobileLessonsLessonMasteryItem | null;
}): React.JSX.Element {
  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({ de: 'Lektionsbeherrschung', en: 'Lesson mastery', pl: 'Opanowanie lekcji' })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
        {copy({ de: 'Lektionsplan nach dem Lesen', en: 'Post-reading lesson plan', pl: 'Plan lekcji po czytaniu' })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Verbinde den Katalog und die letzten Checkpoints direkt mit lokal gespeichertem Beherrschungsstand und entscheide sofort, was wiederholt und was nur gehalten werden soll.',
          en: 'Connect the catalog and recent checkpoints directly with saved mastery and decide right away what needs review and what only needs maintaining.',
          pl: 'Na ekranie lekcji możesz od razu połączyć katalog i ostatnie checkpointy z lokalnie zapisanym poziomem opanowania, aby szybciej wybrać powtórkę.',
        })}
      </Text>

      <MasteryStatsPanel copy={copy} lessonMastery={lessonMastery} />

      {lessonMastery.trackedLessons === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20, marginTop: 12 }}>
          {copy({ de: 'Es gibt noch keine Lektions-Checkpoints.', en: 'There are no lesson checkpoints.', pl: 'Nie ma jeszcze checkpointów lekcji.' })}
        </Text>
      ) : (
        <View style={{ gap: 10, marginTop: 12 }}>
          {lessonFocusSummary !== null && (
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{lessonFocusSummary}</Text>
          )}
          <MasteryFocusPanel copy={copy} weakest={weakestLesson} strongest={strongestLesson} />
          <MasteryInsightsPanel copy={copy} lessonMastery={lessonMastery} />
        </View>
      )}
    </Card>
  );
}
