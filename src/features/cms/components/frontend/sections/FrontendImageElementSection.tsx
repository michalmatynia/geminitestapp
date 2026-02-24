'use client';

import React, { useMemo } from 'react';

import { FrontendBlockRenderer } from './FrontendBlockRenderer';
import { useSectionBlockData } from './SectionBlockContext';

import type { BlockInstance } from '../../../types/page-builder';

export function FrontendImageElementSection(): React.ReactNode {
  const { settings } = useSectionBlockData();
  const blockSettings = useMemo(() => {
    const { gsapAnimation: _gsapAnimation, ...rest } = settings;
    return rest;
  }, [settings]);

  const block = useMemo<BlockInstance>(
    () => ({
      id: 'image-element-section',
      type: 'ImageElement',
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
