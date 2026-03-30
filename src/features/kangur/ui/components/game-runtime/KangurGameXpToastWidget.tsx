import XpToast from './XpToast';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameXpToastWidget(): React.JSX.Element {
  const { xpToast } = useKangurGameRuntime();

  return (
    <XpToast
      breakdown={xpToast.breakdown}
      dailyQuest={xpToast.dailyQuest}
      nextBadge={xpToast.nextBadge}
      xpGained={xpToast.xpGained}
      newBadges={xpToast.newBadges}
      recommendation={xpToast.recommendation}
      visible={xpToast.visible}
    />
  );
}
