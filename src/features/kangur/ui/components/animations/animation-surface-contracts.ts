import React from 'react';

export type KangurAnimationSurfaceIdsDto = {
  clipId: string;
  frameGradientId: string;
  panelGradientId: string;
};

export type KangurAnimationSurfacePropsDto = {
  accentEnd: string;
  accentStart: string;
  atmosphereA: string;
  atmosphereB: string;
  ids: KangurAnimationSurfaceIdsDto;
  stroke: string;
  testIdPrefix: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
};

export function useKangurAnimationSurfaceIds(prefix: string): KangurAnimationSurfaceIdsDto {
  const baseId = React.useId().replace(/:/g, '');

  return {
    clipId: `${prefix}-${baseId}-clip`,
    frameGradientId: `${prefix}-${baseId}-frame`,
    panelGradientId: `${prefix}-${baseId}-panel`,
  };
}
