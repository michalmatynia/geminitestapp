'use client';

import React, { useMemo, memo } from 'react';

import { Viewer3D, type EnvironmentPreset, type LightingPreset } from '@/features/viewer3d';

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

export const MemoizedViewer3D = memo(function MemoizedViewer3D({
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
}: MemoizedViewer3DProps): React.ReactElement {
  const position = useMemo<[number, number, number]>(
    () => [positionX, positionY, positionZ],
    [positionX, positionY, positionZ]
  );
  const rotation = useMemo<[number, number, number]>(
    () => [toRadians(rotationX), toRadians(rotationY), toRadians(rotationZ)],
    [rotationX, rotationY, rotationZ]
  );

  return (
    <div style={{ height: `${Math.max(120, height)}px` }} className="w-full">
      <Viewer3D
        modelUrl={modelUrl}
        backgroundColor={backgroundColor}
        autoRotate={autoRotate}
        autoRotateSpeed={autoRotateSpeed}
        environment={environment}
        lighting={lighting}
        lightIntensity={lightIntensity}
        enableShadows={enableShadows}
        enableBloom={enableBloom}
        bloomIntensity={bloomIntensity}
        exposure={exposure}
        showGround={showGround}
        enableContactShadows={enableContactShadows}
        enableVignette={enableVignette}
        autoFit={autoFit}
        presentationMode={presentationMode}
        allowUserControls={false}
        modelPosition={position}
        modelRotation={rotation}
        modelScale={scale}
        className="h-full w-full"
      />
    </div>
  );
});
