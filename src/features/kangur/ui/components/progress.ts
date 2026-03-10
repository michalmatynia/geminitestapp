
import PlayerProgressCardView from '@/features/kangur/ui/components/PlayerProgressCard';
import XpToastView from '@/features/kangur/ui/components/XpToast';
import type { KangurProgressState, KangurXpToastState } from '@/features/kangur/ui/types';

import type { ComponentType } from 'react';

type PlayerProgressCardProps = {
  progress: KangurProgressState;
};

export const PlayerProgressCard = PlayerProgressCardView as ComponentType<PlayerProgressCardProps>;
export const XpToast = XpToastView as ComponentType<KangurXpToastState>;
