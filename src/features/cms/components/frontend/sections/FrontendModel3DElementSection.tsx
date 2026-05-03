'use client';

import React, { useMemo } from 'react';

import type { BlockInstance } from '@/features/cms/types/page-builder';

import { FrontendBlockRenderer } from './FrontendBlockRenderer';
import { useSectionBlockData } from './SectionBlockContext';


export function FrontendModel3DElementSection(): React.ReactNode {
  const { settings } = useSectionBlockData();
  const blockSettings = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { gsapAnimation, ...rest } = settings;
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
