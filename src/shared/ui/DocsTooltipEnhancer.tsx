'use client';

import React from 'react';

import type { DocumentationModuleId } from '@/shared/contracts/documentation';
import { DocumentationTooltipEnhancer } from '@/shared/lib/documentation';

type DocsTooltipEnhancerProps = {
  enabled: boolean;
  moduleId: DocumentationModuleId;
  rootId: string;
  fallbackDocId?: string;
};

export function DocsTooltipEnhancer({
  enabled,
  moduleId,
  rootId,
  fallbackDocId,
}: DocsTooltipEnhancerProps): React.JSX.Element {
  return (
    <DocumentationTooltipEnhancer
      enabled={enabled}
      moduleId={moduleId}
      rootId={rootId}
      {...(fallbackDocId ? { fallbackDocId } : {})}
    />
  );
}
