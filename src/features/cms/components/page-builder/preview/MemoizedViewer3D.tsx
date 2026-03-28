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

export const MemoizedViewer3D = memo(function MemoizedViewer3D(
  props: MemoizedViewer3DProps
): React.ReactElement {
  const {
    modelUrl,
    height,
    backgroundColor,
    autoRotate,
    autoRotateSpeed,
    environment,
    lighting,
    lightIntensity,
    enableShadows,
    enableBloom,
    bloomIntensity,
    exposure,
    showGround,
    enableContactShadows,
    enableVignette,
    autoFit,
    presentationMode,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scale,
  } = props;

  const position = useMemo<[number, number, number]>(
    () => [positionX, positionY, positionZ],
    [positionX, positionY, positionZ]
  );
  const rotation = useMemo<[number, number, number]>(
    () => [toRadians(rotationX), toRadians(rotationY), toRadians(rotationZ)],
    [rotationX, rotationY, rotationZ]
  );

  return (
    <div style={{ height: `${Math.max(120, height)}px` }} className='w-full'>
      <Viewer3D
        modelUrl={modelUrl}
        settings={{
          backgroundColor,
          autoRotate,
          autoRotateSpeed,
          environment,
          lighting,
          lightIntensity,
          enableShadows,
          enableBloom,
          bloomIntensity,
          exposure,
          showGround,
          enableContactShadows,
          enableVignette,
          transform: {
            position,
            rotation,
            scale,
          },
        }}
        autoFit={autoFit}
        presentationMode={presentationMode}
        allowUserControls={false}
        className='h-full w-full'
      />
    </div>
  );
});
