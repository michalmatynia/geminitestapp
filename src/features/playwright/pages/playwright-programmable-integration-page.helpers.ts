import type { PlaywrightConfigCaptureRoute } from '@/shared/contracts/ai-paths-core/nodes/external-nodes';
import { playwrightConfigCaptureRouteSchema } from '@/shared/contracts/ai-paths-core/nodes/external-nodes';
import type { ProgrammableIntegrationConnection } from '@/shared/contracts/integrations/connections';
import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import { createEmptyPlaywrightCaptureRoute } from '@/shared/lib/ai-paths/core/playwright/capture-defaults';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  PLAYWRIGHT_FIELD_MAPPER_TARGET_FIELDS,
  parsePlaywrightFieldMapperJson,
  type PlaywrightFieldMapperTargetField,
} from '@/features/integrations/services/playwright-listing/field-mapper';
import { supportsProgrammableSessionProfile } from '@/features/playwright/utils/playwright-programmable-session-support';

export type ProgrammableFieldMapperRow = {
  id: string;
  sourceKey: string;
  targetField: PlaywrightFieldMapperTargetField;
};

const DEFAULT_PROGRAMMABLE_FIELD_TARGET: PlaywrightFieldMapperTargetField =
  PLAYWRIGHT_FIELD_MAPPER_TARGET_FIELDS[0];

const createRowId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `mapper-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

export const LISTING_SCRIPT_PLACEHOLDER = `export default async function run({ page, input, emit, log }) {
  await page.goto('https://marketplace.example.com/new-listing');
  await page.fill('#title', input.title);
  await page.fill('#price', String(input.price ?? ''));
  await page.click('button[type="submit"]');

  const listingUrl = page.url();
  const externalListingId = listingUrl.split('/').pop() ?? null;
  emit('result', { listingUrl, externalListingId });
}`;

export const IMPORT_SCRIPT_PLACEHOLDER = `export default async function run({ page, input, emit, log }) {
  const products = [];

  for (const capture of input.captures ?? []) {
    await page.goto(capture.url);
    const title = await page.locator('h1').first().textContent();
    products.push({ title, sourceUrl: capture.url });
  }

  emit('result', products);
}`;

export const IMPORT_AUTOMATION_FLOW_PLACEHOLDER = `{
  "name": "Draft import",
  "blocks": [
    {
      "kind": "for_each",
      "items": { "type": "path", "path": "vars.rawProducts" },
      "blocks": [
        {
          "kind": "map_product",
          "defaults": {
            "catalogId": "catalog-id",
            "importSource": "base"
          }
        },
        { "kind": "create_draft" }
      ]
    }
  ]
}`;

export const PROGRAMMABLE_FIELD_TARGET_OPTIONS =
  PLAYWRIGHT_FIELD_MAPPER_TARGET_FIELDS.map((field) => ({
    value: field,
    label: field,
  }));

export const getProgrammableConnectionOptions = (
  connections: ProgrammableIntegrationConnection[]
): Array<{ label: string; value: string }> =>
  connections.map((connection) => ({
    value: connection.id,
    label: connection.name,
  }));

const parseCaptureRouteEntries = (
  entries: unknown[]
): PlaywrightConfigCaptureRoute[] =>
  entries
    .map((entry) => playwrightConfigCaptureRouteSchema.safeParse(entry))
    .filter((entry) => entry.success)
    .map((entry) => entry.data);

const parseCaptureRouteRecord = (
  record: Record<string, unknown>
): { appearanceMode: string; routes: PlaywrightConfigCaptureRoute[] } => ({
  routes: Array.isArray(record['routes']) ? parseCaptureRouteEntries(record['routes']) : [],
  appearanceMode:
    typeof record['appearanceMode'] === 'string' ? record['appearanceMode'] : '',
});

export const parseProgrammableCaptureRouteConfigJson = (
  rawValue: string | null | undefined
): { appearanceMode: string; routes: PlaywrightConfigCaptureRoute[] } => {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return { routes: [], appearanceMode: '' };
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (Array.isArray(parsed)) {
      return {
        routes: parseCaptureRouteEntries(parsed),
        appearanceMode: '',
      };
    }

    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parseCaptureRouteRecord(parsed as Record<string, unknown>);
    }
  } catch (error) {
    logClientError(error);
  }

  return { routes: [], appearanceMode: '' };
};

export const serializeProgrammableCaptureRouteConfigJson = ({
  routes,
  appearanceMode,
}: {
  routes: PlaywrightConfigCaptureRoute[];
  appearanceMode: string;
}): string =>
  JSON.stringify({
    routes,
    appearanceMode,
  });

export const connectionToProgrammableFieldMapperRows = (
  connection: ProgrammableIntegrationConnection | null
): ProgrammableFieldMapperRow[] =>
  parsePlaywrightFieldMapperJson(connection?.playwrightFieldMapperJson).map((entry) => ({
    id: createRowId(),
    sourceKey: entry.sourceKey,
    targetField: entry.targetField,
  }));

export const serializeProgrammableFieldMapperRows = (
  rows: ProgrammableFieldMapperRow[]
): string | null => {
  const filtered = rows
    .map((row) => ({
      sourceKey: row.sourceKey.trim(),
      targetField: row.targetField,
    }))
    .filter((row) => row.sourceKey.length > 0);

  return filtered.length > 0 ? JSON.stringify(filtered) : null;
};

export const createEmptyProgrammableFieldMapperRow = (): ProgrammableFieldMapperRow => ({
  id: createRowId(),
  sourceKey: '',
  targetField: DEFAULT_PROGRAMMABLE_FIELD_TARGET,
});

export const buildProgrammableActionOptions = (
  actions: PlaywrightAction[] | undefined,
  defaultLabel: string
): Array<{ label: string; value: string }> => [
  { value: '', label: defaultLabel },
  ...((actions ?? [])
    .filter((action) => supportsProgrammableSessionProfile(action))
    .map((action) => ({
      value: action.id,
      label:
        action.runtimeKey !== null ? `${action.name} (${action.runtimeKey})` : action.name,
    })) as Array<{ label: string; value: string }>),
];

export const buildProgrammableConnectionPayload = ({
  connectionName,
  listingScript,
  importScript,
  importBaseUrl,
  listingActionId,
  importActionId,
  captureRoutes,
  appearanceMode,
  automationFlowJson,
  fieldMapperRows,
  payloadPatch = {},
}: {
  appearanceMode: string;
  automationFlowJson: string;
  captureRoutes: PlaywrightConfigCaptureRoute[];
  connectionName: string;
  fieldMapperRows: ProgrammableFieldMapperRow[];
  importActionId: string;
  importBaseUrl: string;
  importScript: string;
  listingActionId: string;
  listingScript: string;
  payloadPatch?: Record<string, unknown>;
}): Record<string, unknown> => {
  const normalizedName = connectionName.trim();
  const normalizedListingScript = listingScript.trim();
  const normalizedImportScript = importScript.trim();
  const normalizedImportBaseUrl = importBaseUrl.trim();
  const normalizedListingActionId = listingActionId.trim();
  const normalizedImportActionId = importActionId.trim();
  const normalizedAutomationFlowJson = automationFlowJson.trim();

  return {
    name: normalizedName.length > 0 ? normalizedName : 'Playwright Connection',
    playwrightListingScript:
      normalizedListingScript.length > 0 ? normalizedListingScript : null,
    playwrightImportScript:
      normalizedImportScript.length > 0 ? normalizedImportScript : null,
    playwrightImportBaseUrl:
      normalizedImportBaseUrl.length > 0 ? normalizedImportBaseUrl : null,
    playwrightListingActionId:
      normalizedListingActionId.length > 0 ? normalizedListingActionId : null,
    playwrightImportActionId:
      normalizedImportActionId.length > 0 ? normalizedImportActionId : null,
    playwrightImportCaptureRoutesJson: serializeProgrammableCaptureRouteConfigJson({
      routes: captureRoutes,
      appearanceMode,
    }),
    playwrightFieldMapperJson: serializeProgrammableFieldMapperRows(fieldMapperRows),
    playwrightImportAutomationFlowJson:
      normalizedAutomationFlowJson.length > 0 ? normalizedAutomationFlowJson : null,
    ...payloadPatch,
  };
};

export const createEmptyProgrammableCaptureRoute = (index: number): PlaywrightConfigCaptureRoute =>
  createEmptyPlaywrightCaptureRoute(index);
