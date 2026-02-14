'use client';

import React from 'react';

import { useRequiredBlockSettings } from './BlockContext';
import { useSectionData } from '../sections/SectionDataContext';

export function RichTextBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const { colorSchemes } = useSectionData();
  
  // RichText currently stores no editable text content, just renders as a placeholder area
  const colorScheme = (settings['colorScheme'] as string) || 'scheme-1';
  
  // Logic demonstrating access to context from section
  const hasSchemes = colorSchemes && Object.keys(colorSchemes).length > 0;

  return (
    <div
      className='rounded-lg p-4 text-gray-400'
      data-color-scheme={colorScheme}
      data-has-schemes={hasSchemes}
    >
      <p className='text-sm italic'>Rich text content area</p>
    </div>
  );
}
