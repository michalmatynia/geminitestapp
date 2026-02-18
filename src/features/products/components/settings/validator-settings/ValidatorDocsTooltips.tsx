'use client';

import React from 'react';

import { Tooltip } from '@/shared/ui';

import {
  VALIDATOR_UI_DOC_BY_ID,
  type ValidatorUiDoc,
} from './validator-docs-catalog';

type ValidatorDocsTooltipContextValue = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  getDoc: (id: string) => ValidatorUiDoc | null;
};

const STORAGE_KEY = 'validator_docs_tooltips_enabled';

const ValidatorDocsTooltipContext = React.createContext<ValidatorDocsTooltipContextValue | null>(
  null
);

export function ValidatorDocsTooltipsProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    setEnabled(raw === '1');
  }, []);

  const updateEnabled = React.useCallback((value: boolean): void => {
    setEnabled(value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    }
  }, []);

  const getDoc = React.useCallback((id: string): ValidatorUiDoc | null => {
    return VALIDATOR_UI_DOC_BY_ID.get(id) ?? null;
  }, []);

  return (
    <ValidatorDocsTooltipContext.Provider
      value={{ enabled, setEnabled: updateEnabled, getDoc }}
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
  const { enabled, getDoc } = useValidatorDocsTooltips();
  const doc = getDoc(docId);

  if (!enabled || !doc) {
    return <>{children}</>;
  }

  const content = [doc.title, doc.description].join('\n');

  return (
    <Tooltip content={content} side='top' maxWidth='360px'>
      <span className='inline-flex'>{children}</span>
    </Tooltip>
  );
}
