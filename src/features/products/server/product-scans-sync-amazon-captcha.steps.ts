import 'server-only';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import type { AmazonScanRuntimeResult } from './product-scans-service.helpers';

type CaptchaRetryRunStatus = 'queued' | 'running';
type CaptchaRetryStep = ProductScanRecord['steps'][number];
type CaptchaRetryDetail = { label: string; value: string };

const filterCaptchaRetryDetails = (
  details: Array<{ label: string; value: string | null | undefined }>
): CaptchaRetryDetail[] =>
  details.filter(
    (detail): detail is CaptchaRetryDetail =>
      typeof detail.value === 'string' && detail.value.trim().length > 0
  );

const buildCaptchaRetryStepBase = (input: {
  scan: ProductScanRecord;
  stepKey: string;
  previousRunId: string;
  parsedResult: AmazonScanRuntimeResult;
}): Pick<
  CaptchaRetryStep,
  | 'group'
  | 'url'
  | 'attempt'
  | 'retryOf'
  | 'inputSource'
  | 'candidateId'
  | 'candidateRank'
  | 'warning'
  | 'startedAt'
  | 'completedAt'
  | 'durationMs'
> => ({
  group: 'google_lens',
  url: input.parsedResult.currentUrl,
  attempt: input.scan.steps.filter((step) => step.key === input.stepKey).length + 1,
  retryOf: input.previousRunId,
  inputSource: 'url',
  candidateId: null,
  candidateRank: null,
  warning: null,
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  durationMs: null,
});

export const buildAmazonCaptchaStealthRetrySkippedStep = (input: {
  scan: ProductScanRecord;
  previousRunId: string;
  parsedResult: AmazonScanRuntimeResult;
}): CaptchaRetryStep =>
  ({
    ...buildCaptchaRetryStepBase({ ...input, stepKey: 'google_stealth_retry_skipped' }),
    key: 'google_stealth_retry_skipped',
    label: 'Skip automatic Google retry',
    status: 'skipped',
    resultCode: 'proxy_unavailable',
    message:
      'Skipped automatic Google retry because no proxy is configured; continuing to manual verification settings.',
    details: filterCaptchaRetryDetails([
      { label: 'Retry mode', value: 'Rotate proxy session' },
      { label: 'Skip reason', value: 'Proxy is not enabled for this scanner runtime' },
      { label: 'Previous run ID', value: input.previousRunId },
      { label: 'Blocked stage', value: input.parsedResult.stage },
      { label: 'Blocked URL', value: input.parsedResult.currentUrl },
    ]),
  }) satisfies CaptchaRetryStep;

export const buildAmazonCaptchaStealthRetryStep = (input: {
  scan: ProductScanRecord;
  previousRunId: string;
  retryRunId: string;
  retryRunStatus: CaptchaRetryRunStatus;
  parsedResult: AmazonScanRuntimeResult;
}): CaptchaRetryStep =>
  ({
    ...buildCaptchaRetryStepBase({ ...input, stepKey: 'google_stealth_retry' }),
    key: 'google_stealth_retry',
    label: 'Retry Google candidate search with fresh proxy session',
    status: 'completed',
    resultCode: input.retryRunStatus === 'running' ? 'run_started' : 'run_queued',
    message:
      'Queued an automatic Google retry with a fresh proxy session before manual fallback.',
    details: filterCaptchaRetryDetails([
      { label: 'Retry mode', value: 'Rotate proxy session' },
      { label: 'Previous run ID', value: input.previousRunId },
      { label: 'Retry run ID', value: input.retryRunId },
      { label: 'Blocked stage', value: input.parsedResult.stage },
      { label: 'Blocked URL', value: input.parsedResult.currentUrl },
    ]),
  }) satisfies CaptchaRetryStep;

export const buildAmazonCaptchaManualRetryStep = (input: {
  scan: ProductScanRecord;
  previousRunId: string;
  retryRunId: string;
  retryRunStatus: CaptchaRetryRunStatus;
  parsedResult: AmazonScanRuntimeResult;
  recoveryPath: 'After captcha block' | 'After automatic retry';
}): CaptchaRetryStep =>
  ({
    ...buildCaptchaRetryStepBase({ ...input, stepKey: 'google_manual_retry' }),
    key: 'google_manual_retry',
    label: 'Open Google candidate search in visible browser',
    status: 'completed',
    resultCode: input.retryRunStatus === 'running' ? 'run_started' : 'run_queued',
    message:
      input.retryRunStatus === 'running'
        ? 'Opened a visible browser for Google captcha verification.'
        : 'Queued a visible browser for Google captcha verification.',
    details: filterCaptchaRetryDetails([
      { label: 'Recovery path', value: input.recoveryPath },
      { label: 'Retry mode', value: 'Visible browser' },
      { label: 'Previous run ID', value: input.previousRunId },
      { label: 'Retry run ID', value: input.retryRunId },
      { label: 'Blocked stage', value: input.parsedResult.stage },
      { label: 'Opened URL', value: input.parsedResult.currentUrl },
    ]),
  }) satisfies CaptchaRetryStep;
