import React from 'react';

import type { DocumentationModuleId } from '@/shared/contracts/documentation';

import { DocumentationTooltipEnhancer } from './DocumentationTooltipEnhancer';

type DocsTooltipEnhancerProps = {
  rootId: string;
  enabled: boolean;
};

type DocsTooltipEnhancerFactoryConfig = {
  moduleId: DocumentationModuleId;
  fallbackDocId?: string;
};

export function createDocsTooltipEnhancer({
  moduleId,
  fallbackDocId,
}: DocsTooltipEnhancerFactoryConfig): (props: DocsTooltipEnhancerProps) => React.JSX.Element {
  return function DocsTooltipEnhancer({ rootId, enabled }: DocsTooltipEnhancerProps): React.JSX.Element {
    return (
      <DocumentationTooltipEnhancer
        enabled={enabled}
        moduleId={moduleId}
        rootId={rootId}
        {...(fallbackDocId ? { fallbackDocId } : {})}
      />
    );
  };
}
