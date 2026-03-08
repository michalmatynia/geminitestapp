'use client';

import React, { createContext, useContext, useMemo } from 'react';

import type { GsapAnimationConfig } from '@/features/gsap';
import type { VectorShape } from '@/shared/ui';

import type { VectorOverlayResult } from '@/features/cms/hooks/usePageBuilderContext';

export type OpenVectorOverlay = (options: {
  title: string;
  description: string;
  initialShapes: VectorShape[];
  onApply: (result: VectorOverlayResult) => void;
}) => void;

type AnimationConfigContextValue = {
  config: GsapAnimationConfig;
  onChange: (config: GsapAnimationConfig) => void;
  openVectorOverlay: OpenVectorOverlay;
};

export type AnimationConfigStateContextValue = Pick<AnimationConfigContextValue, 'config'>;
export type AnimationConfigActionsContextValue = Pick<
  AnimationConfigContextValue,
  'onChange' | 'openVectorOverlay'
>;

const AnimationConfigStateContext = createContext<AnimationConfigStateContextValue | null>(null);
const AnimationConfigActionsContext = createContext<AnimationConfigActionsContextValue | null>(
  null
);

type AnimationConfigProviderProps = {
  value: AnimationConfigContextValue;
  children: React.ReactNode;
};

export function AnimationConfigProvider({
  value,
  children,
}: AnimationConfigProviderProps): React.JSX.Element {
  const stateValue = useMemo(
    (): AnimationConfigStateContextValue => ({
      config: value.config,
    }),
    [value.config]
  );
  const actionsValue = useMemo(
    (): AnimationConfigActionsContextValue => ({
      onChange: value.onChange,
      openVectorOverlay: value.openVectorOverlay,
    }),
    [value.onChange, value.openVectorOverlay]
  );

  return (
    <AnimationConfigActionsContext.Provider value={actionsValue}>
      <AnimationConfigStateContext.Provider value={stateValue}>
        {children}
      </AnimationConfigStateContext.Provider>
    </AnimationConfigActionsContext.Provider>
  );
}

export function useAnimationConfigState(): AnimationConfigStateContextValue {
  const context = useContext(AnimationConfigStateContext);
  if (!context) {
    throw new Error('useAnimationConfigState must be used within AnimationConfigProvider');
  }
  return context;
}

export function useAnimationConfigActions(): AnimationConfigActionsContextValue {
  const context = useContext(AnimationConfigActionsContext);
  if (!context) {
    throw new Error('useAnimationConfigActions must be used within AnimationConfigProvider');
  }
  return context;
}
