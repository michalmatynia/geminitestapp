'use client';

import React, { useMemo } from 'react';

import { getBlockTypographyStyles } from '../theme-styles';
import { useRequiredBlockSettings } from './BlockContext';
import { cn } from '@/shared/utils/ui-utils';

function Heading({ size, text, typoStyles }: { size: string, text: string, typoStyles: React.CSSProperties }): React.JSX.Element {
  if (size === 'small') {
    return (
      <h3 className='text-xl font-bold leading-tight tracking-tight md:text-2xl' style={typoStyles}>
        {text}
      </h3>
    );
  }
  if (size === 'large') {
    return (
      <h2 className='text-3xl font-bold leading-tight tracking-tight md:text-5xl' style={typoStyles}>
        {text}
      </h2>
    );
  }
  return (
    <h2 className='text-2xl font-bold leading-tight tracking-tight md:text-3xl' style={typoStyles}>
      {text}
    </h2>
  );
}

export function HeadingBlock(): React.JSX.Element {
  const settings = useRequiredBlockSettings();
  
  const text = (settings['headingText'] as string) || 'Heading';
  const size = (settings['headingSize'] as string) || 'medium';
  const typoStyles = useMemo(() => getBlockTypographyStyles(settings), [settings]);

  return <Heading size={size} text={text} typoStyles={typoStyles} />;
}
