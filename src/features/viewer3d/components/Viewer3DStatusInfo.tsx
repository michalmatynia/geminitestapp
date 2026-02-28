'use client';

import { Layers } from 'lucide-react';
import React from 'react';

import { StatusBadge, PropertyRow } from '@/shared/ui';

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
      <div className='flex items-center gap-4'>
        <div className='flex items-center gap-2'>
          <Layers className='h-4 w-4 text-gray-500' />
          <PropertyRow label='Env' value={environment} valueClassName='text-gray-300' />
        </div>
        <PropertyRow label='Light' value={lighting} valueClassName='text-gray-300' />
      </div>
      <div className='flex items-center gap-2'>
        {enableBloom && <StatusBadge status='Bloom' variant='info' />}
        {enablePixelation && <StatusBadge status='Pixel Art' variant='warning' />}
        {enableOrderedDithering && <StatusBadge status='Ordered Dither' variant='info' />}
        {enableDithering && <StatusBadge status='Dithering' variant='neutral' />}
        {enableShadows && <StatusBadge status='Shadows' variant='info' />}
      </div>
    </div>
  );
}
