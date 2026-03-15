import { type AiPathsSettingRecord } from './settings-store.constants';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


export const trimLargeString = (value: string, maxLen: number = 1000): string =>
  value.length > maxLen ? `${value.slice(0, maxLen)}…` : value;

export const compactRuntimeValue = (value: unknown, depth: number = 1): unknown => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return trimLargeString(value, 1000);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    if (depth <= 0) return `[Array(${value.length})]`;
    const slice = value.slice(0, 20).map((entry: unknown) => compactRuntimeValue(entry, depth - 1));
    if (value.length > 20) {
      slice.push(`…${value.length - 20} more`);
    }
    return slice;
  }
  if (typeof value === 'object') {
    if (depth <= 0) return '[Object]';
    const record = value as Record<string, unknown>;
    const entries = Object.entries(record);
    const limited = entries
      .slice(0, 20)
      .map(([key, entryValue]: [string, unknown]) => [
        key,
        compactRuntimeValue(entryValue, depth - 1),
      ]);
    const result = Object.fromEntries(limited) as Record<string, unknown>;
    if (entries.length > 20) {
      result['__truncated__'] = `…${entries.length - 20} more keys`;
    }
    return result;
  }
  return value;
};

export const compactRuntimePorts = (
  portsLike: unknown
): Record<string, Record<string, unknown>> => {
  if (!portsLike || typeof portsLike !== 'object') return {};
  const result: Record<string, Record<string, unknown>> = {};
  const nodeEntries = Object.entries(portsLike as Record<string, unknown>).slice(0, 25);
  nodeEntries.forEach(([nodeId, rawPorts]: [string, unknown]) => {
    if (!rawPorts || typeof rawPorts !== 'object') return;
    const portEntries = Object.entries(rawPorts as Record<string, unknown>).slice(0, 20);
    const compacted = Object.fromEntries(
      portEntries.map(([portName, value]: [string, unknown]) => [
        portName,
        compactRuntimeValue(value, 1),
      ])
    ) as Record<string, unknown>;
    result[nodeId] = compacted;
  });
  return result;
};

export const compactRuntimeStateField = (runtimeStateRaw: unknown): string | null => {
  const parsedRuntimeState =
    typeof runtimeStateRaw === 'string'
      ? (() => {
        try {
          return JSON.parse(runtimeStateRaw) as Record<string, unknown>;
        } catch (error) {
          void ErrorSystem.captureException(error);
          return null;
        }
      })()
      : runtimeStateRaw && typeof runtimeStateRaw === 'object'
        ? (runtimeStateRaw as Record<string, unknown>)
        : null;

  if (!parsedRuntimeState) return null;

  const compacted: Record<string, unknown> = {
    inputs: compactRuntimePorts(parsedRuntimeState['inputs']),
    outputs: compactRuntimePorts(parsedRuntimeState['outputs']),
  };

  const currentRunCandidate = parsedRuntimeState['currentRun'];
  if (currentRunCandidate && typeof currentRunCandidate === 'object') {
    const currentRun = currentRunCandidate as Record<string, unknown>;
    if (typeof currentRun['id'] === 'string' && currentRun['id'].trim().length > 0) {
      compacted['currentRun'] = {
        id: currentRun['id'],
        status: currentRun['status'],
        startedAt: typeof currentRun['startedAt'] === 'string' ? currentRun['startedAt'] : null,
        finishedAt: typeof currentRun['finishedAt'] === 'string' ? currentRun['finishedAt'] : null,
        pathId: typeof currentRun['pathId'] === 'string' ? currentRun['pathId'] : null,
        pathName: typeof currentRun['pathName'] === 'string' ? currentRun['pathName'] : null,
        createdAt:
          typeof currentRun['createdAt'] === 'string' ? currentRun['createdAt'] : undefined,
        updatedAt: typeof currentRun['updatedAt'] === 'string' ? currentRun['updatedAt'] : null,
      };
    }
  }

  return JSON.stringify(compacted);
};

export const compactSampleBag = (value: unknown): unknown => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const entries = Object.entries(value as Record<string, unknown>).slice(0, 50);
  return Object.fromEntries(
    entries.map(([key, sample]: [string, unknown]) => [key, compactRuntimeValue(sample, 1)])
  );
};

export const stripHeavyDatabaseSnapshots = (
  nodesRaw: unknown
): { nodes: unknown; changed: boolean } => {
  if (!Array.isArray(nodesRaw)) return { nodes: nodesRaw, changed: false };
  let changed = false;
  const nodes = nodesRaw.map((node: unknown): unknown => {
    if (!node || typeof node !== 'object') return node;
    const nodeRecord = node as Record<string, unknown>;
    if (nodeRecord['type'] !== 'database') return node;
    const config = nodeRecord['config'];
    if (!config || typeof config !== 'object') return node;
    const configRecord = config as Record<string, unknown>;
    const database = configRecord['database'];
    if (!database || typeof database !== 'object') return node;
    const databaseRecord = database as Record<string, unknown>;
    if (!('schemaSnapshot' in databaseRecord)) return node;
    const nextDatabase = { ...databaseRecord };
    delete nextDatabase['schemaSnapshot'];
    changed = true;
    return {
      ...nodeRecord,
      config: {
        ...configRecord,
        database: nextDatabase,
      },
    };
  });
  return { nodes, changed };
};

export const compactPathConfigValue = (raw: string): string | null => {
  let parsed: Record<string, unknown>;
  try {
    const candidate = JSON.parse(raw) as unknown;
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return null;
    }
    parsed = { ...(candidate as Record<string, unknown>) };
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }

  let changed = false;

  const strippedNodes = stripHeavyDatabaseSnapshots(parsed['nodes']);
  if (strippedNodes.changed) {
    parsed['nodes'] = strippedNodes.nodes;
    changed = true;
  }

  const compactedRuntimeState = compactRuntimeStateField(parsed['runtimeState']);
  if (compactedRuntimeState && compactedRuntimeState !== parsed['runtimeState']) {
    parsed['runtimeState'] = compactedRuntimeState;
    changed = true;
  }

  if (parsed['parserSamples'] !== undefined) {
    const compactedParserSamples = compactSampleBag(parsed['parserSamples']);
    if (compactedParserSamples !== parsed['parserSamples']) {
      parsed['parserSamples'] = compactedParserSamples;
      changed = true;
    }
  }

  if (parsed['updaterSamples'] !== undefined) {
    const compactedUpdaterSamples = compactSampleBag(parsed['updaterSamples']);
    if (compactedUpdaterSamples !== parsed['updaterSamples']) {
      parsed['updaterSamples'] = compactedUpdaterSamples;
      changed = true;
    }
  }

  const compacted = JSON.stringify(parsed);
  if (!changed && compacted.length >= raw.length) {
    return null;
  }
  return compacted;
};

export type { AiPathsSettingRecord };
