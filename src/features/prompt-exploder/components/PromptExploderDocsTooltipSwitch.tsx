'use client';

import React from 'react';

import { ToggleRow } from '@/shared/ui';

export function PromptExploderDocsTooltipSwitch({
  docsTooltipsEnabled,
  onDocsTooltipsChange,
}: {
  docsTooltipsEnabled: boolean;
  onDocsTooltipsChange: (enabled: boolean) => void;
}): React.JSX.Element {
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
