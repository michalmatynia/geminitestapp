/**
 * 3D Viewer Context
 * 
 * React Context for managing 3D viewer state and settings.
 * Provides:
 * - Rendering settings (lighting, shadows, bloom, etc.)
 * - Post-processing effects (dithering, pixelation, vignette)
 * - Camera and environment configuration
 * - Preset management for ordered dithering
 * - Type-safe state management for 3D viewer
 * 
 * Client-side context for React components
 */

'use client';

import React, { useState, useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';

import type {
  Asset3dOrderedDitheringPresetKey,
  Asset3dRenderMode,
  Viewer3DState,
} from '@/shared/contracts/viewer3d';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { LightingPreset, EnvironmentPreset } from '../components/Viewer3D';

export type OrderedDitheringPresetKey = Asset3dOrderedDitheringPresetKey;

export type { Viewer3DState };

/**
 * Predefined ordered dithering effect presets
 * Each preset combines multiple dithering parameters for specific visual styles
 */
export const orderedDitheringPresets = {
  /** Balanced dithering with color and moderate grid size */
  balanced: {
    label: 'Balanced',
    gridSize: 4,
    pixelSizeRatio: 1,
    grayscaleOnly: false,
    invertColor: false,
    luminanceMethod: 1,
  },
  /** Fine monochrome dithering with small grid for detailed appearance */
  fineMono: {
    label: 'Fine Mono',
    gridSize: 3,
    pixelSizeRatio: 0.9,
    grayscaleOnly: true,
    invertColor: false,
    luminanceMethod: 1,
  },
  /** Chunky monochrome dithering with large grid for retro appearance */
  chunkyMono: {
    label: 'Chunky Mono',
    gridSize: 6,
    pixelSizeRatio: 1.6,
    grayscaleOnly: true,
    invertColor: false,
    luminanceMethod: 1,
  },
  /** Inverted color dithering for high-contrast appearance */
  inverted: {
    label: 'Inverted',
    gridSize: 4,
    pixelSizeRatio: 1,
    grayscaleOnly: false,
    invertColor: true,
    luminanceMethod: 1,
  },
} as const;

/**
 * Context type definition for 3D viewer state and actions
 * Includes all rendering settings and effect controls
 */
interface Viewer3DContextType extends Viewer3DState {
  // Rendering and camera controls
  setAutoRotate: (value: boolean) => void;
  setAutoRotateSpeed: (value: number) => void;
  setRenderMode: (value: Asset3dRenderMode) => void;
  setEnvironment: (value: EnvironmentPreset) => void;
  setLighting: (value: LightingPreset) => void;
  setLightIntensity: (value: number) => void;
  
  // Shadow and ground rendering
  setEnableShadows: (value: boolean) => void;
  setEnableContactShadows: (value: boolean) => void;
  setShowGround: (value: boolean) => void;
  
  // Post-processing effects
  setEnableBloom: (value: boolean) => void;
  setBloomIntensity: (value: number) => void;
  setEnableVignette: (value: boolean) => void;
  setEnableToneMapping: (value: boolean) => void;
  setExposure: (value: number) => void;
  
  // Dithering effects
  setEnableDithering: (value: boolean) => void;
  setDitheringIntensity: (value: number) => void;
  setEnableOrderedDithering: (value: boolean) => void;
  setOrderedDitheringGridSize: (value: number) => void;
  setOrderedDitheringPixelSizeRatio: (value: number) => void;
  setOrderedDitheringGrayscaleOnly: (value: boolean) => void;
  setOrderedDitheringInvertColor: (value: boolean) => void;
  setOrderedDitheringLuminanceMethod: (value: number) => void;
  setOrderedDitheringPreset: (value: OrderedDitheringPresetKey) => void;
  
  // Pixelation effects
  setEnablePixelation: (value: boolean) => void;
  setPixelSize: (value: number) => void;
  
  // Appearance
  setBackgroundColor: (value: string) => void;

  // Batch operations
  resetSettings: () => void;
  applyOrderedDitheringPreset: (preset: Exclude<OrderedDitheringPresetKey, 'custom'>) => void;
}

/**
 * Union type of all action setter keys in the context
 * Used for type-safe action dispatching
 */
type Viewer3DActionsKey =
  | 'setAutoRotate'
  | 'setAutoRotateSpeed'
  | 'setRenderMode'
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

export const { Context: Viewer3DActionsContext, useStrictContext: useViewer3DActions } =
  createStrictContext<Viewer3DActionsContextType>({
    hookName: 'useViewer3DActions',
    providerName: 'a Viewer3DProvider',
    displayName: 'Viewer3DActionsContext',
    errorFactory: internalError,
  });

const initialViewer3DState: Viewer3DStateContextType = {
  autoRotate: true,
  autoRotateSpeed: 2,
  renderMode: 'textured',
  environment: 'studio',
  lighting: 'studio',
  lightIntensity: 1,
  enableShadows: true,
  enableContactShadows: true,
  showGround: false,
  enableBloom: false,
  bloomIntensity: 0.5,
  enableVignette: false,
  enableToneMapping: true,
  exposure: 1,
  enableDithering: false,
  ditheringIntensity: 1.0,
  enablePixelation: false,
  pixelSize: 6,
  enableOrderedDithering: false,
  orderedDitheringGridSize: 4,
  orderedDitheringPixelSizeRatio: 1,
  orderedDitheringGrayscaleOnly: false,
  orderedDitheringInvertColor: false,
  orderedDitheringLuminanceMethod: 1,
  orderedDitheringPreset: 'balanced',
  backgroundColor: '#1a1a2e',
};

type Viewer3DStateSetter = Dispatch<SetStateAction<Viewer3DStateContextType>>;

const setViewerValue =
  <K extends keyof Viewer3DStateContextType>(setViewerState: Viewer3DStateSetter, key: K) =>
    (value: Viewer3DStateContextType[K]): void => {
      setViewerState((current) => ({ ...current, [key]: value }));
    };

const createViewer3DActions = (
  setViewerState: Viewer3DStateSetter,
  resetSettings: () => void,
  applyOrderedDitheringPreset: (preset: Exclude<OrderedDitheringPresetKey, 'custom'>) => void
): Viewer3DActionsContextType => ({
  setAutoRotate: setViewerValue(setViewerState, 'autoRotate'),
  setAutoRotateSpeed: setViewerValue(setViewerState, 'autoRotateSpeed'),
  setRenderMode: setViewerValue(setViewerState, 'renderMode'),
  setEnvironment: setViewerValue(setViewerState, 'environment'),
  setLighting: setViewerValue(setViewerState, 'lighting'),
  setLightIntensity: setViewerValue(setViewerState, 'lightIntensity'),
  setEnableShadows: setViewerValue(setViewerState, 'enableShadows'),
  setEnableContactShadows: setViewerValue(setViewerState, 'enableContactShadows'),
  setShowGround: setViewerValue(setViewerState, 'showGround'),
  setEnableBloom: setViewerValue(setViewerState, 'enableBloom'),
  setBloomIntensity: setViewerValue(setViewerState, 'bloomIntensity'),
  setEnableVignette: setViewerValue(setViewerState, 'enableVignette'),
  setEnableToneMapping: setViewerValue(setViewerState, 'enableToneMapping'),
  setExposure: setViewerValue(setViewerState, 'exposure'),
  setEnableDithering: setViewerValue(setViewerState, 'enableDithering'),
  setDitheringIntensity: setViewerValue(setViewerState, 'ditheringIntensity'),
  setEnablePixelation: setViewerValue(setViewerState, 'enablePixelation'),
  setPixelSize: setViewerValue(setViewerState, 'pixelSize'),
  setEnableOrderedDithering: setViewerValue(setViewerState, 'enableOrderedDithering'),
  setOrderedDitheringGridSize: setViewerValue(setViewerState, 'orderedDitheringGridSize'),
  setOrderedDitheringPixelSizeRatio: setViewerValue(setViewerState, 'orderedDitheringPixelSizeRatio'),
  setOrderedDitheringGrayscaleOnly: setViewerValue(setViewerState, 'orderedDitheringGrayscaleOnly'),
  setOrderedDitheringInvertColor: setViewerValue(setViewerState, 'orderedDitheringInvertColor'),
  setOrderedDitheringLuminanceMethod: setViewerValue(setViewerState, 'orderedDitheringLuminanceMethod'),
  setOrderedDitheringPreset: setViewerValue(setViewerState, 'orderedDitheringPreset'),
  setBackgroundColor: setViewerValue(setViewerState, 'backgroundColor'),
  resetSettings,
  applyOrderedDitheringPreset,
});

export function Viewer3DProvider({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState?: Partial<Viewer3DStateContextType>;
}): React.JSX.Element {
  const resolvedInitialState = useMemo(
    () => ({ ...initialViewer3DState, ...initialState }),
    [initialState]
  );
  const [stateValue, setViewerState] = useState<Viewer3DStateContextType>(
    () => resolvedInitialState
  );
  const resetSettings = useCallback(
    (): void => setViewerState({ ...resolvedInitialState }),
    [resolvedInitialState]
  );
  const applyOrderedDitheringPreset = useCallback(
    (preset: Exclude<OrderedDitheringPresetKey, 'custom'>): void => {
      const config = orderedDitheringPresets[preset];
      setViewerState((current) => ({
        ...current,
        orderedDitheringGridSize: config.gridSize,
        orderedDitheringPixelSizeRatio: config.pixelSizeRatio,
        orderedDitheringGrayscaleOnly: config.grayscaleOnly,
        orderedDitheringInvertColor: config.invertColor,
        orderedDitheringLuminanceMethod: config.luminanceMethod,
        orderedDitheringPreset: preset,
      }));
    },
    []
  );

  const actionsValue = useMemo(
    () => createViewer3DActions(setViewerState, resetSettings, applyOrderedDitheringPreset),
    [resetSettings, applyOrderedDitheringPreset]
  );

  return (
    <Viewer3DActionsContext.Provider value={actionsValue}>
      <Viewer3DStateContext.Provider value={stateValue}>{children}</Viewer3DStateContext.Provider>
    </Viewer3DActionsContext.Provider>
  );
}
