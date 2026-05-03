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

function LessonMasteryStatus({ mastery, copy }: { mastery: ResultsLessonMasterySectionProps['lessonMastery']; copy: ResultsLessonMasterySectionProps['copy'] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <KangurMobileSummaryChip
        label={copy({
          de: `Verfolgt ${mastery.trackedLessons}`,
          en: `Tracked ${mastery.trackedLessons}`,
          pl: `Śledzone ${mastery.trackedLessons}`,
        })}
      />
      <KangurMobileSummaryChip
        label={copy({
          de: `Beherrscht ${mastery.masteredLessons}`,
          en: `Mastered ${mastery.masteredLessons}`,
          pl: `Opanowane ${mastery.masteredLessons}`,
        })}
        backgroundColor='#ecfdf5'
        borderColor='#a7f3d0'
        textColor='#047857'
      />
      <KangurMobileSummaryChip
        label={copy({
          de: `Zum Wiederholen ${mastery.lessonsNeedingPractice}`,
          en: `Needs review ${mastery.lessonsNeedingPractice}`,
          pl: `Do powtórki ${mastery.lessonsNeedingPractice}`,
        })}
        backgroundColor='#fffbeb'
        borderColor='#fde68a'
        textColor='#b45309'
      />
    </View>
  );
}

function MasteryButtons({ weakestLesson, strongestLesson, copy }: { weakestLesson: KangurMobileHomeLessonMasteryItem | null; strongestLesson: KangurMobileHomeLessonMasteryItem | null; copy: ResultsLessonMasterySectionProps['copy'] }) {
  return (
    <View style={{ alignSelf: 'stretch', gap: 10 }}>
      {weakestLesson && (
        <LinkButton
          href={weakestLesson.lessonHref}
          label={copy({ de: `Fokus: ${weakestLesson.title}`, en: `Focus: ${weakestLesson.title}`, pl: `Skup się: ${weakestLesson.title}` })}
          stretch
          tone='primary'
        />
      )}
      {strongestLesson && (
        <LinkButton
          href={strongestLesson.lessonHref}
          label={copy({ de: `Stärke halten: ${strongestLesson.title}`, en: `Maintain strength: ${strongestLesson.title}`, pl: `Podtrzymaj: ${strongestLesson.title}` })}
          stretch
        />
      )}
    </View>
  );
}

function MasteryRows({ weakest, strongest, copy }: { weakest: KangurMobileHomeLessonMasteryItem[]; strongest: KangurMobileHomeLessonMasteryItem[]; copy: ResultsLessonMasterySectionProps['copy'] }) {
  return (
    <View style={{ gap: 10 }}>
      {weakest[0] && <LessonMasteryRow insight={weakest[0]} title={copy({ de: 'Zum Wiederholen', en: 'Needs review', pl: 'Do powtórki' })} />}
      {strongest[0] && <LessonMasteryRow insight={strongest[0]} title={copy({ de: 'Stärkste Lektion', en: 'Strongest lesson', pl: 'Najmocniejsza lekcja' })} />}
    </View>
  );
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
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{copy({ de: 'Lektionsbeherrschung', en: 'Lesson mastery', pl: 'Opanowanie lekcji' })}</Text>
        <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>{copy({ de: 'Lektionsplan nach den Ergebnissen', en: 'Post-results lesson plan', pl: 'Plan lekcji po wynikach' })}</Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{copy({ de: 'Verbinde die letzten Ergebnisse direkt mit lokal gespeicherten Lektionsständen.', en: 'Connect the latest results directly with saved lesson progress.', pl: 'Połącz ostatnie wyniki z zapisanym opanowaniem lekcji.' })}</Text>
      </View>

      <LessonMasteryStatus mastery={lessonMastery} copy={copy} />

      {lessonMastery.trackedLessons === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({ de: 'Es gibt noch keine Lektions-Checkpoints.', en: 'There are no lesson checkpoints yet.', pl: 'Nie ma jeszcze checkpointów lekcji.' })}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {lessonFocusSummary && <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{lessonFocusSummary}</Text>}
          <MasteryButtons weakestLesson={weakestLesson} strongestLesson={strongestLesson} copy={copy} />
          <MasteryRows weakest={weakest} strongest={strongest} copy={copy} />
        </View>
      )}
    </Card>
  );
}
