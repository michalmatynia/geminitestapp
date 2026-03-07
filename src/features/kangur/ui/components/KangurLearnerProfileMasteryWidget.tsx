'use client';

import LessonMasteryInsights from '@/features/kangur/ui/components/LessonMasteryInsights';
import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';

export function KangurLearnerProfileMasteryWidget(): React.JSX.Element {
  const { progress } = useKangurLearnerProfileRuntime();

  return <LessonMasteryInsights progress={progress} />;
}
