'use client';

import React from 'react';

import { getDocumentationEntry } from '@/shared/lib/documentation/registry';
import { useDocsTooltipsSetting } from '@/shared/lib/documentation/docs-tooltip-settings';
import { DOCUMENTATION_MODULE_IDS, DocumentationTooltip } from '@/shared/lib/documentation';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { ValidatorUiDoc } from './validator-docs-catalog';

type ValidatorDocsTooltipContextValue = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  getDoc: (id: string) => ValidatorUiDoc | null;
};

const STORAGE_KEY = 'validator_docs_tooltips_enabled';
const MODULE_ID = DOCUMENTATION_MODULE_IDS.validator;

const { Context: ValidatorDocsTooltipContext, useStrictContext: useValidatorDocsTooltips } =
  createStrictContext<ValidatorDocsTooltipContextValue>({
    hookName: 'useValidatorDocsTooltips',
    providerName: 'ValidatorDocsTooltipsProvider',
    displayName: 'ValidatorDocsTooltipContext',
  });

export { useValidatorDocsTooltips };

export function ValidatorDocsTooltipsProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { enabled, setEnabled } = useDocsTooltipsSetting(STORAGE_KEY, false);

  const getDoc = React.useCallback((id: string): ValidatorUiDoc | null => {
    const entry = getDocumentationEntry(MODULE_ID, id);
    if (!entry) return null;

    return {
      id: entry.id,
      title: entry.title,
      description: entry.content,
      relatedFunctions: entry.keywords,
    };
  }, []);

  return (
    <ValidatorDocsTooltipContext.Provider value={{ enabled, setEnabled, getDoc }}>
      {children}
    </ValidatorDocsTooltipContext.Provider>
  );
}

export function ValidatorDocTooltip({
  docId,
  children,
}: {
  docId: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const { enabled } = useValidatorDocsTooltips();
  const tooltipDocId = React.useMemo(() => docId, [docId]);

  return (
    <DocumentationTooltip
      moduleId={MODULE_ID}
      docId={tooltipDocId}
      enabled={enabled}
      side='top'
      maxWidth='360px'
    >
      {children}
    </DocumentationTooltip>
  );
}
