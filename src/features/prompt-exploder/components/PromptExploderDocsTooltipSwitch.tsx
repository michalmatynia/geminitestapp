'use client';

import React from 'react';

import { Label, Switch } from '@/shared/ui';

export function PromptExploderDocsTooltipSwitch({
  docsTooltipsEnabled,
  onDocsTooltipsChange,
}: {
  docsTooltipsEnabled: boolean;
  onDocsTooltipsChange: (enabled: boolean) => void;
}): React.JSX.Element {
  return (
    <div
      className='ml-1 flex items-center gap-2 rounded border border-border/60 bg-card/30 px-2 py-1'
      data-doc-id='docs_tooltips_toggle'
    >
      <Label
        htmlFor='prompt-exploder-docs-tooltips'
        className='text-[11px] text-gray-300'
      >
        Docs Tooltips
      </Label>
      <Switch
        id='prompt-exploder-docs-tooltips'
        checked={docsTooltipsEnabled}
        onCheckedChange={(checked: boolean) => {
          onDocsTooltipsChange(checked);
        }}
        data-doc-id='docs_tooltips_toggle'
      />
    </div>
  );
}
