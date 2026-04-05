import React from 'react';

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

export function Model3DBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const assetId = (settings['assetId'] as string) || '';
  if (!assetId) return null;

  const height = toNumber(settings['height'], 360);
  const backgroundColor = (settings['backgroundColor'] as string) || '#111827';
  const autoRotate = toBoolean(settings['autoRotate'], true);
  const autoRotateSpeed = toNumber(settings['autoRotateSpeed'], 2);
  const environment = (settings['environment'] as EnvironmentPreset) || 'studio';
  const lighting = (settings['lighting'] as LightingPreset) || 'studio';
  const lightIntensity = toNumber(settings['lightIntensity'], 1);
  const enableShadows = toBoolean(settings['enableShadows'], true);
  const enableBloom = toBoolean(settings['enableBloom'], false);
  const bloomIntensity = toNumber(settings['bloomIntensity'], 0.5);
  const exposure = toNumber(settings['exposure'], 1);
  const showGround = toBoolean(settings['showGround'], false);
  const enableContactShadows = toBoolean(settings['enableContactShadows'], true);
  const enableVignette = toBoolean(settings['enableVignette'], false);
  const autoFit = toBoolean(settings['autoFit'], true);
  const presentationMode = toBoolean(settings['presentationMode'], false);
  const position = [
    toNumber(settings['positionX'], 0),
    toNumber(settings['positionY'], 0),
    toNumber(settings['positionZ'], 0),
  ] as [number, number, number];
  const rotation = [
    toRadians(toNumber(settings['rotationX'], 0)),
    toRadians(toNumber(settings['rotationY'], 0)),
    toRadians(toNumber(settings['rotationZ'], 0)),
  ] as [number, number, number];
  const scale = toNumber(settings['scale'], 1);
  const modelUrl = `/api/assets3d/${assetId}/file`;

  return (
    <div className='w-full' style={{ height: `${Math.max(120, height)}px` }}>
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
}
