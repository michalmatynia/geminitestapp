'use client';

import React from 'react';

import type {
  ImportValidationPatternsPayload,
  ImportValidationPatternsResult,
} from '@/features/products/api/settings';
import { useImportValidationPatternsMutation } from '@/features/products/hooks/useProductSettingsQueries';
import { JSONImportModal } from '@/shared/ui/templates/modals/JSONImportModal';
import { useToast } from '@/shared/ui/toast';

import {
  logClientCatch,
  logClientError,
} from '@/shared/utils/observability/client-error-logger';

import { VALIDATOR_SAMPLE_IMPORT_JSON } from './validator-documentation-clipboard';

type ValidatorPatternImportModalProps = {
  open: boolean;
  onClose: () => void;
};

type ParsedPayloadResult =
  | {
      ok: true;
      payload: ImportValidationPatternsPayload;
    }
  | {
      ok: false;
      error: string;
    };

type ValidatorPatternImportRuntimeValue = {
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

const parsePayload = (value: string): ParsedPayloadResult => {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        ok: false,
        error: 'Import payload must be a JSON object.',
      };
    }
    return {
      ok: true,
      payload: parsed as ImportValidationPatternsPayload,
    };
  } catch (error) {
    logClientError(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid JSON payload.',
    };
  }
};

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
        if (parseError) setParseError(null);
        if (lastResult) setLastResult(null);
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
  const { toast } = useToast();
  const importMutation = useImportValidationPatternsMutation();

  const [rawJson, setRawJson] = React.useState<string>(VALIDATOR_SAMPLE_IMPORT_JSON);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [lastResult, setLastResult] = React.useState<ImportValidationPatternsResult | null>(null);

  const handleClose = (): void => {
    if (importMutation.isPending) return;
    onClose();
  };

  const handlePreview = async (): Promise<void> => {
    const parsed = parsePayload(rawJson);
    if (!parsed.ok) {
      setParseError(parsed.error);
      setLastResult(null);
      return;
    }

    setParseError(null);

    try {
      const result = await importMutation.mutateAsync({
        ...parsed.payload,
        dryRun: true,
      });
      setLastResult(result);
      if (result.errors.length > 0 || !result.ok) {
        toast(`Import preview found ${result.errors.length} issue(s).`, {
          variant: 'warning',
        });
        return;
      }
      toast('Import preview is valid. You can apply now.', {
        variant: 'success',
      });
    } catch (error) {
      logClientCatch(error, {
        source: 'ValidatorPatternImportModal',
        action: 'previewImport',
      });
      toast(error instanceof Error ? error.message : 'Import preview failed.', {
        variant: 'error',
      });
    }
  };

  const handleApply = async (): Promise<void> => {
    const parsed = parsePayload(rawJson);
    if (!parsed.ok) {
      setParseError(parsed.error);
      setLastResult(null);
      return;
    }

    setParseError(null);

    try {
      const result = await importMutation.mutateAsync({
        ...parsed.payload,
        dryRun: false,
      });
      setLastResult(result);

      if (result.errors.length > 0 || !result.ok) {
        toast(`Import was blocked by ${result.errors.length} issue(s).`, {
          variant: 'warning',
        });
        return;
      }

      toast(
        `Import applied. Created: ${result.summary.createCount}, Updated: ${result.summary.updateCount}, Deleted: ${result.summary.deleteCount}.`,
        { variant: 'success' }
      );
    } catch (error) {
      logClientCatch(error, {
        source: 'ValidatorPatternImportModal',
        action: 'applyImport',
      });
      toast(error instanceof Error ? error.message : 'Failed to apply import.', {
        variant: 'error',
      });
    }
  };

  const runtimeValue = React.useMemo<ValidatorPatternImportRuntimeValue>(
    () => ({
      open,
      handleClose,
      handleApply,
      handlePreview,
      isLoading: importMutation.isPending,
      rawJson,
      parseError,
      lastResult,
      setRawJson,
      setParseError,
      setLastResult,
    }),
    [
      open,
      handleClose,
      handleApply,
      handlePreview,
      importMutation.isPending,
      rawJson,
      parseError,
      lastResult,
      setRawJson,
      setParseError,
      setLastResult,
    ]
  );

  return (
    <ValidatorPatternImportRuntimeContext.Provider value={runtimeValue}>
      <ValidatorPatternImportModalShell>
        {parseError ? (
          <div className='rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200'>
            JSON parse error: {parseError}
          </div>
        ) : null}

        {lastResult ? (
          <div className='space-y-3 rounded-md border border-border/60 bg-background/20 p-3'>
            <div className='flex flex-wrap items-center gap-2 text-xs'>
              <span className='rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-cyan-200'>
                Scope: {lastResult.scope}
              </span>
              <span className='rounded border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-violet-200'>
                Mode: {lastResult.mode}
              </span>
              <span className='rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-200'>
                Create: {lastResult.summary.createCount}
              </span>
              <span className='rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-200'>
                Update: {lastResult.summary.updateCount}
              </span>
              <span className='rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-red-200'>
                Delete: {lastResult.summary.deleteCount}
              </span>
              <span className='rounded border border-slate-500/40 bg-slate-500/10 px-2 py-1 text-slate-200'>
                Skip: {lastResult.summary.skipCount}
              </span>
            </div>

            {lastResult.errors.length > 0 ? (
              <div className='space-y-2'>
                <p className='text-xs font-semibold text-red-200'>
                  Import issues ({lastResult.errors.length})
                </p>
                <div className='max-h-36 space-y-1 overflow-y-auto rounded border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-100'>
                  {lastResult.errors.map((error, index) => (
                    <p key={`${error.code ?? 'error'}-${index}`}>
                      {error.code ? `[${error.code}] ` : ''}
                      {error.message}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <p className='text-xs text-emerald-200'>No import issues detected.</p>
            )}

            <div className='space-y-2'>
              <p className='text-xs font-semibold text-slate-200'>
                Planned operations ({lastResult.operations.length})
              </p>
              <div className='max-h-52 space-y-1 overflow-y-auto rounded border border-border/60 bg-black/20 p-2 text-xs text-slate-200'>
                {lastResult.operations.map((operation, index) => (
                  <p key={`${operation.patternId ?? operation.code ?? operation.label}-${index}`}>
                    <span className='font-semibold uppercase'>{operation.action}</span> |{' '}
                    {operation.code ?? operation.patternId ?? 'n/a'} | {operation.label}
                    {operation.reason ? ` | ${operation.reason}` : ''}
                    {operation.semanticAudit?.summary
                      ? ` | Semantic: ${operation.semanticAudit.summary}`
                      : ''}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </ValidatorPatternImportModalShell>
    </ValidatorPatternImportRuntimeContext.Provider>
  );
}
