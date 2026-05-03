import React from 'react';

import { useRequiredBlockSettings } from './BlockContext';
import { useSectionData } from '../sections/SectionDataContext';

export function RichTextBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const { colorSchemes } = useSectionData();

  // RichText currently stores no editable text content, just renders as a placeholder area
  const colorScheme =
    typeof settings['colorScheme'] === 'string' && settings['colorScheme'] !== ''
      ? settings['colorScheme']
      : 'scheme-1';

  // Logic demonstrating access to context from section
  const hasSchemes = colorSchemes && Object.keys(colorSchemes).length > 0;

  return (
    <div
      className='cms-appearance-subtle-surface cms-appearance-muted-text rounded-lg border p-4'
      data-color-scheme={colorScheme}
      data-has-schemes={hasSchemes}
    >
      <p className='text-sm italic'>Rich text content area</p>
    </div>
  );
}
