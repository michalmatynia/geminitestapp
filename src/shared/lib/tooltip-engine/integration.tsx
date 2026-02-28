'use client';

import React from 'react';

import type { DocumentationModuleIdDto as DocumentationModuleId } from '@/shared/contracts/documentation';

import { useDocsTooltipsSetting } from './docs-tooltip-settings';
import { DocumentationTooltip } from './DocumentationTooltip';
import { DocumentationTooltipEnhancer } from './DocumentationTooltipEnhancer';
import { getDocumentationTooltip } from './tooltip-content';

type CreateDocsTooltipIntegrationConfig = {
  moduleId: DocumentationModuleId;
  storageKey: string;
  defaultEnabled?: boolean;
};

export function createDocsTooltipIntegration({
  moduleId,
  storageKey,
  defaultEnabled = false,
}: CreateDocsTooltipIntegrationConfig): {
  moduleId: DocumentationModuleId;
  storageKey: string;
  getTooltip: (docId: string) => string | null;
  useTooltips: () => { enabled: boolean; setEnabled: (enabled: boolean) => void };
  DocTooltip: (props: {
    docId: string;
    children: React.ReactNode;
    enabled: boolean;
    maxWidth?: string;
    side?: 'top' | 'bottom' | 'left' | 'right';
    wrapperClassName?: string;
  }) => React.JSX.Element;
  DocsTooltipEnhancer: (props: {
    enabled: boolean;
    rootId: string;
    fallbackDocId?: string;
  }) => React.JSX.Element;
} {
  function useTooltips() {
    return useDocsTooltipsSetting(storageKey, defaultEnabled);
  }

  function DocTooltip({
    docId,
    children,
    enabled,
    maxWidth,
    side,
    wrapperClassName,
  }: {
    docId: string;
    children: React.ReactNode;
    enabled: boolean;
    maxWidth?: string;
    side?: 'top' | 'bottom' | 'left' | 'right';
    wrapperClassName?: string;
  }): React.JSX.Element {
    const optionalProps = {
      ...(maxWidth ? { maxWidth } : {}),
      ...(side ? { side } : {}),
      ...(wrapperClassName ? { wrapperClassName } : {}),
    };

    return (
      <DocumentationTooltip moduleId={moduleId} docId={docId} enabled={enabled} {...optionalProps}>
        {children}
      </DocumentationTooltip>
    );
  }

  function DocsTooltipEnhancer({
    enabled,
    rootId,
    fallbackDocId,
  }: {
    enabled: boolean;
    rootId: string;
    fallbackDocId?: string;
  }): React.JSX.Element {
    const optionalProps = fallbackDocId ? { fallbackDocId } : {};

    return (
      <DocumentationTooltipEnhancer
        enabled={enabled}
        moduleId={moduleId}
        rootId={rootId}
        {...optionalProps}
      />
    );
  }

  return {
    moduleId,
    storageKey,
    getTooltip: (docId: string) => getDocumentationTooltip(moduleId, docId),
    useTooltips,
    DocTooltip,
    DocsTooltipEnhancer,
  };
}
