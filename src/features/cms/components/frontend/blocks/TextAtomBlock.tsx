'use client';

import React from 'react';

import { FrontendBlockRenderer } from '../sections/FrontendBlockRenderer';
import { getBlockTypographyStyles } from '../theme-styles';
import { useRequiredBlockRenderContext, useRequiredBlockSettings } from './BlockContext';

import type { BlockInstance } from '@/features/cms/types/page-builder';

export function TextAtomBlock(): React.ReactNode {
  const { block } = useRequiredBlockRenderContext();
  const settings = useRequiredBlockSettings();
  const text = (settings['text'] as string) || '';
  const alignment = (settings['alignment'] as string) || 'left';
  const letterGap = (settings['letterGap'] as number) || 0;
  const lineGap = (settings['lineGap'] as number) || 0;
  const wrap = (settings['wrap'] as string) || 'wrap';
  const letters = (block.blocks ?? []).length
    ? (block.blocks ?? [])
    : Array.from(text).map(
      (char: string, index: number): BlockInstance => ({
        id: `text-atom-${block.id}-${index}`,
        type: 'TextAtomLetter',
        settings: { textContent: char },
      })
    );

  if (!letters.length) return null;

  const justifyContent =
    alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start';

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: wrap === 'nowrap' ? 'nowrap' : 'wrap',
    justifyContent,
    alignItems: 'baseline',
    columnGap: letterGap,
    rowGap: lineGap,
    whiteSpace: wrap === 'nowrap' ? 'pre' : 'pre-wrap',
  };

  return (
    <div style={containerStyle}>
      {letters.map((letter: BlockInstance) => (
        <FrontendBlockRenderer key={letter.id} block={letter} />
      ))}
    </div>
  );
}

export function TextAtomLetterBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const text = (settings['textContent'] as string) ?? '';
  const typoStyles = getBlockTypographyStyles(settings);
  return (
    <span className='inline-block' style={{ ...typoStyles, whiteSpace: 'pre' }}>
      {text}
    </span>
  );
}
