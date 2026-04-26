import React from 'react';
import { View, Text } from 'react-native';
import { Card, KangurMobilePill as Pill, KangurMobileLinkButton as LinkButton } from '../shared/KangurMobileUi';
import { LessonMasteryRow } from './lesson-row-primitives';

interface LessonsMasterySectionProps {
  lessonMastery: any;
  lessonFocusSummary: string | null;
  weakestLesson: any;
  strongestLesson: any;
  copy: (v: Record<string, string>) => string;
}

export function LessonsMasterySection({
  lessonMastery,
  lessonFocusSummary,
  weakestLesson,
  strongestLesson,
  copy,
}: LessonsMasterySectionProps): React.JSX.Element {
  return (
    <Card>
      <View style={{ gap: 4 }}>
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
      </View>

      <View style={{ flexDirection: 'column', gap: 8 }}>
        <Pill
          label={copy({
            de: `Verfolgt ${lessonMastery.trackedLessons}`,
            en: `Tracked ${lessonMastery.trackedLessons}`,
            pl: `Śledzone ${lessonMastery.trackedLessons}`,
          })}
          tone={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', textColor: '#4338ca' }}
        />
        <Pill
          label={copy({
            de: `Beherrscht ${lessonMastery.masteredLessons}`,
            en: `Mastered ${lessonMastery.masteredLessons}`,
            pl: `Opanowane ${lessonMastery.masteredLessons}`,
          })}
          tone={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', textColor: '#047857' }}
        />
        <Pill
          label={copy({
            de: `Zum Wiederholen ${lessonMastery.lessonsNeedingPractice}`,
            en: `Needs review ${lessonMastery.lessonsNeedingPractice}`,
            pl: `Do powtórki ${lessonMastery.lessonsNeedingPractice}`,
          })}
          tone={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' }}
        />
      </View>

      {lessonMastery.trackedLessons === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine Lektions-Checkpoints. Öffne eine Lektion und speichere den ersten Checkpoint, damit hier Stärken und Wiederholungen erscheinen.',
            en: 'There are no lesson checkpoints yet. Open a lesson and save the first checkpoint to unlock strengths and review suggestions here.',
            pl: 'Nie ma jeszcze checkpointów lekcji. Otwórz lekcję i zapisz pierwszy checkpoint, aby odblokować tutaj mocne strony i powtórki.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {lessonFocusSummary ? (
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{lessonFocusSummary}</Text>
          ) : null}

          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            {weakestLesson ? (
              <LinkButton
                href={weakestLesson.lessonHref}
                label={copy({ de: `Fokus: ${weakestLesson.title}`, en: `Focus: ${weakestLesson.title}`, pl: `Skup się: ${weakestLesson.title}` })}
                stretch
                tone='primary'
              />
            ) : null}
            {strongestLesson ? (
              <LinkButton
                href={strongestLesson.lessonHref}
                label={copy({ de: `Stärke halten: ${strongestLesson.title}`, en: `Maintain strength: ${strongestLesson.title}`, pl: `Podtrzymaj: ${strongestLesson.title}` })}
                stretch
                tone='secondary'
              />
            ) : null}
          </View>

          {weakestLesson ? (
            <LessonMasteryRow insight={weakestLesson} title={copy({ de: 'Zum Wiederholen', en: 'Needs review', pl: 'Do powtórki' })} />
          ) : null}
          {strongestLesson ? (
            <LessonMasteryRow insight={strongestLesson} title={copy({ de: 'Stärkste Lektion', en: 'Strongest lesson', pl: 'Najmocniejsza lekcja' })} />
          ) : null}
        </View>
      )}
    </Card>
  );
}
