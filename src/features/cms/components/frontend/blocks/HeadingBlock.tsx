import React from 'react';

import { getBlockTypographyStyles } from '../theme-styles';
import { useRequiredBlockSettings } from './BlockContext';

export function HeadingBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const text = (settings['headingText'] as string) || 'Heading';
  const size = (settings['headingSize'] as string) || 'medium';
  const typoStyles = getBlockTypographyStyles(settings);

  if (size === 'small') {
    return (
      <h3 className='text-xl font-bold leading-tight tracking-tight md:text-2xl' style={typoStyles}>
        {text}
      </h3>
    );
  }
  if (size === 'large') {
    return (
      <h2
        className='text-3xl font-bold leading-tight tracking-tight md:text-5xl'
        style={typoStyles}
      >
        {text}
      </h2>
    );
  }
  // medium
  return (
    <h2 className='text-2xl font-bold leading-tight tracking-tight md:text-3xl' style={typoStyles}>
      {text}
    </h2>
  );
}
