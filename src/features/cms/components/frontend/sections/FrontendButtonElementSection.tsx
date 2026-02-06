'use client';

import React, { useMemo } from 'react';

import { FrontendBlockRenderer } from './FrontendBlockRenderer';

import type { BlockInstance } from '../../../types/page-builder';

interface FrontendButtonElementSectionProps {
  settings: Record<string, unknown>;
}

export function FrontendButtonElementSection({
  settings,
}: FrontendButtonElementSectionProps): React.ReactNode {
  const blockSettings = useMemo(() => {
    const { gsapAnimation, ...rest } = settings;
    return rest;
  }, [settings]);

  const block = useMemo<BlockInstance>(
    () => ({
      id: 'button-element-section',
      type: 'Button',
      settings: blockSettings,
    }),
    [blockSettings]
  );

  return (
    <section className="m-0 w-full p-0">
      <FrontendBlockRenderer block={block} />
    </section>
  );
}
