'use client';

import React from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { ToggleRow } from '@/shared/ui';

export type PromptExploderDocsTooltipSwitchRuntimeValue = {
  docsTooltipsEnabled: boolean;
  onDocsTooltipsChange: (enabled: boolean) => void;
};

const {
  Context: PromptExploderDocsTooltipSwitchRuntimeContext,
  useStrictContext: usePromptExploderDocsTooltipSwitchRuntime,
} = createStrictContext<PromptExploderDocsTooltipSwitchRuntimeValue>({
  hookName: 'usePromptExploderDocsTooltipSwitchRuntime',
  providerName: 'PromptExploderDocsTooltipSwitchRuntimeProvider',
  displayName: 'PromptExploderDocsTooltipSwitchRuntimeContext',
});

export { PromptExploderDocsTooltipSwitchRuntimeContext };

export function PromptExploderDocsTooltipSwitch(props: {
  docsTooltipsEnabled: boolean;
  onDocsTooltipsChange: (enabled: boolean) => void;
}): React.JSX.Element {
  const { docsTooltipsEnabled, onDocsTooltipsChange } = props;

  return (
    <ToggleRow
      id='prompt-exploder-docs-tooltips-toggle'
      label='Docs Tooltips'
      checked={docsTooltipsEnabled}
      onCheckedChange={(checked: boolean) => {
        onDocsTooltipsChange(checked);
      }}
      className='ml-1 border-border/60 bg-card/30 px-2 py-1'
      data-doc-id='docs_tooltips_toggle'
    />
  );
}

export function PromptExploderDocsTooltipSwitchFromRuntime(): React.JSX.Element {
  const { docsTooltipsEnabled, onDocsTooltipsChange } = usePromptExploderDocsTooltipSwitchRuntime();
  return (
    <PromptExploderDocsTooltipSwitch
      docsTooltipsEnabled={docsTooltipsEnabled}
      onDocsTooltipsChange={onDocsTooltipsChange}
    />
  );
}
