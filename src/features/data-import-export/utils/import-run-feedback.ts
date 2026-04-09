import type { BaseImportPreflightIssue } from '@/shared/contracts/integrations/base-com';
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

export const getImportResultDisplaySummary = (
  result: ImportResponse
): ImportResultDisplaySummary => {
  const dispatchModeLabel =
    result.dispatchMode === 'queued'
      ? 'queued (base-import runtime queue)'
      : result.dispatchMode === 'inline'
        ? 'inline fallback'
        : 'not dispatched';

  const queueJobLabel = result.queueJobId || 'not assigned';

  if (result.preflight && !result.preflight.ok) {
    return {
      dispatchModeLabel,
      queueJobLabel,
      explanation: 'Dispatch stopped at preflight before this run reached runtime queueing.',
    };
  }

  if (result.dispatchMode === 'inline') {
    return {
      dispatchModeLabel,
      queueJobLabel,
      explanation:
        'This run used inline fallback because Redis queueing was unavailable or enqueueing failed.',
    };
  }

  if (result.dispatchMode === 'queued') {
    return {
      dispatchModeLabel,
      queueJobLabel,
      explanation: 'This run was submitted to the separate base-import runtime queue.',
    };
  }

  if (
    (result.status === 'completed' || result.status === 'partial_success') &&
    result.summaryMessage?.includes('No products matched')
  ) {
    return {
      dispatchModeLabel,
      queueJobLabel,
      explanation: 'Nothing was queued because item resolution returned zero import candidates.',
    };
  }

  return {
    dispatchModeLabel,
    queueJobLabel,
    explanation: null,
  };
};

export const buildImportResultToast = (
  result: ImportResponse,
  options: { kind: ImportActionKind; dryRun?: boolean }
): { message: string; toast: ToastOptions } => {
  const label =
    options.kind === 'resume'
      ? 'Import resume'
      : options.dryRun
        ? 'Dry-run import'
        : 'Import';

  if (result.status === 'queued' || result.status === 'running') {
    if (result.dispatchMode === 'inline') {
      return {
        message: `${label} running inline${result.queueJobId ? ` (job ${result.queueJobId}).` : '.'}`,
        toast: { variant: 'warning' },
      };
    }

    return {
      message: `${label} queued to base-import runtime${result.queueJobId ? ` (job ${result.queueJobId}).` : '.'}`,
      toast: { variant: 'success' },
    };
  }

  if (result.status === 'completed' || result.status === 'partial_success') {
    return {
      message: result.summaryMessage || `${label} completed.`,
      toast: { variant: 'success' },
    };
  }

  if (result.status === 'failed') {
    const preflightErrors = getPreflightErrorMessages(result);
    if (preflightErrors.length > 0) {
      return {
        message: `Import blocked before dispatch: ${preflightErrors[0]}`,
        toast: { variant: 'error' },
      };
    }

    return {
      message: result.summaryMessage || `${label} failed.`,
      toast: { variant: 'error' },
    };
  }

  return {
    message: result.summaryMessage || `${label} updated.`,
    toast: { variant: 'info' },
  };
};
