'use client';

import { XpToast } from '@/features/kangur/ui/components/progress';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameXpToastWidget(): React.JSX.Element {
  const { xpToast } = useKangurGameRuntime();

  return (
    <XpToast
      xpGained={xpToast.xpGained}
      newBadges={xpToast.newBadges}
      visible={xpToast.visible}
    />
  );
}
