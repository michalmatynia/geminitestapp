'use client';

import React from 'react';
import { HelpCircle } from 'lucide-react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { Button, Tooltip } from '@/shared/ui';

export type PromptExploderDocsTooltipSwitchRuntimeContextValue = {
  docsTooltipsEnabled: boolean;
  onDocsTooltipsChange: (enabled: boolean) => void;
};

const {
  Context: PromptExploderDocsTooltipSwitchRuntimeContext,
  useStrictContext: usePromptExploderDocsTooltipSwitchRuntime,
} = createStrictContext<PromptExploderDocsTooltipSwitchRuntimeContextValue>({
  hookName: 'usePromptExploderDocsTooltipSwitchRuntime',
  providerName: 'a PromptExploderDocsTooltipSwitchRuntimeContext.Provider',
  displayName: 'PromptExploderDocsTooltipSwitchRuntimeContext',
});

export {
  PromptExploderDocsTooltipSwitchRuntimeContext,
  usePromptExploderDocsTooltipSwitchRuntime,
};

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
