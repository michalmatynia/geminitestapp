'use client';

import { useTranslations } from 'next-intl';
import LessonMasteryInsights from '@/features/kangur/ui/components/LessonMasteryInsights';
import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

export function KangurLearnerProfileMasteryWidget(): React.JSX.Element {
  const translations = useTranslations('KangurLearnerProfileWidgets.lessonMastery');
  const { progress } = useKangurLearnerProfileRuntime();
  const { entry: masteryContent } = useKangurPageContentEntry('learner-profile-mastery');

  return (
    <LessonMasteryInsights
      progress={progress}
      sectionSummary={
        masteryContent?.summary ??
        translations('summary')
      }
      sectionTitle={masteryContent?.title ?? translations('title')}
    />
  );
}
