'use client';

import React, { useMemo } from 'react';

import { FrontendBlockRenderer } from '../sections/FrontendBlockRenderer';
import { getBlockTypographyStyles } from '../theme-styles';
import { useRequiredBlockRenderContext, useRequiredBlockSettings } from './BlockContext';
import { type BlockInstance } from '@/shared/contracts/cms';

export function TextAtomBlock(): React.JSX.Element | null {
  const { block } = useRequiredBlockRenderContext();
  const settings = useRequiredBlockSettings();
  const text = (settings['text'] as string) || '';
  const alignment = (settings['alignment'] as string) || 'left';
  const letterGap = (settings['letterGap'] as number) || 0;
  const lineGap = (settings['lineGap'] as number) || 0;
  const wrap = (settings['wrap'] as string) || 'wrap';
  
  const letters: BlockInstance[] = useMemo(() => {
    if (Array.isArray(block.blocks) && block.blocks.length > 0) {
        return block.blocks;
    }
    return Array.from(text).map(
        (char: string, index: number): BlockInstance => ({
          id: `text-atom-${block.id}-${index}`,
          type: 'TextAtomLetter',
          settings: { textContent: char },
        })
    );
  }, [block.blocks, block.id, text]);

  if (letters.length === 0) return null;

  const justifyContent =
    alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start';

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: wrap === 'nowrap' ? 'nowrap' : 'wrap',
    justifyContent,
    alignItems: 'baseline',
    columnGap: `${letterGap}px`,
    rowGap: `${lineGap}px`,
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

export function TextAtomLetterBlock(): React.JSX.Element {
  const settings = useRequiredBlockSettings();
  const text = (settings['textContent'] as string) ?? '';
  const typoStyles = useMemo(() => getBlockTypographyStyles(settings), [settings]);
  
  return (
    <span className='inline-block' style={{ ...typoStyles, whiteSpace: 'pre' }}>
      {text}
    </span>
  );
}
