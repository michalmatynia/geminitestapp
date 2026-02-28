'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

import type { Asset3dOrderedDitheringPresetKey } from '@/shared/contracts/viewer3d';
import { internalError } from '@/shared/errors/app-error';

import type { LightingPreset, EnvironmentPreset } from '../components/Viewer3D';

export type OrderedDitheringPresetKey = Asset3dOrderedDitheringPresetKey;

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

export interface Viewer3DState {
  // View settings
  autoRotate: boolean;
  autoRotateSpeed: number;

  // Environment & Lighting
  environment: EnvironmentPreset;
  lighting: LightingPreset;
  lightIntensity: number;

  // Rendering
  enableShadows: boolean;
  enableContactShadows: boolean;
  showGround: boolean;

  // Post-processing
  enableBloom: boolean;
  bloomIntensity: number;
  enableVignette: boolean;
  enableToneMapping: boolean;
  exposure: number;

  // Dithering (special effect)
  enableDithering: boolean;
  ditheringIntensity: number;

  // Pixelation (pixel art effect)
  enablePixelation: boolean;
  pixelSize: number;

  // Ordered dithering shader
  enableOrderedDithering: boolean;
  orderedDitheringGridSize: number;
  orderedDitheringPixelSizeRatio: number;
  orderedDitheringGrayscaleOnly: boolean;
  orderedDitheringInvertColor: boolean;
  orderedDitheringLuminanceMethod: number;
  orderedDitheringPreset: OrderedDitheringPresetKey;

  // Background
  backgroundColor: string;
}

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

const Viewer3DContext = createContext<Viewer3DContextType | undefined>(undefined);

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

  const value = useMemo(
    () => ({
      autoRotate,
      setAutoRotate,
      autoRotateSpeed,
      setAutoRotateSpeed,
      environment,
      setEnvironment,
      lighting,
      setLighting,
      lightIntensity,
      setLightIntensity,
      enableShadows,
      setEnableShadows,
      enableContactShadows,
      setEnableContactShadows,
      showGround,
      setShowGround,
      enableBloom,
      setEnableBloom,
      bloomIntensity,
      setBloomIntensity,
      enableVignette,
      setEnableVignette,
      enableToneMapping,
      setEnableToneMapping,
      exposure,
      setExposure,
      enableDithering,
      setEnableDithering,
      ditheringIntensity,
      setDitheringIntensity,
      enablePixelation,
      setEnablePixelation,
      pixelSize,
      setPixelSize,
      enableOrderedDithering,
      setEnableOrderedDithering,
      orderedDitheringGridSize,
      setOrderedDitheringGridSize,
      orderedDitheringPixelSizeRatio,
      setOrderedDitheringPixelSizeRatio,
      orderedDitheringGrayscaleOnly,
      setOrderedDitheringGrayscaleOnly,
      orderedDitheringInvertColor,
      setOrderedDitheringInvertColor,
      orderedDitheringLuminanceMethod,
      setOrderedDitheringLuminanceMethod,
      orderedDitheringPreset,
      setOrderedDitheringPreset,
      backgroundColor,
      setBackgroundColor,
      resetSettings,
      applyOrderedDitheringPreset,
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
      resetSettings,
      applyOrderedDitheringPreset,
    ]
  );

  return <Viewer3DContext.Provider value={value}>{children}</Viewer3DContext.Provider>;
}

export function useViewer3D(): Viewer3DContextType {
  const context = useContext(Viewer3DContext);
  if (context === undefined) {
    throw internalError('useViewer3D must be used within a Viewer3DProvider');
  }
  return context;
}

export function useOptionalViewer3D(): Viewer3DContextType | undefined {
  return useContext(Viewer3DContext);
}
