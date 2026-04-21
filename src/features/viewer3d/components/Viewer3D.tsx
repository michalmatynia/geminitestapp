'use client';

import React, { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import {
  OrbitControls,
  Center,
  Environment,
  ContactShadows,
  Bounds,
  PresentationControls,
} from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode, BlendFunction } from 'postprocessing';

import type {
  Asset3dLightingPreset,
  Asset3dEnvironmentPreset,
  Viewer3DSettings,
} from '@/shared/contracts/viewer3d';

import { useOptionalViewer3DState } from '../context/Viewer3DContext';
import { DitheringPass } from './shaders/DitheringEffect';
import { OrderedDitheringPass } from './shaders/OrderedDitheringEffect';
import { PixelationPass } from './shaders/PixelationEffect';
import {
  Model3DErrorBoundary,
  Loader,
  AutoRotateGroup,
  Ground,
  SceneLighting,
  ScreenshotCapture,
} from './Viewer3DSubcomponents';
import { Model3D } from './Model3D';

export type LightingPreset = Asset3dLightingPreset;
export type EnvironmentPreset = Asset3dEnvironmentPreset;

export interface Viewer3DProps {
  modelUrl: string;
  settings?: Viewer3DSettings;
  className?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  autoFit?: boolean;
  presentationMode?: boolean;
  allowUserControls?: boolean;
  captureRef?: React.MutableRefObject<(() => string | null) | null>;
}

interface ResolvedSettings {
  backgroundColor: string;
  enableDithering: boolean;
  ditheringIntensity: number;
  enableOrderedDithering: boolean;
  orderedDitheringGridSize: number;
  orderedDitheringPixelSizeRatio: number;
  orderedDitheringGrayscaleOnly: boolean;
  orderedDitheringInvertColor: boolean;
  orderedDitheringLuminanceMethod: number;
  enablePixelation: boolean;
  pixelSize: number;
  enableBloom: boolean;
  bloomIntensity: number;
  enableToneMapping: boolean;
  exposure: number;
  enableVignette: boolean;
  enableAntiAliasing: boolean;
  enableShadows: boolean;
  environment: EnvironmentPreset | 'none' | 'gym';
  lighting: LightingPreset;
  lightIntensity: number;
  showGround: boolean;
  enableContactShadows: boolean;
  autoRotate: boolean;
  autoRotateSpeed: number;
  modelTransform?: Viewer3DSettings['transform'];
}

function useViewerSettings(propSettings?: Viewer3DSettings): ResolvedSettings {
  const context = useOptionalViewer3DState();
  
  const getSetting = <K extends keyof Viewer3DSettings>(
    key: K,
    defaultValue: Required<Viewer3DSettings>[K]
  ): Required<Viewer3DSettings>[K] => {
    if (propSettings?.[key] !== undefined) return propSettings[key] as Required<Viewer3DSettings>[K];
    if (context?.[key as keyof typeof context] !== undefined)
      return context[key as keyof typeof context] as Required<Viewer3DSettings>[K];
    return defaultValue;
  };

  return {
    backgroundColor: getSetting('backgroundColor', '#1a1a2e'),
    enableDithering: getSetting('enableDithering', false),
    ditheringIntensity: getSetting('ditheringIntensity', 1.0),
    enableOrderedDithering: getSetting('enableOrderedDithering', false),
    orderedDitheringGridSize: getSetting('orderedDitheringGridSize', 4),
    orderedDitheringPixelSizeRatio: getSetting('orderedDitheringPixelSizeRatio', 1),
    orderedDitheringGrayscaleOnly: getSetting('orderedDitheringGrayscaleOnly', false),
    orderedDitheringInvertColor: getSetting('orderedDitheringInvertColor', false),
    orderedDitheringLuminanceMethod: getSetting('orderedDitheringLuminanceMethod', 1),
    enablePixelation: getSetting('enablePixelation', false),
    pixelSize: getSetting('pixelSize', 6),
    enableBloom: getSetting('enableBloom', false),
    bloomIntensity: getSetting('bloomIntensity', 0.5),
    enableToneMapping: getSetting('enableToneMapping', true),
    exposure: getSetting('exposure', 1),
    enableVignette: getSetting('enableVignette', false),
    enableAntiAliasing: getSetting('enableAntiAliasing', true),
    enableShadows: getSetting('enableShadows', true),
    environment: getSetting('environment', 'studio' as EnvironmentPreset),
    lighting: getSetting('lighting', 'studio' as LightingPreset),
    lightIntensity: getSetting('lightIntensity', 1),
    showGround: getSetting('showGround', false),
    enableContactShadows: getSetting('enableContactShadows', true),
    autoRotate: getSetting('autoRotate', true),
    autoRotateSpeed: getSetting('autoRotateSpeed', 2),
    modelTransform: propSettings?.transform,
  };
}

function ViewerEffects({ s }: { s: ResolvedSettings }): React.JSX.Element | null {
  const hasPostProcessing = s.enableDithering || s.enableOrderedDithering || s.enablePixelation || s.enableBloom || s.enableToneMapping || s.enableVignette || s.enableAntiAliasing;
  
  const effects = useMemo(() => {
    const list: React.ReactElement[] = [];
    if (s.enableAntiAliasing) list.push(<SMAA key='smaa' />);
    if (s.enableToneMapping) list.push(<ToneMapping key='tm' mode={ToneMappingMode.ACES_FILMIC} />);
    if (s.enableBloom) list.push(<Bloom key='bl' intensity={s.bloomIntensity} luminanceThreshold={0.9} luminanceSmoothing={0.025} />);
    if (s.enableVignette) list.push(<Vignette key='vg' offset={0.3} darkness={0.5} blendFunction={BlendFunction.NORMAL} />);
    if (s.enablePixelation) list.push(<PixelationPass key='px' pixelSize={Math.max(1, s.pixelSize)} />);
    if (s.enableOrderedDithering) {
      list.push(<OrderedDitheringPass key='od' gridSize={s.orderedDitheringGridSize} pixelSizeRatio={s.orderedDitheringPixelSizeRatio} grayscaleOnly={s.orderedDitheringGrayscaleOnly} invertColor={s.orderedDitheringInvertColor} luminanceMethod={s.orderedDitheringLuminanceMethod} />);
    }
    if (s.enableDithering) list.push(<DitheringPass key='dt' intensity={s.ditheringIntensity} />);
    return list;
  }, [s.enableAntiAliasing, s.enableToneMapping, s.enableBloom, s.bloomIntensity, s.enableVignette, s.enablePixelation, s.pixelSize, s.enableOrderedDithering, s.orderedDitheringGridSize, s.orderedDitheringPixelSizeRatio, s.orderedDitheringGrayscaleOnly, s.orderedDitheringInvertColor, s.orderedDitheringLuminanceMethod, s.enableDithering, s.ditheringIntensity]);

  if (!hasPostProcessing || effects.length === 0) return null;
  return <EffectComposer multisampling={0}>{effects}</EffectComposer>;
}

function SceneContent({ modelNode, autoFit, s, presentationMode, allowUserControls }: { modelNode: React.ReactNode, autoFit: boolean, s: ResolvedSettings, presentationMode: boolean, allowUserControls: boolean }): React.JSX.Element {
  const content = autoFit ? <Bounds fit clip observe margin={1.2}>{modelNode}</Bounds> : modelNode;
  
  return (
    <>
      {presentationMode && allowUserControls ? (
        <PresentationControls global rotation={[0, 0, 0]} polar={[-Math.PI / 4, Math.PI / 4]} azimuth={[-Math.PI / 4, Math.PI / 4]}>
          <Center>{content}</Center>
        </PresentationControls>
      ) : (
        <Center>{content}</Center>
      )}
      <Ground showGround={s.showGround} />
      {s.enableContactShadows && <ContactShadows opacity={0.5} scale={10} blur={2} far={4} resolution={256} color='#000000' />}
    </>
  );
}

export function Viewer3D(props: Viewer3DProps): React.JSX.Element {
  const { modelUrl, settings: propSettings, className, onLoad, onError, autoFit = true, presentationMode = false, allowUserControls = true, captureRef } = props;
  const s = useViewerSettings(propSettings);

  const modelNode = (
    <Model3DErrorBoundary onError={onError}>
      <AutoRotateGroup autoRotate={s.autoRotate} autoRotateSpeed={s.autoRotateSpeed}>
        <Model3D url={modelUrl} onLoad={onLoad} onError={onError} position={s.modelTransform?.position} rotation={s.modelTransform?.rotation} scale={s.modelTransform?.scale} enableShadows={s.enableShadows} />
      </AutoRotateGroup>
    </Model3DErrorBoundary>
  );

  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 5], fov: 45, near: 0.1, far: 1000 }} shadows={s.enableShadows} gl={{ preserveDrawingBuffer: true, antialias: !(s.enableAntiAliasing), toneMapping: s.enableToneMapping ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping, toneMappingExposure: s.exposure, outputColorSpace: THREE.SRGBColorSpace }} dpr={[1, 2]}>
        {captureRef !== undefined ? <ScreenshotCapture captureRef={captureRef} /> : null}
        <color attach='background' args={[s.backgroundColor]} />
        <SceneLighting preset={s.lighting} intensity={s.lightIntensity} />
        {s.environment !== 'none' && s.environment !== 'gym' && <Environment preset={s.environment as 'studio'} background={false} />}
        <Suspense fallback={<Loader />}>
          <SceneContent modelNode={modelNode} autoFit={autoFit} s={s} presentationMode={presentationMode} allowUserControls={allowUserControls} />
        </Suspense>
        {!presentationMode && allowUserControls && <OrbitControls autoRotate={s.autoRotate} autoRotateSpeed={s.autoRotateSpeed} enablePan={allowUserControls} enableZoom={allowUserControls} enableRotate={allowUserControls} enableDamping dampingFactor={0.05} minDistance={0.5} maxDistance={100} minPolarAngle={0} maxPolarAngle={Math.PI} />}
        <ViewerEffects s={s} />
      </Canvas>
    </div>
  );
}
