'use client';

import React, { useMemo, memo } from 'react';

import {
  Viewer3D,
  type EnvironmentPreset,
  type LightingPreset,
} from '@/features/viewer3d/public';

import { toRadians } from './preview-utils';

// Memoized 3D viewer wrapper to prevent re-renders when parent selection state changes
export interface MemoizedViewer3DProps {
  modelUrl: string;
  height: number;
  backgroundColor: string;
  autoRotate: boolean;
  autoRotateSpeed: number;
  environment: EnvironmentPreset;
  lighting: LightingPreset;
  lightIntensity: number;
  enableShadows: boolean;
  enableBloom: boolean;
  bloomIntensity: number;
  exposure: number;
  showGround: boolean;
  enableContactShadows: boolean;
  enableVignette: boolean;
  autoFit: boolean;
  presentationMode: boolean;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
}

export const MemoizedViewer3D = memo((
  props: MemoizedViewer3DProps
): React.ReactElement => {
  const { height, modelUrl, autoFit, presentationMode } = props;

  const position = useMemo<[number, number, number]>(
    () => [props.positionX, props.positionY, props.positionZ],
    [props.positionX, props.positionY, props.positionZ]
  );
  const rotation = useMemo<[number, number, number]>(
    () => [toRadians(props.rotationX), toRadians(props.rotationY), toRadians(props.rotationZ)],
    [props.rotationX, props.rotationY, props.rotationZ]
  );

  const viewerSettings = useMemo(() => ({
    backgroundColor: props.backgroundColor,
    autoRotate: props.autoRotate,
    autoRotateSpeed: props.autoRotateSpeed,
    environment: props.environment,
    lighting: props.lighting,
    lightIntensity: props.lightIntensity,
    enableShadows: props.enableShadows,
    enableBloom: props.enableBloom,
    bloomIntensity: props.bloomIntensity,
    exposure: props.exposure,
    showGround: props.showGround,
    enableContactShadows: props.enableContactShadows,
    enableVignette: props.enableVignette,
    transform: { position, rotation, scale: props.scale },
  }), [props, position, rotation]);

  return (
    <div style={{ height: `${Math.max(120, height)}px` }} className='w-full'>
      <Viewer3D
        modelUrl={modelUrl}
        settings={viewerSettings}
        autoFit={autoFit}
        presentationMode={presentationMode}
        allowUserControls={false}
        className='h-full w-full'
      />
    </div>
  );
});
