import 'server-only';

import { enqueuePlaywrightNodeRun } from '@/features/ai/server';
import { DEFAULT_TRADERA_CATEGORY_SCRAPE_SCRIPT } from '@/features/integrations/services/tradera-listing/category-scrape-script';
import {
  parsePersistedStorageState,
  resolveConnectionPlaywrightSettings,
} from '@/features/integrations/services/tradera-playwright-settings';
import { loadTraderaSystemSettings } from '@/features/integrations/services/tradera-system-settings';
import {
  TRADERA_CAPTCHA_HINTS,
  TRADERA_MANUAL_VERIFICATION_TEXT_HINTS,
  TRADERA_MANUAL_VERIFICATION_URL_HINTS,
} from '@/features/integrations/services/tradera-listing/config';
import {
  IntegrationConnectionRecord,
  TraderaCategoryRecord,
} from '@/shared/contracts/integrations';
import {
  AppError,
  AppErrorCodes,
  authError,
  badRequestError,
} from '@/shared/errors/app-error';
import { isObjectRecord } from '@/shared/utils/object-utils';

const CATEGORY_SCRAPE_TIMEOUT_MS = 120_000;

const extractTrimmedString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const includesAnyHint = (value: string | null, hints: readonly string[]): boolean => {
  const normalized = value?.trim().toLowerCase() ?? '';
  if (!normalized) {
    return false;
  }

  return hints.some((hint) => normalized.includes(hint.toLowerCase()));
};

const normalizeParentId = (value: unknown): string => {
  const normalized = extractTrimmedString(value);
  if (!normalized || normalized === '0' || normalized.toLowerCase() === 'null') {
    return '0';
  }
  return normalized;
};

const normalizeCategoryRecord = (value: unknown): TraderaCategoryRecord | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const id = extractTrimmedString(value['id']);
  const name = extractTrimmedString(value['name']);
  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    parentId: normalizeParentId(value['parentId']),
  };
};

const normalizeCategories = (value: unknown): TraderaCategoryRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const deduped = new Map<string, TraderaCategoryRecord>();
  for (const item of value) {
    const normalized = normalizeCategoryRecord(item);
    if (!normalized) {
      continue;
    }
    if (!deduped.has(normalized.id)) {
      deduped.set(normalized.id, normalized);
    }
  }

  return Array.from(deduped.values());
};

const resolveRunnerOutputs = (
  resultPayload: unknown
): {
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
    resultValue,
    finalUrl: extractTrimmedString(payloadRecord['finalUrl']),
  };
};

const buildFailureMeta = (
  run: Awaited<ReturnType<typeof enqueuePlaywrightNodeRun>>
): Record<string, unknown> => {
  const { resultValue, finalUrl } = resolveRunnerOutputs(run.result);

  return {
    runId: run.runId,
    runStatus: run.status,
    finalUrl,
    latestStage: extractTrimmedString(resultValue['stage']),
    latestStageUrl: extractTrimmedString(resultValue['currentUrl']) ?? finalUrl,
    failureArtifacts: (Array.isArray(run.artifacts) ? run.artifacts : []).map((artifact) => ({
      name: artifact.name,
      path: artifact.path,
      kind: artifact.kind ?? null,
      mimeType: artifact.mimeType ?? null,
    })),
    logTail: (Array.isArray(run.logs) ? run.logs : []).slice(-12),
  };
};

const normalizeRunnerErrorMessage = (value: unknown): string | null => {
  const trimmed =
    extractTrimmedString(value) ||
    (isObjectRecord(value) ? extractTrimmedString(value['message']) : null);
  if (!trimmed) {
    return null;
  }

  return trimmed
    .replace(/^\[runtime\]\[error\]\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim();
};

const collectRunnerFailureMessages = (
  run: Awaited<ReturnType<typeof enqueuePlaywrightNodeRun>>
): string[] => {
  const messages = new Set<string>();
  const directMessage = normalizeRunnerErrorMessage(run.error);
  if (directMessage) {
    messages.add(directMessage);
  }

  const { resultValue } = resolveRunnerOutputs(run.result);
  const resultMessage = normalizeRunnerErrorMessage(resultValue['message']);
  if (resultMessage) {
    messages.add(resultMessage);
  }

  for (const logLine of Array.isArray(run.logs) ? run.logs : []) {
    const normalizedLogLine = normalizeRunnerErrorMessage(logLine);
    if (!normalizedLogLine) {
      continue;
    }
    if (
      isAuthRequiredMessage(normalizedLogLine) ||
      normalizedLogLine.toLowerCase().includes('[runtime][error]')
    ) {
      messages.add(normalizedLogLine);
    }
  }

  return Array.from(messages);
};

const isAuthRequiredMessage = (value: string | null): boolean => {
  const normalized = value?.trim().toLowerCase() ?? '';
  if (!normalized) {
    return false;
  }

  return (
    normalized.includes('auth_required') ||
    normalized.includes('manual verification') ||
    normalized.includes('captcha') ||
    normalized.includes('login requires') ||
    normalized.includes('session expired') ||
    normalized.includes('missing or expired')
  );
};

const toCompletedRunAuthError = ({
  run,
  connectionId,
  resultValue,
  finalUrl,
}: {
  run: Awaited<ReturnType<typeof enqueuePlaywrightNodeRun>>;
  connectionId: string;
  resultValue: Record<string, unknown>;
  finalUrl: string | null;
}): Error | null => {
  const currentUrl =
    extractTrimmedString(resultValue['currentUrl']) ??
    finalUrl ??
    extractTrimmedString(resultValue['scrapedFrom']);
  const errorText =
    extractTrimmedString(resultValue['errorText']) ?? extractTrimmedString(resultValue['message']);
  const recoveryMessageFromResult = extractTrimmedString(resultValue['recoveryMessage']);
  const loginPage = resultValue['loginPage'] === true;
  const captchaDetected =
    resultValue['captchaDetected'] === true ||
    includesAnyHint(errorText, TRADERA_CAPTCHA_HINTS) ||
    includesAnyHint(
      currentUrl,
      TRADERA_MANUAL_VERIFICATION_URL_HINTS.filter((hint) =>
        hint.toLowerCase().includes('captcha')
      )
    );
  const manualVerificationDetected =
    resultValue['manualVerificationDetected'] === true ||
    captchaDetected ||
    includesAnyHint(errorText, TRADERA_MANUAL_VERIFICATION_TEXT_HINTS) ||
    includesAnyHint(currentUrl, TRADERA_MANUAL_VERIFICATION_URL_HINTS);
  const authRequired =
    resultValue['authRequired'] === true ||
    loginPage ||
    manualVerificationDetected ||
    isAuthRequiredMessage(recoveryMessageFromResult) ||
    isAuthRequiredMessage(errorText);

  if (!authRequired) {
    return null;
  }

  const recoveryMessage =
    recoveryMessageFromResult ??
    (loginPage
      ? 'Tradera browser session is missing or expired. Reconnect the browser Tradera connection and retry category fetch.'
      : captchaDetected
        ? 'Stored Tradera session expired and Tradera requires manual verification (captcha). Refresh the saved browser session.'
        : 'Stored Tradera session expired and Tradera requires manual verification. Refresh the saved browser session.');

  return authError(recoveryMessage, {
    ...buildFailureMeta(run),
    connectionId,
    currentUrl,
    errorText,
    recoveryAction: 'tradera_manual_login',
    recoveryMessage,
    captchaDetected,
    manualVerificationDetected,
  });
};

const toCategoryFetchError = (
  run: Awaited<ReturnType<typeof enqueuePlaywrightNodeRun>>,
  connectionId: string
): Error => {
  const failureMessages = collectRunnerFailureMessages(run);
  const rawMessage = failureMessages.find((message) => isAuthRequiredMessage(message)) ??
    failureMessages[0] ??
    null;
  const failureMeta = {
    ...buildFailureMeta(run),
    connectionId,
  };

  if (rawMessage && isAuthRequiredMessage(rawMessage)) {
    const recoveryMessage = rawMessage.replace(/^AUTH_REQUIRED:\s*/i, '').trim();
    return authError(rawMessage.replace(/^AUTH_REQUIRED:\s*/i, '').trim(), {
      ...failureMeta,
      recoveryAction: 'tradera_manual_login',
      recoveryMessage,
    });
  }

  return new AppError(
    rawMessage ?? 'Tradera categories could not be fetched from the live listing page.',
    {
      code: AppErrorCodes.operationFailed,
      httpStatus: 422,
      meta: failureMeta,
      expected: true,
    }
  );
};

export const fetchTraderaCategoriesForConnection = async (
  connection: IntegrationConnectionRecord
): Promise<TraderaCategoryRecord[]> => {
  const storageState = parsePersistedStorageState(connection.playwrightStorageState);
  if (!storageState) {
    throw badRequestError(
      'Tradera browser session is missing or expired. Reconnect the browser Tradera connection and retry category fetch.',
      { connectionId: connection.id }
    );
  }

  const systemSettings = await loadTraderaSystemSettings();
  const playwrightSettings = await resolveConnectionPlaywrightSettings(connection);
  const personaId = connection.playwrightPersonaId?.trim() || undefined;

  const run = await enqueuePlaywrightNodeRun({
    request: {
      script: DEFAULT_TRADERA_CATEGORY_SCRAPE_SCRIPT,
      input: {
        connectionId: connection.id,
        traderaConfig: {
          listingFormUrl: systemSettings.listingFormUrl,
        },
      },
      timeoutMs: CATEGORY_SCRAPE_TIMEOUT_MS,
      preventNewPages: true,
      browserEngine: 'chromium',
      startUrl: systemSettings.listingFormUrl,
      capture: {
        screenshot: true,
        html: true,
      },
      ...(personaId ? { personaId } : {}),
      contextOptions: {
        storageState,
      },
      settingsOverrides: {
        headless: playwrightSettings.headless,
        slowMo: playwrightSettings.slowMo,
        timeout: playwrightSettings.timeout,
        navigationTimeout: playwrightSettings.navigationTimeout,
        humanizeMouse: playwrightSettings.humanizeMouse,
        mouseJitter: playwrightSettings.mouseJitter,
        clickDelayMin: playwrightSettings.clickDelayMin,
        clickDelayMax: playwrightSettings.clickDelayMax,
        inputDelayMin: playwrightSettings.inputDelayMin,
        inputDelayMax: playwrightSettings.inputDelayMax,
        actionDelayMin: playwrightSettings.actionDelayMin,
        actionDelayMax: playwrightSettings.actionDelayMax,
        proxyEnabled: playwrightSettings.proxyEnabled,
        proxyServer: playwrightSettings.proxyServer,
        proxyUsername: playwrightSettings.proxyUsername,
        proxyPassword: playwrightSettings.proxyPassword,
        emulateDevice: playwrightSettings.emulateDevice,
        deviceName: playwrightSettings.deviceName,
      },
    },
    waitForResult: true,
  });

  if (run.status === 'failed') {
    throw toCategoryFetchError(run, connection.id);
  }

  const { resultValue, finalUrl } = resolveRunnerOutputs(run.result);
  const categories = normalizeCategories(resultValue['categories']);

  if (categories.length === 0) {
    const completedRunAuthError = toCompletedRunAuthError({
      run,
      connectionId: connection.id,
      resultValue,
      finalUrl,
    });
    if (completedRunAuthError) {
      throw completedRunAuthError;
    }

    throw new AppError(
      'Tradera categories could not be fetched from the live listing page. No categories were detected on the Tradera listing form.',
      {
        code: AppErrorCodes.operationFailed,
        httpStatus: 422,
        meta: {
          ...buildFailureMeta(run),
          finalUrl,
          categorySource: extractTrimmedString(resultValue['categorySource']),
          scrapedFrom: extractTrimmedString(resultValue['scrapedFrom']),
        },
        expected: true,
      }
    );
  }

  return categories;
};
