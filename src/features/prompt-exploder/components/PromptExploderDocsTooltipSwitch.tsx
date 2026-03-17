'use client';

import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Button, Tooltip } from '@/shared/ui';

export type PromptExploderDocsTooltipSwitchRuntimeContextValue = {
  docsTooltipsEnabled: boolean;
  onDocsTooltipsChange: (enabled: boolean) => void;
};

export const PromptExploderDocsTooltipSwitchRuntimeContext =
  React.createContext<PromptExploderDocsTooltipSwitchRuntimeContextValue | null>(null);

export function usePromptExploderDocsTooltipSwitchRuntime(): PromptExploderDocsTooltipSwitchRuntimeContextValue {
  const context = React.useContext(PromptExploderDocsTooltipSwitchRuntimeContext);
  if (!context) {
    throw new Error(
      'usePromptExploderDocsTooltipSwitchRuntime must be used within a PromptExploderDocsTooltipSwitchRuntimeContext.Provider'
    );
  }
  return context;
}

export function PromptExploderDocsTooltipSwitchFromRuntime(): React.JSX.Element {
  const { docsTooltipsEnabled, onDocsTooltipsChange } =
    usePromptExploderDocsTooltipSwitchRuntime();

  return (
    <Tooltip content={docsTooltipsEnabled ? 'Disable helper tooltips' : 'Enable helper tooltips'}>
      <Button
        size='xs'
        variant={docsTooltipsEnabled ? 'secondary' : 'outline'}
        onClick={() => onDocsTooltipsChange(!docsTooltipsEnabled)}
        aria-label='Toggle documentation tooltips'
        title='Toggle documentation tooltips'
      >
        <HelpCircle className='size-4' />
      </Button>
    </Tooltip>
  );
}
