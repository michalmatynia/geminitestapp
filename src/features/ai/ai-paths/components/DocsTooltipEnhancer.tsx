'use client';

import React from 'react';

import { DOCUMENTATION_MODULE_IDS } from '@/shared/lib/documentation';
import { DocumentationTooltipEnhancer } from '@/features/tooltip-engine';

export function DocsTooltipEnhancer({
  rootId,
  enabled,
}: {
  rootId: string;
  enabled: boolean;
}): React.JSX.Element {
  return (
    <DocumentationTooltipEnhancer
      rootId={rootId}
      enabled={enabled}
      moduleId={DOCUMENTATION_MODULE_IDS.aiPaths}
      fallbackDocId='workflow_overview'
    />
  );
}
