'use client';

import React from 'react';

export function useEnglishAnimationSurfaceIds(prefix: string): {
  clipId: string;
  panelGradientId: string;
  atmosphereGradientId: string;
  accentGradientId: string;
} {
  const baseId = React.useId().replace(/:/g, '');

  return {
    clipId: `${prefix}-${baseId}-clip`,
    panelGradientId: `${prefix}-${baseId}-panel`,
    atmosphereGradientId: `${prefix}-${baseId}-atmosphere`,
    accentGradientId: `${prefix}-${baseId}-accent`,
  };
}
