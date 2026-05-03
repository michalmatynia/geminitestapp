import type { PlaywrightConfigCaptureRoute } from '@/shared/contracts/ai-paths-core/nodes/external-nodes';
import { playwrightConfigCaptureRouteSchema } from '@/shared/contracts/ai-paths-core/nodes/external-nodes';
import type { ProgrammableIntegrationConnection } from '@/shared/contracts/integrations/connections';
import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import { createEmptyPlaywrightCaptureRoute } from '@/shared/lib/ai-paths/core/playwright/capture-defaults';
import { isObjectRecord } from '@/shared/utils/object-utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  PLAYWRIGHT_FIELD_MAPPER_TARGET_FIELDS,
  parsePlaywrightFieldMapperJson,
  type PlaywrightFieldMapperTargetField,
} from '@/features/integrations/services/playwright-listing/field-mapper';
import {
  PLAYWRIGHT_DRAFT_MAPPER_TARGET_PATHS,
  PLAYWRIGHT_DRAFT_MAPPER_TRANSFORMS,
  createEmptyPlaywrightDraftMapperRow,
  parsePlaywrightDraftMapperJson,
  serializePlaywrightDraftMapperRows,
  type PlaywrightDraftMapperRow,
} from '@/features/integrations/services/playwright-listing/draft-mapper';
import { supportsProgrammableSessionProfile } from '@/features/playwright/utils/playwright-programmable-session-support';

export type ProgrammableFieldMapperRow = {
  id: string;
  sourceKey: string;
  targetField: PlaywrightFieldMapperTargetField;
};

export type ProgrammableDraftMapperRow = PlaywrightDraftMapperRow;

const PROGRAMMABLE_DRAFT_MAPPER_PRIMARY_SIGNAL_TOKENS = ['title', 'name'] as const;
const PROGRAMMABLE_DRAFT_MAPPER_SECONDARY_SIGNAL_TOKENS = [
  'brand',
  'description',
  'ean',
  'imagelinks',
  'images',
  'price',
  'sku',
  'sourceurl',
  'url',
] as const;

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

export const buildDraftMapperAutomationFlowTemplate = (): string =>
  JSON.stringify(
    {
      name: 'Draft mapper import',
      blocks: [
        {
          kind: 'for_each',
          items: { type: 'path', path: 'vars.scrapedItems' },
          blocks: [
            { kind: 'map_draft' },
            { kind: 'create_draft' },
            {
              kind: 'append_result',
              resultKey: 'drafts',
              value: { type: 'path', path: 'current' },
            },
          ],
        },
      ],
    },
    null,
    2
  );

export const buildDraftMapperPreviewAutomationFlowTemplate = (): string =>
  JSON.stringify(
    {
      name: 'Draft mapper preview',
      blocks: [
        {
          kind: 'for_each',
          items: { type: 'path', path: 'vars.scrapedItems' },
          blocks: [
            { kind: 'map_draft' },
            {
              kind: 'append_result',
              resultKey: 'mappedDrafts',
              value: { type: 'path', path: 'current' },
            },
          ],
        },
      ],
    },
    null,
    2
  );

export const buildDraftMapperResilientAutomationFlowTemplate = (): string =>
  JSON.stringify(
    {
      name: 'Draft mapper resilient import',
      blocks: [
        {
          kind: 'for_each',
          items: { type: 'path', path: 'vars.scrapedItems' },
          blocks: [
            { kind: 'map_draft' },
            {
              kind: 'append_result',
              resultKey: 'mappedDrafts',
              value: { type: 'path', path: 'current' },
            },
            {
              kind: 'create_draft',
              onError: 'continue',
            },
            {
              kind: 'append_result',
              resultKey: 'draftWrites',
              value: { type: 'path', path: 'current' },
            },
          ],
        },
      ],
    },
    null,
    2
  );

export const IMPORT_AUTOMATION_FLOW_PLACEHOLDER = buildDraftMapperAutomationFlowTemplate();

export const PROGRAMMABLE_FIELD_TARGET_OPTIONS =
  PLAYWRIGHT_FIELD_MAPPER_TARGET_FIELDS.map((field) => ({
    value: field,
    label: field,
  }));

export const PROGRAMMABLE_DRAFT_TARGET_OPTIONS =
  PLAYWRIGHT_DRAFT_MAPPER_TARGET_PATHS.map((targetPath) => ({
    value: targetPath,
    label: targetPath,
  }));

export const PROGRAMMABLE_DRAFT_TRANSFORM_OPTIONS =
  PLAYWRIGHT_DRAFT_MAPPER_TRANSFORMS.map((transform) => ({
    value: transform,
    label: transform,
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

export const connectionToProgrammableDraftMapperRows = (
  connection: ProgrammableIntegrationConnection | null
): ProgrammableDraftMapperRow[] =>
  parsePlaywrightDraftMapperJson(connection?.playwrightDraftMapperJson);

export const createEmptyProgrammableDraftMapperRule = (): ProgrammableDraftMapperRow =>
  createEmptyPlaywrightDraftMapperRow();

export const getProgrammableDraftMapperSourcePathTokens = (sourcePath: string): string[] =>
  sourcePath
    .trim()
    .toLowerCase()
    .split(/[\.\[\]]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

const pathIncludesAnyToken = (sourcePath: string, candidates: readonly string[]): boolean => {
  const tokens = getProgrammableDraftMapperSourcePathTokens(sourcePath);
  return candidates.some((candidate) => tokens.includes(candidate));
};

export const getProgrammableDraftMapperSignalMatches = (
  samplePaths: string[]
): {
  primaryMatches: string[];
  secondaryMatches: string[];
} => ({
  primaryMatches: samplePaths.filter((path) =>
    pathIncludesAnyToken(path, PROGRAMMABLE_DRAFT_MAPPER_PRIMARY_SIGNAL_TOKENS)
  ),
  secondaryMatches: samplePaths.filter((path) =>
    pathIncludesAnyToken(path, PROGRAMMABLE_DRAFT_MAPPER_SECONDARY_SIGNAL_TOKENS)
  ),
});

export const sortProgrammableDraftMapperSourcePathsBySignal = (
  samplePaths: string[],
  matches: {
    primaryMatches: string[];
    secondaryMatches: string[];
  }
): string[] => {
  const primaryPaths = new Set(matches.primaryMatches);
  const secondaryPaths = new Set(matches.secondaryMatches);

  const getRank = (path: string): number => {
    if (primaryPaths.has(path)) return 0;
    if (secondaryPaths.has(path)) return 1;
    return 2;
  };

  return [...samplePaths].sort((left, right) => {
    const leftRank = getRank(left);
    const rightRank = getRank(right);
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.localeCompare(right);
  });
};

export const buildProgrammableDraftMapperSeedFromSourcePath = (
  sourcePath: string
): Pick<
  ProgrammableDraftMapperRow,
  | 'enabled'
  | 'mode'
  | 'required'
  | 'sourcePath'
  | 'staticValue'
  | 'targetPath'
  | 'transform'
> => {
  const normalizedSourcePath = sourcePath.trim();
  const normalizedTokens = getProgrammableDraftMapperSourcePathTokens(normalizedSourcePath);
  const includesToken = (...candidates: string[]): boolean =>
    candidates.some((candidate) => normalizedTokens.includes(candidate));

  if (includesToken('images', 'imagelinks')) {
    return {
      enabled: true,
      mode: 'scraped',
      required: false,
      sourcePath: normalizedSourcePath,
      staticValue: '',
      targetPath: 'imageLinks',
      transform: 'string_array',
    };
  }

  if (includesToken('catalogids')) {
    return {
      enabled: true,
      mode: 'scraped',
      required: false,
      sourcePath: normalizedSourcePath,
      staticValue: '',
      targetPath: 'catalogIds',
      transform: 'string_array',
    };
  }

  if (includesToken('tagids')) {
    return {
      enabled: true,
      mode: 'scraped',
      required: false,
      sourcePath: normalizedSourcePath,
      staticValue: '',
      targetPath: 'tagIds',
      transform: 'string_array',
    };
  }

  if (includesToken('producerids')) {
    return {
      enabled: true,
      mode: 'scraped',
      required: false,
      sourcePath: normalizedSourcePath,
      staticValue: '',
      targetPath: 'producerIds',
      transform: 'string_array',
    };
  }

  if (includesToken('shippinggroupid')) {
    return {
      enabled: true,
      mode: 'scraped',
      required: false,
      sourcePath: normalizedSourcePath,
      staticValue: '',
      targetPath: 'shippingGroupId',
      transform: 'trim',
    };
  }

  if (includesToken('categoryid')) {
    return {
      enabled: true,
      mode: 'scraped',
      required: false,
      sourcePath: normalizedSourcePath,
      staticValue: '',
      targetPath: 'categoryId',
      transform: 'trim',
    };
  }

  if (includesToken('price')) {
    return {
      enabled: true,
      mode: 'scraped',
      required: false,
      sourcePath: normalizedSourcePath,
      staticValue: '',
      targetPath: 'price',
      transform: 'number',
    };
  }

  if (includesToken('sku')) {
    return {
      enabled: true,
      mode: 'scraped',
      required: false,
      sourcePath: normalizedSourcePath,
      staticValue: '',
      targetPath: 'sku',
      transform: 'trim',
    };
  }

  if (includesToken('ean')) {
    return {
      enabled: true,
      mode: 'scraped',
      required: false,
      sourcePath: normalizedSourcePath,
      staticValue: '',
      targetPath: 'ean',
      transform: 'trim',
    };
  }

  if (includesToken('description')) {
    return {
      enabled: true,
      mode: 'scraped',
      required: false,
      sourcePath: normalizedSourcePath,
      staticValue: '',
      targetPath: 'description_en',
      transform: 'trim',
    };
  }

  if (includesToken('sourceurl', 'url')) {
    return {
      enabled: true,
      mode: 'scraped',
      required: false,
      sourcePath: normalizedSourcePath,
      staticValue: '',
      targetPath: 'supplierLink',
      transform: 'trim',
    };
  }

  if (includesToken('title', 'name')) {
    return {
      enabled: true,
      mode: 'scraped',
      required: true,
      sourcePath: normalizedSourcePath,
      staticValue: '',
      targetPath: 'name_en',
      transform: 'trim',
    };
  }

  return {
    enabled: true,
    mode: 'scraped',
    required: false,
    sourcePath: normalizedSourcePath,
    staticValue: '',
    targetPath: 'name_en',
    transform: 'trim',
  };
};

export const createSeededProgrammableDraftMapperRule = (
  sourcePath: string
): ProgrammableDraftMapperRow => ({
  ...createEmptyProgrammableDraftMapperRule(),
  ...buildProgrammableDraftMapperSeedFromSourcePath(sourcePath),
});

export const collectProgrammableDraftMapperSampleSourcePaths = (
  sample: Record<string, unknown> | null,
  options?: {
    maxDepth?: number;
    maxPaths?: number;
  }
): string[] => {
  if (sample === null) {
    return [];
  }

  const maxDepth = options?.maxDepth ?? 4;
  const maxPaths = options?.maxPaths ?? 16;
  const paths: string[] = [];
  const seen = new Set<string>();

  const pushPath = (path: string): void => {
    const normalizedPath = path.trim();
    if (normalizedPath.length === 0 || seen.has(normalizedPath) || paths.length >= maxPaths) {
      return;
    }

    seen.add(normalizedPath);
    paths.push(normalizedPath);
  };

  const visit = (value: unknown, path: string, depth: number): void => {
    if (paths.length >= maxPaths || depth > maxDepth) {
      return;
    }

    if (Array.isArray(value)) {
      pushPath(path);
      const firstMeaningfulEntry = value.find((entry) => entry !== null && entry !== undefined);
      if (firstMeaningfulEntry !== undefined && depth < maxDepth) {
        visit(firstMeaningfulEntry, `${path}.0`, depth + 1);
      }
      return;
    }

    if (isObjectRecord(value)) {
      for (const [key, nestedValue] of Object.entries(value)) {
        if (paths.length >= maxPaths) {
          return;
        }

        visit(nestedValue, path.length > 0 ? `${path}.${key}` : key, depth + 1);
      }
      return;
    }

    pushPath(path);
  };

  for (const [key, value] of Object.entries(sample)) {
    if (paths.length >= maxPaths) {
      break;
    }

    visit(value, key, 0);
  }

  return paths;
};

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
  draftMapperRows,
  fieldMapperRows,
  payloadPatch = {},
}: {
  appearanceMode: string;
  automationFlowJson: string;
  captureRoutes: PlaywrightConfigCaptureRoute[];
  connectionName: string;
  draftMapperRows: ProgrammableDraftMapperRow[];
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
    playwrightDraftMapperJson: serializePlaywrightDraftMapperRows(draftMapperRows),
    playwrightImportAutomationFlowJson:
      normalizedAutomationFlowJson.length > 0 ? normalizedAutomationFlowJson : null,
    ...payloadPatch,
  };
};

export const createEmptyProgrammableCaptureRoute = (index: number): PlaywrightConfigCaptureRoute =>
  createEmptyPlaywrightCaptureRoute(index);
