import LessonMasteryInsights from '@/features/kangur/ui/components/LessonMasteryInsights';
import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

export function KangurLearnerProfileMasteryWidget(): React.JSX.Element {
  const { progress } = useKangurLearnerProfileRuntime();
  const { entry: masteryContent } = useKangurPageContentEntry('learner-profile-mastery');

  return (
    <LessonMasteryInsights
      progress={progress}
      sectionSummary={
        masteryContent?.summary ??
        'Sprawdź tematy do powtórki i najmocniejsze obszary na podstawie zapisanych lekcji.'
      }
      sectionTitle={masteryContent?.title ?? 'Opanowanie lekcji'}
    />
  );
}
