'use client';

import React from 'react';

import { DOCUMENTATION_MODULE_IDS, DocumentationTooltipEnhancer } from '@/shared/lib/documentation';

export function DocsTooltipEnhancer(props: {
  rootId: string;
  enabled: boolean;
}): React.JSX.Element {
  const { rootId, enabled } = props;

  return (
    <DocumentationTooltipEnhancer
      rootId={rootId}
      enabled={enabled}
      moduleId={DOCUMENTATION_MODULE_IDS.aiPaths}
      fallbackDocId='workflow_overview'
    />
  );
}
