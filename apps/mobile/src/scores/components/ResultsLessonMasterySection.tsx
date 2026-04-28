import { View, Text } from 'react-native';
import { Card, KangurMobileSummaryChip, LinkButton } from '../../shared/KangurMobileUi';
import { LessonMasteryRow } from './LessonMasteryRow';
import { type KangurMobileCopy } from '../../i18n/kangurMobileI18n';
import { type KangurMobileHomeLessonMasteryItem } from '../../home/useKangurMobileHomeLessonMastery';

interface ResultsLessonMasterySectionProps {
  lessonMastery: {
    trackedLessons: number;
    masteredLessons: number;
    lessonsNeedingPractice: number;
    weakest: KangurMobileHomeLessonMasteryItem[];
    strongest: KangurMobileHomeLessonMasteryItem[];
  };
  lessonFocusSummary: string | null;
  copy: KangurMobileCopy;
}

export function ResultsLessonMasterySection({
  lessonMastery,
  lessonFocusSummary,
  copy,
}: ResultsLessonMasterySectionProps): React.JSX.Element {
  const { weakest, strongest } = lessonMastery;
  const weakestLesson = weakest[0] ?? null;
  const strongestLesson = strongest[0] ?? null;

  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({ de: 'Lektionsbeherrschung', en: 'Lesson mastery', pl: 'Opanowanie lekcji' })}
        </Text>
        <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
          {copy({ de: 'Lektionsplan nach den Ergebnissen', en: 'Post-results lesson plan', pl: 'Plan lekcji po wynikach' })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Verbinde die letzten Ergebnisse direkt mit lokal gespeicherten Lektionsständen.',
            en: 'Connect the latest results directly with saved lesson progress.',
            pl: 'Połącz ostatnie wyniki z zapisanym opanowaniem lekcji.',
          })}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <KangurMobileSummaryChip
          label={copy({
            de: `Verfolgt ${lessonMastery.trackedLessons}`,
            en: `Tracked ${lessonMastery.trackedLessons}`,
            pl: `Śledzone ${lessonMastery.trackedLessons}`,
          })}
        />
        <KangurMobileSummaryChip
          label={copy({
            de: `Beherrscht ${lessonMastery.masteredLessons}`,
            en: `Mastered ${lessonMastery.masteredLessons}`,
            pl: `Opanowane ${lessonMastery.masteredLessons}`,
          })}
          backgroundColor='#ecfdf5'
          borderColor='#a7f3d0'
          textColor='#047857'
        />
        <KangurMobileSummaryChip
          label={copy({
            de: `Zum Wiederholen ${lessonMastery.lessonsNeedingPractice}`,
            en: `Needs review ${lessonMastery.lessonsNeedingPractice}`,
            pl: `Do powtórki ${lessonMastery.lessonsNeedingPractice}`,
          })}
          backgroundColor='#fffbeb'
          borderColor='#fde68a'
          textColor='#b45309'
        />
      </View>

      {lessonMastery.trackedLessons === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine Lektions-Checkpoints.',
            en: 'There are no lesson checkpoints yet.',
            pl: 'Nie ma jeszcze checkpointów lekcji.',
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
              />
            ) : null}
          </View>

          {weakest[0] ? (
            <LessonMasteryRow insight={weakest[0]} title={copy({ de: 'Zum Wiederholen', en: 'Needs review', pl: 'Do powtórki' })} />
          ) : null}
          {strongest[0] ? (
            <LessonMasteryRow insight={strongest[0]} title={copy({ de: 'Stärkste Lektion', en: 'Strongest lesson', pl: 'Najmocniejsza lekcja' })} />
          ) : null}
        </View>
      )}
    </Card>
  );
}
