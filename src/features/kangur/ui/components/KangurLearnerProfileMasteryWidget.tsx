'use client';

import { useTranslations } from 'next-intl';
import LessonMasteryInsights from '@/features/kangur/ui/components/LessonMasteryInsights';
import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { translateKangurLearnerProfileWithFallback } from '@/features/kangur/ui/services/profile';

export function KangurLearnerProfileMasteryWidget(): React.JSX.Element {
  const translations = useTranslations('KangurLearnerProfileWidgets.lessonMastery');
  const { progress } = useKangurLearnerProfileRuntime();
  const { entry: masteryContent } = useKangurPageContentEntry('learner-profile-mastery');

  return (
    <LessonMasteryInsights
      progress={progress}
      sectionSummary={
        masteryContent?.summary ??
        translateKangurLearnerProfileWithFallback(
          translations,
          'summary',
          'Najsłabsze i najmocniejsze lekcje na podstawie zapisanych prób.'
        )
      }
      sectionTitle={
        masteryContent?.title ??
        translateKangurLearnerProfileWithFallback(
          translations,
          'title',
          'Opanowanie lekcji'
        )
      }
    />
  );
}
