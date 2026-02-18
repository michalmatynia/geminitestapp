'use client';

import { Layers } from 'lucide-react';
import React from 'react';

import { StatusBadge } from '@/shared/ui';

import { useViewer3D } from '../context/Viewer3DContext';

export function Viewer3DStatusInfo(): React.JSX.Element {
  const {
    environment,
    lighting,
    enableBloom,
    enablePixelation,
    enableOrderedDithering,
    enableDithering,
    enableShadows,
  } = useViewer3D();

  return (
    <div className='flex items-center justify-between px-4 py-2 border-t border-gray-700 bg-gray-900/80 flex-shrink-0'>
      <div className='flex items-center gap-2 text-xs text-gray-500'>
        <Layers className='h-4 w-4' />
        <span>{environment} environment</span>
        <span className='mx-1'>•</span>
        <span>{lighting} lighting</span>
      </div>
      <div className='flex items-center gap-2'>
        {enableBloom && (
          <StatusBadge status='Bloom' variant='info' />
        )}
        {enablePixelation && (
          <StatusBadge status='Pixel Art' variant='warning' />
        )}
        {enableOrderedDithering && (
          <StatusBadge status='Ordered Dither' variant='info' />
        )}
        {enableDithering && (
          <StatusBadge status='Dithering' variant='neutral' />
        )}
        {enableShadows && (
          <StatusBadge status='Shadows' variant='info' />
        )}
      </div>
    </div>
  );
}
