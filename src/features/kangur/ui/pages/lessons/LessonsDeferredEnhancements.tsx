'use client';

import { useEffect } from 'react';

import { useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import type { KangurAiTutorSessionSyncProps } from '@/features/kangur/ui/context/KangurAiTutorRuntime.types';

type LessonsDeferredEnhancementsProps = {
  learnerId: KangurAiTutorSessionSyncProps['learnerId'];
  onDocsTooltipsResolved: (enabled: boolean) => void;
  sessionContext: KangurAiTutorSessionSyncProps['sessionContext'];
};

export function LessonsDeferredEnhancements({
  learnerId,
  onDocsTooltipsResolved,
  sessionContext,
}: LessonsDeferredEnhancementsProps): React.JSX.Element {
  const { enabled } = useKangurDocsTooltips('lessons');

  useEffect(() => {
    onDocsTooltipsResolved(enabled);
  }, [enabled, onDocsTooltipsResolved]);

  return (
    <KangurAiTutorSessionSync
      learnerId={learnerId}
      sessionContext={sessionContext}
    />
  );
}
