import 'server-only';

import { isObjectRecord } from '@/shared/utils/object-utils';

import type { PlaywrightEngineRunRecord } from './runtime';

const toOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const toOptionalBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const normalizeRuntimePosture = (value: unknown): Record<string, unknown> | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const browser = isObjectRecord(value['browser']) ? value['browser'] : null;
  const antiDetection = isObjectRecord(value['antiDetection']) ? value['antiDetection'] : null;
  const proxy = antiDetection && isObjectRecord(antiDetection['proxy']) ? antiDetection['proxy'] : null;
  const stickyStorageState =
    antiDetection && isObjectRecord(antiDetection['stickyStorageState'])
      ? antiDetection['stickyStorageState']
      : null;

  const normalized: Record<string, unknown> = {};

  if (browser) {
    const normalizedBrowser: Record<string, unknown> = {};
    const browserEngine = toOptionalString(browser['engine']);
    const browserLabel = toOptionalString(browser['label']);
    const browserChannel = toOptionalString(browser['channel']);
    const executablePathLabel = toOptionalString(browser['executablePathLabel']);
    const browserHeadless = toOptionalBoolean(browser['headless']);
    if (browserEngine) normalizedBrowser['engine'] = browserEngine;
    if (browserLabel) normalizedBrowser['label'] = browserLabel;
    if (browserChannel) normalizedBrowser['channel'] = browserChannel;
    if (executablePathLabel) normalizedBrowser['executablePathLabel'] = executablePathLabel;
    if (browserHeadless !== null) normalizedBrowser['headless'] = browserHeadless;
    if (Object.keys(normalizedBrowser).length > 0) {
      normalized['browser'] = normalizedBrowser;
    }
  }

  if (antiDetection) {
    const normalizedAntiDetection: Record<string, unknown> = {};
    const identityProfile = toOptionalString(antiDetection['identityProfile']);
    const locale = toOptionalString(antiDetection['locale']);
    const timezoneId = toOptionalString(antiDetection['timezoneId']);
    const userAgent = toOptionalString(antiDetection['userAgent']);
    if (identityProfile) normalizedAntiDetection['identityProfile'] = identityProfile;
    if (locale) normalizedAntiDetection['locale'] = locale;
    if (timezoneId) normalizedAntiDetection['timezoneId'] = timezoneId;
    if (userAgent) normalizedAntiDetection['userAgent'] = userAgent;

    if (stickyStorageState) {
      const normalizedStickyStorageState: Record<string, unknown> = {};
      const stickyEnabled = toOptionalBoolean(stickyStorageState['enabled']);
      const stickyLoaded = toOptionalBoolean(stickyStorageState['loaded']);
      const stickyScopeLabel = toOptionalString(stickyStorageState['scopeLabel']);
      const stickyOrigin = toOptionalString(stickyStorageState['origin']);
      if (stickyEnabled !== null) normalizedStickyStorageState['enabled'] = stickyEnabled;
      if (stickyLoaded !== null) normalizedStickyStorageState['loaded'] = stickyLoaded;
      if (stickyScopeLabel) normalizedStickyStorageState['scopeLabel'] = stickyScopeLabel;
      if (stickyOrigin) normalizedStickyStorageState['origin'] = stickyOrigin;
      if (Object.keys(normalizedStickyStorageState).length > 0) {
        normalizedAntiDetection['stickyStorageState'] = normalizedStickyStorageState;
      }
    }

    if (proxy) {
      const normalizedProxy: Record<string, unknown> = {};
      const proxyEnabled = toOptionalBoolean(proxy['enabled']);
      const proxySessionAffinityEnabled = toOptionalBoolean(proxy['sessionAffinityEnabled']);
      const proxyProviderPreset = toOptionalString(proxy['providerPreset']);
      const proxySessionMode = toOptionalString(proxy['sessionMode']);
      const proxyReason = toOptionalString(proxy['reason']);
      const proxyServerHost = toOptionalString(proxy['serverHost']);
      const proxyScopeLabel = toOptionalString(proxy['scopeLabel']);
      const proxyOrigin = toOptionalString(proxy['origin']);
      if (proxyEnabled !== null) normalizedProxy['enabled'] = proxyEnabled;
      if (proxySessionAffinityEnabled !== null) {
        normalizedProxy['sessionAffinityEnabled'] = proxySessionAffinityEnabled;
      }
      if (proxyProviderPreset) normalizedProxy['providerPreset'] = proxyProviderPreset;
      if (proxySessionMode) normalizedProxy['sessionMode'] = proxySessionMode;
      if (proxyReason) normalizedProxy['reason'] = proxyReason;
      if (proxyServerHost) normalizedProxy['serverHost'] = proxyServerHost;
      if (proxyScopeLabel) normalizedProxy['scopeLabel'] = proxyScopeLabel;
      if (proxyOrigin) normalizedProxy['origin'] = proxyOrigin;
      if (Object.keys(normalizedProxy).length > 0) {
        normalizedAntiDetection['proxy'] = normalizedProxy;
      }
    }

    if (Object.keys(normalizedAntiDetection).length > 0) {
      normalized['antiDetection'] = normalizedAntiDetection;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
};

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
  const resultRecord = isObjectRecord(run.result) ? run.result : {};
  const runtimePosture = normalizeRuntimePosture(resultRecord['runtimePosture']);

  return {
    runId: run.runId,
    runStatus: run.status,
    finalUrl,
    latestStage: toOptionalString(resultValue['stage']),
    latestStageUrl: toOptionalString(resultValue['currentUrl']) ?? finalUrl,
    failureArtifacts: listPlaywrightEngineRunFailureArtifacts(run),
    logTail: (Array.isArray(run.logs) ? run.logs : []).slice(-12),
    ...(runtimePosture
      ? {
          runtimePosture,
        }
      : {}),
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
