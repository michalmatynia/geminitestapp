'use client';

import React, { useState, useCallback, useMemo } from 'react';

import type { Asset3dOrderedDitheringPresetKey, Viewer3DState } from '@/shared/contracts/viewer3d';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { LightingPreset, EnvironmentPreset } from '../components/Viewer3D';

export type OrderedDitheringPresetKey = Asset3dOrderedDitheringPresetKey;

export type { Viewer3DState };

export const orderedDitheringPresets = {
  balanced: {
    label: 'Balanced',
    gridSize: 4,
    pixelSizeRatio: 1,
    grayscaleOnly: false,
    invertColor: false,
    luminanceMethod: 1,
  },
  fineMono: {
    label: 'Fine Mono',
    gridSize: 3,
    pixelSizeRatio: 0.9,
    grayscaleOnly: true,
    invertColor: false,
    luminanceMethod: 1,
  },
  chunkyMono: {
    label: 'Chunky Mono',
    gridSize: 6,
    pixelSizeRatio: 1.6,
    grayscaleOnly: true,
    invertColor: false,
    luminanceMethod: 1,
  },
  inverted: {
    label: 'Inverted',
    gridSize: 4,
    pixelSizeRatio: 1,
    grayscaleOnly: false,
    invertColor: true,
    luminanceMethod: 1,
  },
} as const;

interface Viewer3DContextType extends Viewer3DState {
  // Setters
  setAutoRotate: (value: boolean) => void;
  setAutoRotateSpeed: (value: number) => void;
  setEnvironment: (value: EnvironmentPreset) => void;
  setLighting: (value: LightingPreset) => void;
  setLightIntensity: (value: number) => void;
  setEnableShadows: (value: boolean) => void;
  setEnableContactShadows: (value: boolean) => void;
  setShowGround: (value: boolean) => void;
  setEnableBloom: (value: boolean) => void;
  setBloomIntensity: (value: number) => void;
  setEnableVignette: (value: boolean) => void;
  setEnableToneMapping: (value: boolean) => void;
  setExposure: (value: number) => void;
  setEnableDithering: (value: boolean) => void;
  setDitheringIntensity: (value: number) => void;
  setEnablePixelation: (value: boolean) => void;
  setPixelSize: (value: number) => void;
  setEnableOrderedDithering: (value: boolean) => void;
  setOrderedDitheringGridSize: (value: number) => void;
  setOrderedDitheringPixelSizeRatio: (value: number) => void;
  setOrderedDitheringGrayscaleOnly: (value: boolean) => void;
  setOrderedDitheringInvertColor: (value: boolean) => void;
  setOrderedDitheringLuminanceMethod: (value: number) => void;
  setOrderedDitheringPreset: (value: OrderedDitheringPresetKey) => void;
  setBackgroundColor: (value: string) => void;

  // Actions
  resetSettings: () => void;
  applyOrderedDitheringPreset: (preset: Exclude<OrderedDitheringPresetKey, 'custom'>) => void;
}

type Viewer3DActionsKey =
  | 'setAutoRotate'
  | 'setAutoRotateSpeed'
  | 'setEnvironment'
  | 'setLighting'
  | 'setLightIntensity'
  | 'setEnableShadows'
  | 'setEnableContactShadows'
  | 'setShowGround'
  | 'setEnableBloom'
  | 'setBloomIntensity'
  | 'setEnableVignette'
  | 'setEnableToneMapping'
  | 'setExposure'
  | 'setEnableDithering'
  | 'setDitheringIntensity'
  | 'setEnablePixelation'
  | 'setPixelSize'
  | 'setEnableOrderedDithering'
  | 'setOrderedDitheringGridSize'
  | 'setOrderedDitheringPixelSizeRatio'
  | 'setOrderedDitheringGrayscaleOnly'
  | 'setOrderedDitheringInvertColor'
  | 'setOrderedDitheringLuminanceMethod'
  | 'setOrderedDitheringPreset'
  | 'setBackgroundColor'
  | 'resetSettings'
  | 'applyOrderedDitheringPreset';

export type Viewer3DStateContextType = Viewer3DState;
export type Viewer3DActionsContextType = Pick<Viewer3DContextType, Viewer3DActionsKey>;

export const {
  Context: Viewer3DStateContext,
  useStrictContext: useViewer3DState,
  useOptionalContext: useOptionalViewer3DState,
} = createStrictContext<Viewer3DStateContextType>({
  hookName: 'useViewer3DState',
  providerName: 'a Viewer3DProvider',
  displayName: 'Viewer3DStateContext',
  errorFactory: internalError,
});

export const {
  Context: Viewer3DActionsContext,
  useStrictContext: useViewer3DActions,
} = createStrictContext<Viewer3DActionsContextType>({
  hookName: 'useViewer3DActions',
  providerName: 'a Viewer3DProvider',
  displayName: 'Viewer3DActionsContext',
  errorFactory: internalError,
});

export function Viewer3DProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [autoRotate, setAutoRotate] = useState(true);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(2);
  const [environment, setEnvironment] = useState<EnvironmentPreset>('studio');
  const [lighting, setLighting] = useState<LightingPreset>('studio');
  const [lightIntensity, setLightIntensity] = useState(1);
  const [enableShadows, setEnableShadows] = useState(true);
  const [enableContactShadows, setEnableContactShadows] = useState(true);
  const [showGround, setShowGround] = useState(false);
  const [enableBloom, setEnableBloom] = useState(false);
  const [bloomIntensity, setBloomIntensity] = useState(0.5);
  const [enableVignette, setEnableVignette] = useState(false);
  const [enableToneMapping, setEnableToneMapping] = useState(true);
  const [exposure, setExposure] = useState(1);
  const [enableDithering, setEnableDithering] = useState(false);
  const [ditheringIntensity, setDitheringIntensity] = useState(1.0);
  const [enablePixelation, setEnablePixelation] = useState(false);
  const [pixelSize, setPixelSize] = useState(6);
  const [enableOrderedDithering, setEnableOrderedDithering] = useState(false);
  const [orderedDitheringGridSize, setOrderedDitheringGridSize] = useState(4);
  const [orderedDitheringPixelSizeRatio, setOrderedDitheringPixelSizeRatio] = useState(1);
  const [orderedDitheringGrayscaleOnly, setOrderedDitheringGrayscaleOnly] = useState(false);
  const [orderedDitheringInvertColor, setOrderedDitheringInvertColor] = useState(false);
  const [orderedDitheringLuminanceMethod, setOrderedDitheringLuminanceMethod] = useState(1);
  const [orderedDitheringPreset, setOrderedDitheringPreset] =
    useState<OrderedDitheringPresetKey>('balanced');
  const [backgroundColor, setBackgroundColor] = useState('#1a1a2e');

  const applyOrderedDitheringPreset = useCallback(
    (preset: Exclude<OrderedDitheringPresetKey, 'custom'>) => {
      const config = orderedDitheringPresets[preset];
      setOrderedDitheringGridSize(config.gridSize);
      setOrderedDitheringPixelSizeRatio(config.pixelSizeRatio);
      setOrderedDitheringGrayscaleOnly(config.grayscaleOnly);
      setOrderedDitheringInvertColor(config.invertColor);
      setOrderedDitheringLuminanceMethod(config.luminanceMethod);
      setOrderedDitheringPreset(preset);
    },
    []
  );

  const resetSettings = useCallback(() => {
    setAutoRotate(true);
    setAutoRotateSpeed(2);
    setEnvironment('studio');
    setLighting('studio');
    setLightIntensity(1);
    setEnableShadows(true);
    setEnableContactShadows(true);
    setShowGround(false);
    setEnableBloom(false);
    setBloomIntensity(0.5);
    setEnableVignette(false);
    setEnableToneMapping(true);
    setExposure(1);
    setEnableDithering(false);
    setDitheringIntensity(1.0);
    setEnablePixelation(false);
    setPixelSize(6);
    setEnableOrderedDithering(false);
    setOrderedDitheringGridSize(4);
    setOrderedDitheringPixelSizeRatio(1);
    setOrderedDitheringGrayscaleOnly(false);
    setOrderedDitheringInvertColor(false);
    setOrderedDitheringLuminanceMethod(1);
    setOrderedDitheringPreset('balanced');
    setBackgroundColor('#1a1a2e');
  }, []);

  const stateValue = useMemo<Viewer3DStateContextType>(
    () => ({
      autoRotate,
      autoRotateSpeed,
      environment,
      lighting,
      lightIntensity,
      enableShadows,
      enableContactShadows,
      showGround,
      enableBloom,
      bloomIntensity,
      enableVignette,
      enableToneMapping,
      exposure,
      enableDithering,
      ditheringIntensity,
      enablePixelation,
      pixelSize,
      enableOrderedDithering,
      orderedDitheringGridSize,
      orderedDitheringPixelSizeRatio,
      orderedDitheringGrayscaleOnly,
      orderedDitheringInvertColor,
      orderedDitheringLuminanceMethod,
      orderedDitheringPreset,
      backgroundColor,
    }),
    [
      autoRotate,
      autoRotateSpeed,
      environment,
      lighting,
      lightIntensity,
      enableShadows,
      enableContactShadows,
      showGround,
      enableBloom,
      bloomIntensity,
      enableVignette,
      enableToneMapping,
      exposure,
      enableDithering,
      ditheringIntensity,
      enablePixelation,
      pixelSize,
      enableOrderedDithering,
      orderedDitheringGridSize,
      orderedDitheringPixelSizeRatio,
      orderedDitheringGrayscaleOnly,
      orderedDitheringInvertColor,
      orderedDitheringLuminanceMethod,
      orderedDitheringPreset,
      backgroundColor,
    ]
  );

  const actionsValue = useMemo<Viewer3DActionsContextType>(
    () => ({
      setAutoRotate,
      setAutoRotateSpeed,
      setEnvironment,
      setLighting,
      setLightIntensity,
      setEnableShadows,
      setEnableContactShadows,
      setShowGround,
      setEnableBloom,
      setBloomIntensity,
      setEnableVignette,
      setEnableToneMapping,
      setExposure,
      setEnableDithering,
      setDitheringIntensity,
      setEnablePixelation,
      setPixelSize,
      setEnableOrderedDithering,
      setOrderedDitheringGridSize,
      setOrderedDitheringPixelSizeRatio,
      setOrderedDitheringGrayscaleOnly,
      setOrderedDitheringInvertColor,
      setOrderedDitheringLuminanceMethod,
      setOrderedDitheringPreset,
      setBackgroundColor,
      resetSettings,
      applyOrderedDitheringPreset,
    }),
    [resetSettings, applyOrderedDitheringPreset]
  );

  return (
    <Viewer3DActionsContext.Provider value={actionsValue}>
      <Viewer3DStateContext.Provider value={stateValue}>{children}</Viewer3DStateContext.Provider>
    </Viewer3DActionsContext.Provider>
  );
}
