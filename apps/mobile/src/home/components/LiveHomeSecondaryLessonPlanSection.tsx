import { Text, View } from 'react-native';

import {
  SummaryChip,
} from '../homeScreenPrimitives';
import { LessonMasteryCard } from './LessonMasteryCard';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { useKangurMobileHomeLessonMastery } from '../useKangurMobileHomeLessonMastery';

export function LiveHomeSecondaryLessonPlanSection(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const lessonMastery = useKangurMobileHomeLessonMastery();

  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <SummaryChip
          accent='blue'
          label={copy({
            de: `Verfolgt ${lessonMastery.trackedLessons}`,
            en: `Tracked ${lessonMastery.trackedLessons}`,
            pl: `Śledzone ${lessonMastery.trackedLessons}`,
          })}
        />
        <SummaryChip
          accent='emerald'
          label={copy({
            de: `Beherrscht ${lessonMastery.masteredLessons}`,
            en: `Mastered ${lessonMastery.masteredLessons}`,
            pl: `Opanowane ${lessonMastery.masteredLessons}`,
          })}
        />
        <SummaryChip
          accent='amber'
          label={copy({
            de: `Zum Wiederholen ${lessonMastery.lessonsNeedingPractice}`,
            en: `Needs review ${lessonMastery.lessonsNeedingPractice}`,
            pl: `Do powtórki ${lessonMastery.lessonsNeedingPractice}`,
          })}
        />
      </View>

      {lessonMastery.trackedLessons === 0 ? (
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine Lektions-Checkpoints. Öffne eine Lektion und speichere den ersten Checkpoint, damit hier Stärken und Wiederholungen erscheinen.',
            en: 'There are no lesson checkpoints yet. Open a lesson and save the first checkpoint to unlock strengths and review suggestions here.',
            pl: 'Nie ma jeszcze checkpointów lekcji. Otwórz lekcję i zapisz pierwszy checkpoint, aby odblokować tutaj mocne strony i powtórki.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {lessonMastery.weakest.length > 0 && lessonMastery.weakest[0] ? (
            <LessonMasteryCard
              insight={lessonMastery.weakest[0]}
              title={copy({
                de: 'Zum Wiederholen',
                en: 'Needs review',
                pl: 'Do powtórki',
              })}
            />
          ) : (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Alle verfolgten Lektionen sind aktuell auf einem sicheren Niveau.',
                en: 'All tracked lessons are currently at a safe level.',
                pl: 'Wszystkie śledzone lekcje są obecnie na bezpiecznym poziomie.',
              })}
            </Text>
          )}

          {lessonMastery.strongest.length > 0 && lessonMastery.strongest[0] ? (
            <LessonMasteryCard
              insight={lessonMastery.strongest[0]}
              title={copy({
                de: 'Stärkste Lektion',
                en: 'Strongest lesson',
                pl: 'Najmocniejsza lekcja',
              })}
            />
          ) : null}
        </View>
      )}
    </>
  );
}
