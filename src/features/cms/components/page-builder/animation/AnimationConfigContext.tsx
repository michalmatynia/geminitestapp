'use client';

import React, { createContext, useContext } from 'react';

import type { GsapAnimationConfig } from '@/features/gsap';
import type { VectorShape } from '@/shared/ui';

import type { VectorOverlayResult } from '../../../hooks/usePageBuilderContext';

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

const AnimationConfigContext = createContext<AnimationConfigContextValue | null>(null);

type AnimationConfigProviderProps = {
  value: AnimationConfigContextValue;
  children: React.ReactNode;
};

export function AnimationConfigProvider({
  value,
  children,
}: AnimationConfigProviderProps): React.JSX.Element {
  return (
    <AnimationConfigContext.Provider value={value}>
      {children}
    </AnimationConfigContext.Provider>
  );
}

export function useAnimationConfigContext(): AnimationConfigContextValue {
  const context = useContext(AnimationConfigContext);
  if (!context) {
    throw new Error('useAnimationConfigContext must be used within AnimationConfigProvider');
  }
  return context;
}
