'use client';

import React from 'react';

import { getBlockTypographyStyles } from '../theme-styles';
import { useRequiredBlockSettings } from './BlockContext';

export function TextBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const text = (settings['textContent'] as string) || '';
  if (!text) return null;
  const typoStyles = getBlockTypographyStyles(settings);
  return (
    <p
      className='text-base leading-relaxed text-[var(--cms-appearance-page-text)] md:text-lg'
      style={typoStyles}
    >
      {text}
    </p>
  );
}

export function TextElementBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const text = (settings['textContent'] as string) || '';
  if (!text) return null;
  const typoStyles = getBlockTypographyStyles(settings);
  return (
    <p
      className='m-0 p-0 text-base leading-relaxed text-[var(--cms-appearance-page-text)]'
      style={typoStyles}
    >
      {text}
    </p>
  );
}
