'use client';

import { useKangurLearnerActivityPing } from '@/features/kangur/ui/hooks/useKangurLearnerActivity';

export default function GameDeferredLearnerActivityPing({
  activity,
  enabled,
}: {
  activity: {
    kind: 'game';
    title: string;
  };
  enabled: boolean;
}): null {
  useKangurLearnerActivityPing({
    activity,
    enabled,
  });

  return null;
}
