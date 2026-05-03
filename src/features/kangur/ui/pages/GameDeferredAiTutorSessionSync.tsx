'use client';

import { KangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import type { KangurAiTutorSessionSyncProps } from '@/features/kangur/ui/context/KangurAiTutorRuntime.types';

export default function GameDeferredAiTutorSessionSync({
  learnerId,
  sessionContext,
}: KangurAiTutorSessionSyncProps): React.JSX.Element | null {
  return (
    <KangurAiTutorSessionSync
      learnerId={learnerId}
      sessionContext={sessionContext}
    />
  );
}
