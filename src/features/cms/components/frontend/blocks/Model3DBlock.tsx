'use client';

import React, { useMemo } from 'react';

import {
  Viewer3D,
  type EnvironmentPreset,
  type LightingPreset,
} from '@/features/viewer3d/public';
import { useRequiredBlockSettings } from './BlockContext';
import { toBoolean } from './image-utils';

const toNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

type Model3DSettings = {
  assetId: string;
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
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
};

const resolveModel3DSettings = (settings: Record<string, unknown>): Model3DSettings => ({
  assetId: (settings['assetId'] as string) || '',
  height: toNumber(settings['height'], 360),
  backgroundColor: (settings['backgroundColor'] as string) || '#111827',
  autoRotate: toBoolean(settings['autoRotate'], true),
  autoRotateSpeed: toNumber(settings['autoRotateSpeed'], 2),
  environment: (settings['environment'] as EnvironmentPreset) || 'studio',
  lighting: (settings['lighting'] as LightingPreset) || 'studio',
  lightIntensity: toNumber(settings['lightIntensity'], 1),
  enableShadows: toBoolean(settings['enableShadows'], true),
  enableBloom: toBoolean(settings['enableBloom'], false),
  bloomIntensity: toNumber(settings['bloomIntensity'], 0.5),
  exposure: toNumber(settings['exposure'], 1),
  showGround: toBoolean(settings['showGround'], false),
  enableContactShadows: toBoolean(settings['enableContactShadows'], true),
  enableVignette: toBoolean(settings['enableVignette'], false),
  autoFit: toBoolean(settings['autoFit'], true),
  presentationMode: toBoolean(settings['presentationMode'], false),
  position: [
    toNumber(settings['positionX'], 0),
    toNumber(settings['positionY'], 0),
    toNumber(settings['positionZ'], 0),
  ],
  rotation: [
    toRadians(toNumber(settings['rotationX'], 0)),
    toRadians(toNumber(settings['rotationY'], 0)),
    toRadians(toNumber(settings['rotationZ'], 0)),
  ],
  scale: toNumber(settings['scale'], 1),
});

export function Model3DBlock(): React.JSX.Element | null {
  const settings = useRequiredBlockSettings();
  const s = useMemo(() => resolveModel3DSettings(settings), [settings]);
  
  if (!s.assetId) return null;

  const modelUrl = `/api/assets3d/${s.assetId}/file`;

  return (
    <div className='w-full' style={{ height: `${Math.max(120, s.height)}px` }}>
      <Viewer3D
        modelUrl={modelUrl}
        settings={{
          backgroundColor: s.backgroundColor,
          autoRotate: s.autoRotate,
          autoRotateSpeed: s.autoRotateSpeed,
          environment: s.environment,
          lighting: s.lighting,
          lightIntensity: s.lightIntensity,
          enableShadows: s.enableShadows,
          enableBloom: s.enableBloom,
          bloomIntensity: s.bloomIntensity,
          exposure: s.exposure,
          showGround: s.showGround,
          enableContactShadows: s.enableContactShadows,
          enableVignette: s.enableVignette,
          transform: {
            position: s.position,
            rotation: s.rotation,
            scale: s.scale,
          },
        }}
        autoFit={s.autoFit}
        presentationMode={s.presentationMode}
        allowUserControls={false}
        className='h-full w-full'
      />
    </div>
  );
}
