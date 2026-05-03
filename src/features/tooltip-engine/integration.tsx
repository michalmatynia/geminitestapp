import React from 'react';

import type { DocumentationModuleId } from '@/shared/contracts/documentation';

import { useDocsTooltipsSetting } from './docs-tooltip-settings';
import { DocumentationTooltip } from './DocumentationTooltip';
import { DocumentationTooltipEnhancer } from './DocumentationTooltipEnhancer';
import { getDocumentationTooltip } from '@/shared/lib/documentation/tooltips';

type CreateDocsTooltipIntegrationConfig = {
  moduleId: DocumentationModuleId;
  storageKey: string;
  defaultEnabled?: boolean;
};

interface DocTooltipProps {
  docId: string;
  children: React.ReactNode;
  enabled: boolean;
  maxWidth?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  wrapperClassName?: string;
}

interface DocsTooltipEnhancerProps {
  enabled: boolean;
  rootId: string;
  fallbackDocId?: string;
}

export function createDocsTooltipIntegration({
  moduleId,
  storageKey,
  defaultEnabled = false,
}: CreateDocsTooltipIntegrationConfig): {
  moduleId: DocumentationModuleId;
  storageKey: string;
  getTooltip: (docId: string) => string | null;
  useTooltips: () => { enabled: boolean; setEnabled: (enabled: boolean) => void };
  DocTooltip: (props: DocTooltipProps) => React.JSX.Element;
  DocsTooltipEnhancer: (props: DocsTooltipEnhancerProps) => React.JSX.Element;
} {
  const useTooltips = (): { enabled: boolean; setEnabled: (enabled: boolean) => void } => {
    return useDocsTooltipsSetting(storageKey, defaultEnabled);
  };

  const DocTooltip = ({
    docId,
    children,
    enabled,
    maxWidth,
    side,
    wrapperClassName,
  }: DocTooltipProps): React.JSX.Element => {
    return (
      <DocumentationTooltip
        moduleId={moduleId}
        docId={docId}
        enabled={enabled}
        maxWidth={maxWidth !== undefined && maxWidth !== '' ? maxWidth : undefined}
        side={side}
        wrapperClassName={wrapperClassName !== undefined && wrapperClassName !== '' ? wrapperClassName : undefined}
      >
        {children}
      </DocumentationTooltip>
    );
  };

  const DocsTooltipEnhancer = ({
    enabled,
    rootId,
    fallbackDocId,
  }: DocsTooltipEnhancerProps): React.JSX.Element => {
    return (
      <DocumentationTooltipEnhancer
        enabled={enabled}
        moduleId={moduleId}
        rootId={rootId}
        fallbackDocId={fallbackDocId !== undefined && fallbackDocId !== '' ? fallbackDocId : undefined}
      />
    );
  };

  return {
    moduleId,
    storageKey,
    getTooltip: (docId: string) => getDocumentationTooltip(moduleId, docId),
    useTooltips,
    DocTooltip,
    DocsTooltipEnhancer,
  };
}
