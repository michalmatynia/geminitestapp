'use client';

import { Layers } from 'lucide-react';
import React from 'react';

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
          <span className='px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded'>
            Bloom
          </span>
        )}
        {enablePixelation && (
          <span className='px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded'>
            Pixel Art
          </span>
        )}
        {enableOrderedDithering && (
          <span className='px-2 py-0.5 text-xs bg-teal-500/20 text-teal-400 rounded'>
            Ordered Dither
          </span>
        )}
        {enableDithering && (
          <span className='px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded'>
            Dithering
          </span>
        )}
        {enableShadows && (
          <span className='px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded'>
            Shadows
          </span>
        )}
      </div>
    </div>
  );
}
