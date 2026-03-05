'use client';

import React from 'react';
import { Textarea } from '@/shared/ui';
import { CssAiSection } from './CssAiSection';
import {
  useComponentSettingsActions,
  useComponentSettingsState,
} from '../context/ComponentSettingsContext';

export function CustomCssTab(): React.JSX.Element {
  const { customCssValue } = useComponentSettingsState();
  const { handleCustomCssChange } = useComponentSettingsActions();

  return (
    <div className='flex-1 overflow-y-auto p-4 mt-0 space-y-3'>
      <CssAiSection />
      <Textarea
        value={customCssValue}
        onChange={(e) => handleCustomCssChange(e.target.value)}
        placeholder={'parent {\n  outline: 1px dashed #4ade80;\n}\n\nchildren {\n  gap: 12px;\n}'}
        className='min-h-[160px] font-mono text-xs'
        spellCheck={false}
      />
    </div>
  );
}
