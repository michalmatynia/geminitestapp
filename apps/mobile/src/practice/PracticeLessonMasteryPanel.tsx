import React from 'react';
import { View, Text } from 'react-native';
import { KangurMobileInsetPanel as InsetPanel } from '../shared/KangurMobileUi';
import { KangurMobileLinkButton as LinkButton } from '../duels/duels-primitives/BaseComponents';

import { LessonMasteryRow } from './LessonMasteryRow';
import type { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import type { useKangurMobilePracticeLessonMastery } from './useKangurMobilePracticeLessonMastery';

type PracticeCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type PracticeLessonMasteryState = ReturnType<typeof useKangurMobilePracticeLessonMastery>;

export function PracticeLessonMasteryPanel({
  copy,
  lessonFocusSummary,
  lessonMastery,
  strongestLesson,
  weakestLesson,
}: {
  copy: PracticeCopy;
  lessonFocusSummary: string | null;
  lessonMastery: PracticeLessonMasteryState;
  strongestLesson: PracticeLessonMasteryState['strongest'][number] | null;
  weakestLesson: PracticeLessonMasteryState['weakest'][number] | null;
}): React.JSX.Element {
  const pillStyle = { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 };
  const pillTextStyle = { fontSize: 12, fontWeight: '700' as const };

  return (
    <InsetPanel gap={10}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{copy({ de: 'Lektionsbeherrschung', en: 'Lesson mastery', pl: 'Opanowanie lekcji' })}</Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>{copy({ de: 'Lektionsplan nach dem Training', en: 'Post-practice lesson plan', pl: 'Plan lekcji po treningu' })}</Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{copy({ de: 'Verbinde das frische Trainingsergebnis direkt mit lokal gespeichertem Lektionsstand.', en: 'Connect fresh result with mastery.', pl: 'Połącz wynik z opanowaniem lekcji.' })}</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <View style={[pillStyle, { borderColor: '#c7d2fe', backgroundColor: '#eef2ff' }]}>
          <Text style={[pillTextStyle, { color: '#4338ca' }]}>{copy({ de: `Verfolgt ${lessonMastery.trackedLessons}`, en: `Tracked ${lessonMastery.trackedLessons}`, pl: `Śledzone ${lessonMastery.trackedLessons}` })}</Text>
        </View>
        <View style={[pillStyle, { borderColor: '#a7f3d0', backgroundColor: '#ecfdf5' }]}>
          <Text style={[pillTextStyle, { color: '#047857' }]}>{copy({ de: `Beherrscht ${lessonMastery.masteredLessons}`, en: `Mastered ${lessonMastery.masteredLessons}`, pl: `Opanowane ${lessonMastery.masteredLessons}` })}</Text>
        </View>
        <View style={[pillStyle, { borderColor: '#fde68a', backgroundColor: '#fffbeb' }]}>
          <Text style={[pillTextStyle, { color: '#b45309' }]}>{copy({ de: `Zum Wiederholen ${lessonMastery.lessonsNeedingPractice}`, en: `Needs review ${lessonMastery.lessonsNeedingPractice}`, pl: `Do powtórki ${lessonMastery.lessonsNeedingPractice}` })}</Text>
        </View>
      </View>

      {lessonMastery.trackedLessons === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14 }}>{copy({ de: 'Es gibt noch keine Lektions-Checkpoints.', en: 'No lesson checkpoints.', pl: 'Brak checkpointów.' })}</Text>
      ) : (
        <View style={{ gap: 10 }}>
          {lessonFocusSummary !== null && <Text style={{ color: '#475569', fontSize: 14 }}>{lessonFocusSummary}</Text>}
          <View style={{ gap: 10 }}>
            {weakestLesson && <LinkButton centered href={weakestLesson.lessonHref} label={copy({ de: `Fokus: ${weakestLesson.title}`, en: `Focus: ${weakestLesson.title}`, pl: `Skup się: ${weakestLesson.title}` })} stretch tone='primary' />}
            {strongestLesson && <LinkButton centered href={strongestLesson.lessonHref} label={copy({ de: `Stärke halten: ${strongestLesson.title}`, en: `Maintain strength: ${strongestLesson.title}`, pl: `Podtrzymaj: ${strongestLesson.title}` })} stretch tone='secondary' />}
          </View>
          {lessonMastery.weakest[0] && <LessonMasteryRow insight={lessonMastery.weakest[0]} title={copy({ de: 'Zum Wiederholen', en: 'Needs review', pl: 'Do powtórki' })} />}
          {lessonMastery.strongest[0] && <LessonMasteryRow insight={lessonMastery.strongest[0]} title={copy({ de: 'Stärkste Lektion', en: 'Strongest lesson', pl: 'Najmocniejsza lekcja' })} />}
        </View>
      )}
    </InsetPanel>
  );
}
