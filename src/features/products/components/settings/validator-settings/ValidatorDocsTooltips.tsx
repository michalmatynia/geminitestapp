'use client';

import React from 'react';

import {
  DOCUMENTATION_MODULE_IDS,
  getDocumentationEntry,
} from '@/shared/lib/documentation';
import {
  DocumentationTooltip,
  useDocsTooltipsSetting,
} from '@/shared/lib/tooltip-engine';

import type { ValidatorUiDoc } from './validator-docs-catalog';

type ValidatorDocsTooltipContextValue = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  getDoc: (id: string) => ValidatorUiDoc | null;
};

const STORAGE_KEY = 'validator_docs_tooltips_enabled';
const MODULE_ID = DOCUMENTATION_MODULE_IDS.validator;

const ValidatorDocsTooltipContext = React.createContext<ValidatorDocsTooltipContextValue | null>(
  null
);

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
    <ValidatorDocsTooltipContext.Provider
      value={{ enabled, setEnabled, getDoc }}
    >
      {children}
    </ValidatorDocsTooltipContext.Provider>
  );
}

export function useValidatorDocsTooltips(): ValidatorDocsTooltipContextValue {
  const context = React.useContext(ValidatorDocsTooltipContext);
  if (!context) {
    throw new Error('useValidatorDocsTooltips must be used inside ValidatorDocsTooltipsProvider');
  }
  return context;
}

export function ValidatorDocTooltip({
  docId,
  children,
}: {
  docId: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const { enabled } = useValidatorDocsTooltips();

  return (
    <DocumentationTooltip
      moduleId={MODULE_ID}
      docId={docId}
      enabled={enabled}
      side='top'
      maxWidth='360px'
    >
      {children}
    </DocumentationTooltip>
  );
}
