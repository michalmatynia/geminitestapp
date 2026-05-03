import React from 'react';

import type {
  ImportValidationPatternsPayload,
  ImportValidationPatternsResult,
} from '@/features/products/api/settings';
import { useImportValidationPatternsMutation } from '@/features/products/hooks/useProductSettingsQueries';
import { useToast } from '@/shared/ui/toast';
import {
  logClientCatch,
  logClientError,
} from '@/shared/utils/observability/client-error-logger';

import { VALIDATOR_SAMPLE_IMPORT_JSON } from './validator-documentation-clipboard';
import type { ValidatorPatternImportRuntimeValue } from './ValidatorPatternImportModal';

type ParsedPayloadResult =
  | { ok: true; payload: ImportValidationPatternsPayload }
  | { ok: false; error: string };

const parsePayload = (value: string): ParsedPayloadResult => {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Import payload must be a JSON object.' };
    }
    return { ok: true, payload: parsed as ImportValidationPatternsPayload };
  } catch (error) {
    logClientError(error);
    return { ok: false, error: error instanceof Error ? error.message : 'Invalid JSON payload.' };
  }
};

const buildImportToastMessage = (result: ImportValidationPatternsResult): string =>
  `Import applied. Created: ${result.summary.createCount}, Updated: ${result.summary.updateCount}, Deleted: ${result.summary.deleteCount}.`;

const buildImportWarningMessage = (
  result: ImportValidationPatternsResult,
  dryRun: boolean
): string => {
  const mode = dryRun ? 'Import preview found' : 'Import was blocked by';
  return `${mode} ${result.errors.length} issue(s).`;
};

const buildImportErrorMessage = (error: unknown, dryRun: boolean): string => {
  if (error instanceof Error) return error.message;
  return dryRun ? 'Import preview failed.' : 'Failed to apply import.';
};

const showImportResultToast = ({
  dryRun,
  result,
  toast,
}: {
  dryRun: boolean;
  result: ImportValidationPatternsResult;
  toast: ReturnType<typeof useToast>['toast'];
}): boolean => {
  if (result.errors.length > 0 || !result.ok) {
    toast(buildImportWarningMessage(result, dryRun), { variant: 'warning' });
    return false;
  }
  toast(dryRun ? 'Import preview is valid. You can apply now.' : buildImportToastMessage(result), { variant: 'success' });
  return true;
};

const useImportActionHandler = ({
  action,
  dryRun,
  importMutation,
  rawJson,
  setLastResult,
  setParseError,
  toast,
}: {
  action: 'applyImport' | 'previewImport';
  dryRun: boolean;
  importMutation: ReturnType<typeof useImportValidationPatternsMutation>;
  rawJson: string;
  setLastResult: React.Dispatch<React.SetStateAction<ImportValidationPatternsResult | null>>;
  setParseError: React.Dispatch<React.SetStateAction<string | null>>;
  toast: ReturnType<typeof useToast>['toast'];
}): (() => Promise<void>) =>
  React.useCallback(async (): Promise<void> => {
    const parsed = parsePayload(rawJson);
    if (!parsed.ok) {
      setParseError(parsed.error);
      setLastResult(null);
      return;
    }
    setParseError(null);
    try {
      const result = await importMutation.mutateAsync({ ...parsed.payload, dryRun });
      setLastResult(result);
      showImportResultToast({ dryRun, result, toast });
    } catch (error) {
      logClientCatch(error, { source: 'ValidatorPatternImportModal', action });
      toast(buildImportErrorMessage(error, dryRun), { variant: 'error' });
    }
  }, [action, dryRun, importMutation, rawJson, setLastResult, setParseError, toast]);

export function useValidatorPatternImportController({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): ValidatorPatternImportRuntimeValue {
  const { toast } = useToast();
  const importMutation = useImportValidationPatternsMutation();
  const [rawJson, setRawJson] = React.useState<string>(VALIDATOR_SAMPLE_IMPORT_JSON);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [lastResult, setLastResult] = React.useState<ImportValidationPatternsResult | null>(null);
  const handleClose = React.useCallback((): void => {
    if (importMutation.isPending) return;
    onClose();
  }, [importMutation.isPending, onClose]);
  const handlePreview = useImportActionHandler({ action: 'previewImport', dryRun: true, importMutation, rawJson, setLastResult, setParseError, toast });
  const handleApply = useImportActionHandler({ action: 'applyImport', dryRun: false, importMutation, rawJson, setLastResult, setParseError, toast });

  return React.useMemo<ValidatorPatternImportRuntimeValue>(
    () => ({ open, handleClose, handleApply, handlePreview, isLoading: importMutation.isPending, rawJson, parseError, lastResult, setRawJson, setParseError, setLastResult }),
    [open, handleClose, handleApply, handlePreview, importMutation.isPending, rawJson, parseError, lastResult]
  );
}
