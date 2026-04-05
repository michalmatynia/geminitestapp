import 'server-only';

import { playwrightConfigCaptureRouteSchema } from '@/shared/contracts/ai-paths-core/nodes/external-nodes';
import type { IntegrationConnectionRecord, IntegrationRecord } from '@/shared/contracts/integrations/repositories';
import { buildCaptureRouteUrl } from '@/shared/lib/ai-paths/core/playwright/capture-defaults';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  mapPlaywrightImportProducts,
  parsePlaywrightFieldMapperJson,
  type PlaywrightMappedImportProduct,
} from './playwright-listing/field-mapper';
import { runPlaywrightImportScript } from './playwright-listing/runner';

const normalizeCaptureRoutes = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => playwrightConfigCaptureRouteSchema.safeParse(entry))
    .filter((entry) => entry.success)
    .map((entry) => entry.data);
};

export const parsePlaywrightImportCaptureConfigJson = (
  rawValue: string | null | undefined
): {
  routes: ReturnType<typeof normalizeCaptureRoutes>;
  appearanceMode: string;
} => {
  if (!rawValue?.trim()) {
    return { routes: [], appearanceMode: '' };
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (Array.isArray(parsed)) {
      return {
        routes: normalizeCaptureRoutes(parsed),
        appearanceMode: '',
      };
    }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      return {
        routes: normalizeCaptureRoutes(record['routes']),
        appearanceMode:
          typeof record['appearanceMode'] === 'string' ? record['appearanceMode'] : '',
      };
    }
  } catch (error) {
    logClientError(error);
  }

  return { routes: [], appearanceMode: '' };
};

export const buildPlaywrightImportInput = (
  connection: IntegrationConnectionRecord
): Record<string, unknown> => {
  const baseUrl = connection.playwrightImportBaseUrl?.trim() ?? '';
  const captureConfig = parsePlaywrightImportCaptureConfigJson(
    connection.playwrightImportCaptureRoutesJson
  );
  const captureRoutes = captureConfig.routes;

  return {
    baseUrl: baseUrl || null,
    appearanceMode: captureConfig.appearanceMode || null,
    captures: captureRoutes.map((capture) => ({
      ...capture,
      url: buildCaptureRouteUrl(baseUrl, capture.path) ?? capture.path,
    })),
    routes: captureRoutes,
  };
};

const ensurePlaywrightImportScript = (connection: IntegrationConnectionRecord): string => {
  const script = connection.playwrightImportScript?.trim();
  if (!script) {
    throw new Error('This connection does not have a Playwright import script configured.');
  }
  return script;
};

export const runPlaywrightImport = async ({
  connection,
  integration,
}: {
  connection: IntegrationConnectionRecord;
  integration?: IntegrationRecord | null;
}): Promise<{
  rawProducts: Array<Record<string, unknown>>;
  mappedProducts: PlaywrightMappedImportProduct[];
  rawResult: Record<string, unknown>;
}> => {
  if (integration && integration.slug.trim().toLowerCase() !== 'playwright-programmable') {
    throw new Error(
      `Integration ${integration.slug} does not support programmable Playwright imports.`
    );
  }

  const script = ensurePlaywrightImportScript(connection);
  const result = await runPlaywrightImportScript({
    script,
    input: buildPlaywrightImportInput(connection),
    connection,
  });

  const fieldMappings = parsePlaywrightFieldMapperJson(connection.playwrightFieldMapperJson);

  return {
    rawProducts: result.products,
    mappedProducts: mapPlaywrightImportProducts(result.products, fieldMappings),
    rawResult: result.rawResult,
  };
};
