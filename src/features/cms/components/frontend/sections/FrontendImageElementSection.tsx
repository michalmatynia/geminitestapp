'use client';

import React, { useMemo } from 'react';

import { FrontendBlockRenderer } from './FrontendBlockRenderer';
import { useOptionalSectionBlockData } from './SectionBlockContext';

import type { BlockInstance } from '../../../types/page-builder';

interface FrontendImageElementSectionProps {
  settings?: Record<string, unknown>;
}

export function FrontendImageElementSection({
  settings: propSettings,
}: FrontendImageElementSectionProps): React.ReactNode {
  const sectionBlockData = useOptionalSectionBlockData();
  const settings = propSettings ?? sectionBlockData?.settings ?? {};
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
