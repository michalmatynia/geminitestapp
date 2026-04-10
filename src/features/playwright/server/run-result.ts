import 'server-only';

import { isObjectRecord } from '@/shared/utils/object-utils';

import type { PlaywrightEngineRunRecord } from './runtime';

const toOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

export const resolvePlaywrightEngineRunOutputs = (
  resultPayload: unknown
): {
  outputs: Record<string, unknown>;
  resultValue: Record<string, unknown>;
  finalUrl: string | null;
} => {
  const payloadRecord = isObjectRecord(resultPayload) ? resultPayload : {};
  const outputs = isObjectRecord(payloadRecord['outputs']) ? payloadRecord['outputs'] : payloadRecord;
  const resultValue = isObjectRecord(outputs['result'])
    ? outputs['result']
    : isObjectRecord(outputs)
      ? outputs
      : {};

  return {
    outputs,
    resultValue,
    finalUrl: toOptionalString(payloadRecord['finalUrl']),
  };
};

export const listPlaywrightEngineRunFailureArtifacts = (
  run: Pick<PlaywrightEngineRunRecord, 'artifacts'>
): Array<{
  name: string;
  path: string;
  kind: string | null;
  mimeType: string | null;
}> =>
  (Array.isArray(run.artifacts) ? run.artifacts : []).map((artifact) => ({
    name: artifact.name,
    path: artifact.path,
    kind: artifact.kind ?? null,
    mimeType: artifact.mimeType ?? null,
  }));

export const buildPlaywrightEngineRunFailureMeta = (
  run: Pick<PlaywrightEngineRunRecord, 'runId' | 'status' | 'result' | 'artifacts' | 'logs'>,
  options?: {
    includeRawResult?: boolean;
  }
): Record<string, unknown> => {
  const { resultValue, finalUrl } = resolvePlaywrightEngineRunOutputs(run.result);

  return {
    runId: run.runId,
    runStatus: run.status,
    finalUrl,
    latestStage: toOptionalString(resultValue['stage']),
    latestStageUrl: toOptionalString(resultValue['currentUrl']) ?? finalUrl,
    failureArtifacts: listPlaywrightEngineRunFailureArtifacts(run),
    logTail: (Array.isArray(run.logs) ? run.logs : []).slice(-12),
    ...(options?.includeRawResult
      ? {
          rawResult: Object.keys(resultValue).length > 0 ? resultValue : null,
        }
      : {}),
  };
};

export const normalizePlaywrightEngineRunErrorMessage = (value: unknown): string | null => {
  const trimmed =
    toOptionalString(value) ||
    (isObjectRecord(value) ? toOptionalString(value['message']) : null);
  if (!trimmed) {
    return null;
  }

  return trimmed
    .replace(/^\[runtime\]\[error\]\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim();
};

export const collectPlaywrightEngineRunFailureMessages = (
  run: Pick<PlaywrightEngineRunRecord, 'error' | 'logs' | 'result'>
): string[] => {
  const messages = new Set<string>();
  const directMessage = normalizePlaywrightEngineRunErrorMessage(run.error);
  if (directMessage) {
    messages.add(directMessage);
  }

  const { resultValue } = resolvePlaywrightEngineRunOutputs(run.result);
  const resultMessage = normalizePlaywrightEngineRunErrorMessage(resultValue['message']);
  if (resultMessage) {
    messages.add(resultMessage);
  }

  for (const logLine of Array.isArray(run.logs) ? run.logs : []) {
    if (typeof logLine !== 'string' || !logLine.toLowerCase().includes('[runtime][error]')) {
      continue;
    }
    const normalizedLogLine = normalizePlaywrightEngineRunErrorMessage(logLine);
    if (normalizedLogLine) {
      messages.add(normalizedLogLine);
    }
  }

  return Array.from(messages);
};
