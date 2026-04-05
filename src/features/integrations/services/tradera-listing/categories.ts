import 'server-only';

import { enqueuePlaywrightNodeRun } from '@/features/ai/server';
import { TRADERA_PUBLIC_CATEGORIES_URL } from '@/features/integrations/constants/tradera';
import { DEFAULT_TRADERA_CATEGORY_SCRAPE_SCRIPT } from '@/features/integrations/services/tradera-listing/category-scrape-script';
import {
  parsePersistedStorageState,
  resolveConnectionPlaywrightSettings,
} from '@/features/integrations/services/tradera-playwright-settings';
import { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import { TraderaCategoryRecord } from '@/shared/contracts/integrations/tradera';
import { AppError, AppErrorCodes } from '@/shared/errors/app-error';
import { isObjectRecord } from '@/shared/utils/object-utils';

const CATEGORY_SCRAPE_TIMEOUT_MS = 300_000;

const extractTrimmedString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

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
    if (typeof logLine !== 'string' || !logLine.toLowerCase().includes('[runtime][error]')) {
      continue;
    }
    const normalizedLogLine = normalizeRunnerErrorMessage(logLine);
    if (normalizedLogLine) {
      messages.add(normalizedLogLine);
    }
  }

  return Array.from(messages);
};

const toCategoryFetchError = (
  run: Awaited<ReturnType<typeof enqueuePlaywrightNodeRun>>,
  connectionId: string
): Error => {
  const failureMessages = collectRunnerFailureMessages(run);
  const rawMessage = failureMessages[0] ?? null;

  return new AppError(
    rawMessage ?? 'Tradera categories could not be fetched from the public categories pages.',
    {
      code: AppErrorCodes.operationFailed,
      httpStatus: 422,
      meta: {
        ...buildFailureMeta(run),
        connectionId,
      },
      expected: true,
    }
  );
};

export const fetchTraderaCategoriesForConnection = async (
  connection: IntegrationConnectionRecord
): Promise<TraderaCategoryRecord[]> => {
  const storageState = parsePersistedStorageState(connection.playwrightStorageState);
  const playwrightSettings = await resolveConnectionPlaywrightSettings(connection);
  const personaId = connection.playwrightPersonaId?.trim() || undefined;

  const run = await enqueuePlaywrightNodeRun({
    request: {
      script: DEFAULT_TRADERA_CATEGORY_SCRAPE_SCRIPT,
      input: {
        connectionId: connection.id,
        traderaConfig: {
          categoriesUrl: TRADERA_PUBLIC_CATEGORIES_URL,
        },
      },
      timeoutMs: CATEGORY_SCRAPE_TIMEOUT_MS,
      preventNewPages: true,
      browserEngine: 'chromium',
      startUrl: TRADERA_PUBLIC_CATEGORIES_URL,
      capture: {
        screenshot: true,
        html: true,
      },
      ...(personaId ? { personaId } : {}),
      ...(storageState ? { contextOptions: { storageState } } : {}),
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
  const categorySource = extractTrimmedString(resultValue['categorySource']);
  const withParent = categories.filter((category) => category.parentId && category.parentId !== '0');

  console.log(
    '[tradera-category-fetch]',
    JSON.stringify(
      {
        categorySource,
        total: categories.length,
        withParentCount: withParent.length,
        rootCount: categories.length - withParent.length,
        scrapedFrom: extractTrimmedString(resultValue['scrapedFrom']),
        sampleCategories: categories
          .slice(0, 5)
          .map((category) => ({ id: category.id, name: category.name, parentId: category.parentId })),
        crawlStats: isObjectRecord(resultValue['crawlStats']) ? resultValue['crawlStats'] : null,
        runLogs: (Array.isArray(run.logs) ? run.logs : [])
          .filter((line) => typeof line === 'string' && line.includes('tradera.category'))
          .slice(-20),
      },
      null,
      2
    )
  );

  if (categories.length === 0) {
    throw new AppError(
      'Tradera categories could not be scraped from the public categories pages — the taxonomy page structure may have changed. Configure Tradera API credentials (App ID and App Key) on the connection to fetch categories via the Tradera SOAP API instead.',
      {
        code: AppErrorCodes.operationFailed,
        httpStatus: 422,
        meta: {
          ...buildFailureMeta(run),
          connectionId: connection.id,
          finalUrl,
          categorySource: extractTrimmedString(resultValue['categorySource']),
          scrapedFrom: extractTrimmedString(resultValue['scrapedFrom']),
          diagnostics: isObjectRecord(resultValue['diagnostics']) ? resultValue['diagnostics'] : null,
          crawlStats: isObjectRecord(resultValue['crawlStats']) ? resultValue['crawlStats'] : null,
          recoveryAction: 'tradera_configure_api_credentials',
          recoveryMessage:
            'Add Tradera API App ID and App Key to this connection, then retry category fetch.',
        },
        expected: true,
      }
    );
  }

  return categories;
};
