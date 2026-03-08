'use client';

import React, { useMemo } from 'react';

import { FrontendBlockRenderer } from './FrontendBlockRenderer';
import { useSectionBlockData } from './SectionBlockContext';

import type { BlockInstance } from '@/features/cms/types/page-builder';

export function FrontendModel3DElementSection(): React.ReactNode {
  const { settings } = useSectionBlockData();
  const blockSettings = useMemo(() => {
    const { gsapAnimation: _gsapAnimation, ...rest } = settings;
    return rest;
  }, [settings]);

  const block = useMemo<BlockInstance>(
    () => ({
      id: 'model3d-element-section',
      type: 'Model3D',
      settings: blockSettings,
    }),
    [blockSettings]
  );

  return (
    <section className='m-0 w-full p-0'>
      <FrontendBlockRenderer block={block} />
    </section>
  );
}
