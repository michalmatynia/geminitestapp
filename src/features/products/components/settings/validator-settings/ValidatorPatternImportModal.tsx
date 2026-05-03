'use client';

import React from 'react';

import type { ImportValidationPatternsResult } from '@/features/products/api/settings';
import { JSONImportModal } from '@/shared/ui/templates/modals/JSONImportModal';

import { VALIDATOR_SAMPLE_IMPORT_JSON } from './validator-documentation-clipboard';
import { useValidatorPatternImportController } from './ValidatorPatternImportModal.controller';
import { ValidatorPatternImportContent } from './ValidatorPatternImportModal.result';

type ValidatorPatternImportModalProps = {
  open: boolean;
  onClose: () => void;
};

export type ValidatorPatternImportRuntimeValue = {
  open: boolean;
  handleClose: () => void;
  handleApply: () => Promise<void>;
  handlePreview: () => Promise<void>;
  isLoading: boolean;
  rawJson: string;
  parseError: string | null;
  lastResult: ImportValidationPatternsResult | null;
  setRawJson: React.Dispatch<React.SetStateAction<string>>;
  setParseError: React.Dispatch<React.SetStateAction<string | null>>;
  setLastResult: React.Dispatch<React.SetStateAction<ImportValidationPatternsResult | null>>;
};

const ValidatorPatternImportRuntimeContext =
  React.createContext<ValidatorPatternImportRuntimeValue | null>(null);

function useValidatorPatternImportRuntime(): ValidatorPatternImportRuntimeValue {
  const runtime = React.useContext(ValidatorPatternImportRuntimeContext);
  if (!runtime) {
    throw new Error(
      'useValidatorPatternImportRuntime must be used within ValidatorPatternImportRuntimeContext.Provider'
    );
  }
  return runtime;
}

function ValidatorPatternImportModalShell({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const {
    open,
    handleClose,
    handleApply,
    handlePreview,
    isLoading,
    rawJson,
    parseError,
    lastResult,
    setRawJson,
    setParseError,
    setLastResult,
  } = useValidatorPatternImportRuntime();

  return (
    <JSONImportModal
      isOpen={open}
      onClose={handleClose}
      onImport={handleApply}
      onPreview={handlePreview}
      previewText='Preview Import'
      title='Import Validator Patterns JSON'
      subtitle='Paste JSON to create, update, or replace product validator patterns and sequences.'
      confirmText='Apply Import'
      isLoading={isLoading}
      value={rawJson}
      onChange={(val) => {
        setRawJson(val);
        if (parseError !== null) setParseError(null);
        if (lastResult !== null) setLastResult(null);
      }}
      onLoadSample={(): void => {
        setRawJson(VALIDATOR_SAMPLE_IMPORT_JSON);
        setParseError(null);
        setLastResult(null);
      }}
      actions={
        <div className='hidden'>
          {/* Load Sample is already in JSONImportModal footer if onLoadSample is provided */}
        </div>
      }
    >
      {children}
    </JSONImportModal>
  );
}

export function ValidatorPatternImportModal({
  open,
  onClose,
}: ValidatorPatternImportModalProps): React.JSX.Element {
  const runtimeValue = useValidatorPatternImportController({ open, onClose });

  return (
    <ValidatorPatternImportRuntimeContext.Provider value={runtimeValue}>
      <ValidatorPatternImportModalShell>
        <ValidatorPatternImportContent runtime={runtimeValue} />
      </ValidatorPatternImportModalShell>
    </ValidatorPatternImportRuntimeContext.Provider>
  );
}
