import type { ComponentType, ReactNode } from 'react';

import KangurGameView from '@/features/kangur/ui/components/KangurGame';
import KangurSetupView from '@/features/kangur/ui/components/KangurSetup';
import { KangurGameProvider as KangurGameProviderLegacy } from '@/features/kangur/ui/context/KangurGameContext';
import type { KangurMode } from '@/features/kangur/ui/types';

export type KangurSetupProps = {
  onStart: (mode: KangurMode) => void;
  onBack: () => void;
};

export type KangurGameProviderProps = {
  mode: KangurMode | null;
  onBack: () => void;
  children: ReactNode;
};

export const KangurSetup = KangurSetupView as ComponentType<KangurSetupProps>;
export const KangurGame = KangurGameView as ComponentType;
export const KangurGameProvider =
  KangurGameProviderLegacy as ComponentType<KangurGameProviderProps>;
