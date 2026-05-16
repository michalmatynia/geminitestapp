import type {
  BaseImportPreflightIssue,
  BaseImportRunRecord,
} from '@/shared/contracts/integrations/base-com';
import type { ImportResponse } from '@/shared/contracts/integrations/import-export';
import type { ToastOptions } from '@/shared/contracts/ui/base';

type ImportActionKind = 'import' | 'resume';

export type ImportResultDisplaySummary = {
  dispatchModeLabel: string;
  queueJobLabel: string;
  explanation: string | null;
};

const getPreflightErrorMessages = (result: ImportResponse): string[] =>
  (result.preflight?.issues ?? [])
    .filter((issue: BaseImportPreflightIssue) => issue.severity === 'error')
    .map((issue: BaseImportPreflightIssue) => issue.message);

export const buildImportResponseFromRun = (run: BaseImportRunRecord): ImportResponse => ({
  runId: run.id,
  status: run.status,
  preflight: run.preflight ?? null,
  queueJobId: run.queueJobId ?? null,
  dispatchMode: run.dispatchMode ?? null,
  summaryMessage: run.summaryMessage ?? null,
});

export const resolveLiveImportResult = (
  lastResult: ImportResponse,
  activeRun: BaseImportRunRecord | null | undefined
): ImportResponse => {
  if (activeRun?.id !== lastResult.runId) {
    return lastResult;
  }

  return {
    ...lastResult,
    ...buildImportResponseFromRun(activeRun),
  };
};

const isPreflightEquivalent = (
  left: ImportResponse['preflight'],
  right: ImportResponse['preflight']
): boolean => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

const isBaseEquivalent = (
  left: ImportResponse,
  right: ImportResponse
): boolean =>
  left.runId === right.runId &&
  left.status === right.status &&
  left.queueJobId === right.queueJobId &&
  left.dispatchMode === right.dispatchMode &&
  left.summaryMessage === right.summaryMessage;

export const areImportResponsesEquivalent = (
  left: ImportResponse | null,
  right: ImportResponse | null
): boolean => {
  if (left === right) return true;
  if (left === null || right === null) return false;

  return isBaseEquivalent(left, right) && isPreflightEquivalent(left.preflight, right.preflight);
};



const getDispatchModeLabel = (dispatchMode: string | null): string => {
  if (dispatchMode === 'queued') return 'queued (base-import runtime queue)';
  if (dispatchMode === 'inline') return 'inline fallback';
  return 'not dispatched';
};

const getPreflightErrorExplanation = (result: ImportResponse): string | null => {
  if (result.preflight?.ok === false) {
    return 'Dispatch stopped at preflight before this run reached runtime queueing.';
  }
  return null;
};

const getDispatchExplanation = (result: ImportResponse, isExactTargetSummary: boolean): string | null => {
  if (result.dispatchMode === 'inline') {
    return 'This run used inline fallback because Redis queueing was unavailable or enqueueing failed.';
  }
  if (result.dispatchMode === 'queued') {
    return isExactTargetSummary
      ? 'This exact-target run was submitted to the separate base-import runtime queue and will create a new product with a Base.com connection.'
      : 'This run was submitted to the separate base-import runtime queue.';
  }
  return null;
};

const getMatchedEmptyExplanation = (result: ImportResponse): string | null => {
  const isMatchedEmpty = (result.status === 'completed' || result.status === 'partial_success') &&
    (result.summaryMessage?.includes('No products matched') ?? false);
  return isMatchedEmpty
    ? 'Nothing was queued because item resolution returned zero import candidates.'
    : null;
};

export const getImportResultDisplaySummary = (
  result: ImportResponse
): ImportResultDisplaySummary => {
  const isExactTargetSummary = (result.summaryMessage?.startsWith('Queued exact ') ?? false);
  const dispatchModeLabel = getDispatchModeLabel(result.dispatchMode);
  const queueJobLabel = result.queueJobId ?? 'not assigned';

  const explanations = [
    getPreflightErrorExplanation(result),
    getDispatchExplanation(result, isExactTargetSummary),
    getMatchedEmptyExplanation(result),
  ];

  return {
    dispatchModeLabel,
    queueJobLabel,
    explanation: explanations.find((e) => e !== null) ?? null,
  };
};

const getImportLabel = (kind: ImportActionKind, dryRun: boolean, isExact: boolean): string => {
  if (kind === 'resume') return 'Import resume';
  if (isExact) return 'Exact import';
  if (dryRun) return 'Dry-run import';
  return 'Import';
};

const getQueuedRunMessage = (label: string, result: ImportResponse, suffix: string): string =>
  result.dispatchMode === 'inline' 
    ? `${label} running inline${suffix}` 
    : `${label} queued to base-import runtime${suffix}`;

const getFailedRunMessage = (result: ImportResponse, preflightErrors: string[]): string => {
  if (preflightErrors.length > 0) {
    return `Import blocked before dispatch: ${preflightErrors[0]}`;
  }
  return result.summaryMessage ?? 'Import failed.';
};

const getRunningRunToast = (label: string, result: ImportResponse): { message: string; toast: ToastOptions } => {
  const suffix = result.queueJobId !== null ? ` (job ${result.queueJobId}).` : '.';
  const msg = getQueuedRunMessage(label, result, suffix);
  return {
    message: msg,
    toast: { variant: result.dispatchMode === 'inline' ? 'warning' : 'success' },
  };
};

const getCompletedRunToast = (label: string, result: ImportResponse): { message: string; toast: ToastOptions } => ({
  message: result.summaryMessage ?? `${label} completed.`,
  toast: { variant: 'success' },
});

const getFailedRunToast = (result: ImportResponse): { message: string; toast: ToastOptions } => ({
  message: getFailedRunMessage(result, getPreflightErrorMessages(result)),
  toast: { variant: 'error' },
});

const getFallbackRunToast = (label: string, result: ImportResponse): { message: string; toast: ToastOptions } => ({
  message: result.summaryMessage ?? `${label} updated.`,
  toast: { variant: 'info' },
});

const getImportMetadata = (result: ImportResponse, options: { kind: ImportActionKind; dryRun?: boolean }): { label: string } => {
  const isExactTarget = (result.summaryMessage?.startsWith('Queued exact ') ?? false);
  const label = getImportLabel(options.kind, options.dryRun ?? false, isExactTarget);
  return { label };
};


export const buildImportResultToast = (
  result: ImportResponse,
  options: { kind: ImportActionKind; dryRun?: boolean }
): { message: string; toast: ToastOptions } => {
  const { label } = getImportMetadata(result, options);

  if (result.status === 'queued' || result.status === 'running') {
    return getRunningRunToast(label, result);
  }

  if (result.status === 'completed' || result.status === 'partial_success') {
    return getCompletedRunToast(label, result);
  }

  if (result.status === 'failed') {
    return getFailedRunToast(result);
  }

  return getFallbackRunToast(label, result);
};




