import 'dotenv/config';

import {
  listAiPathsSettings,
  upsertAiPathsSettingsBulk,
} from '@/features/ai/ai-paths/server/settings-store';
import { parseRuntimeState } from '@/features/ai/ai-paths/services/path-run-executor.helpers';
import type { PathConfig } from '@/shared/contracts/ai-paths';
import { palette } from '@/shared/lib/ai-paths/core/definitions';
import {
  backfillPathConfigNodeContracts,
  normalizeNodes,
} from '@/shared/lib/ai-paths/core/normalization';
import { sanitizeEdges } from '@/shared/lib/ai-paths/core/utils/graph';
import {
  repairPathNodeIdentities,
  stableStringify,
  validateCanonicalPathNodeIdentities,
} from '@/shared/lib/ai-paths/core/utils';

type CliOptions = {
  dryRun: boolean;
  pathId: string | null;
  limit: number | null;
};

type MigrationIssue = {
  key: string;
  reason: string;
};

type MigrationChange = {
  pathId: string;
  runtimeStateReset: boolean;
  nodeIdentityRepaired: boolean;
};

type NormalizeResult = {
  config: PathConfig | null;
  runtimeStateReset: boolean;
  nodeIdentityRepaired: boolean;
  error: string | null;
};

const AI_PATHS_CONFIG_PREFIX = 'ai_paths_config_';
const NODE_KEYED_RUNTIME_LOCATIONS = [
  'inputs',
  'outputs',
  'history',
  'hashes',
  'hashTimestamps',
  'nodeStatuses',
  'nodeOutputs',
] as const;

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    pathId: null,
    limit: null,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--write') {
      options.dryRun = false;
      return;
    }
    if (arg.startsWith('--path=')) {
      const raw = arg.slice('--path='.length).trim();
      options.pathId = raw.length > 0 ? raw : null;
      return;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.limit = parsed;
      }
    }
  });

  return options;
};

const parsePathConfig = (raw: string): PathConfig | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as PathConfig;
  } catch {
    return null;
  }
};

const parseRuntimeStateRecord = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const normalizeNodeMetadata = (
  nodes: PathConfig['nodes'],
  fallbackTimestamp: string
): PathConfig['nodes'] => {
  return nodes.map((node) => ({
    ...node,
    createdAt:
      typeof node.createdAt === 'string' && node.createdAt.trim().length > 0
        ? node.createdAt
        : fallbackTimestamp,
    updatedAt:
      typeof node.updatedAt === 'string' && node.updatedAt.trim().length > 0 ? node.updatedAt : null,
  }));
};

const pruneNodeKeyedRecord = (
  value: unknown,
  canonicalNodeIds: Set<string>
): { value: unknown; changed: boolean } => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { value, changed: false };
  }
  const record = value as Record<string, unknown>;
  const entries: Array<[string, unknown]> = [];
  let changed = false;
  Object.entries(record).forEach(([rawKey, entryValue]: [string, unknown]) => {
    const trimmedKey = rawKey.trim();
    if (!trimmedKey || !canonicalNodeIds.has(trimmedKey)) {
      changed = true;
      return;
    }
    if (trimmedKey !== rawKey) {
      changed = true;
    }
    entries.push([trimmedKey, entryValue]);
  });
  if (!changed) return { value, changed: false };
  return {
    value: Object.fromEntries(entries),
    changed: true,
  };
};

const prunePathNodeKeyedReferences = (
  config: PathConfig
): { config: PathConfig; changed: boolean } => {
  const canonicalNodeIds = new Set<string>((config.nodes ?? []).map((node) => node.id));
  let changed = false;

  const nextParserSamples = pruneNodeKeyedRecord(config.parserSamples, canonicalNodeIds);
  const nextUpdaterSamples = pruneNodeKeyedRecord(config.updaterSamples, canonicalNodeIds);

  const runtimeRecord = parseRuntimeStateRecord(config.runtimeState);
  let nextRuntimeState = config.runtimeState;
  if (runtimeRecord) {
    const nextRuntimeRecord: Record<string, unknown> = { ...runtimeRecord };
    NODE_KEYED_RUNTIME_LOCATIONS.forEach((location) => {
      const pruned = pruneNodeKeyedRecord(nextRuntimeRecord[location], canonicalNodeIds);
      if (!pruned.changed) return;
      nextRuntimeRecord[location] = pruned.value;
      changed = true;
    });
    if (changed) {
      nextRuntimeState = JSON.stringify(nextRuntimeRecord);
    }
  }

  if (nextParserSamples.changed || nextUpdaterSamples.changed) {
    changed = true;
  }

  if (!changed) {
    return { config, changed: false };
  }

  return {
    config: {
      ...config,
      ...(nextParserSamples.changed
        ? { parserSamples: nextParserSamples.value as Record<string, unknown> }
        : {}),
      ...(nextUpdaterSamples.changed
        ? { updaterSamples: nextUpdaterSamples.value as Record<string, unknown> }
        : {}),
      runtimeState: nextRuntimeState,
    },
    changed: true,
  };
};

const normalizePathConfig = (config: PathConfig): NormalizeResult => {
  const contractBackfilled = backfillPathConfigNodeContracts(config).config;
  let working: PathConfig = contractBackfilled;
  let runtimeStateReset = false;
  let nodeIdentityRepaired = false;

  try {
    parseRuntimeState(working.runtimeState);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    runtimeStateReset = true;
    working = {
      ...working,
      runtimeState: '',
    };
    if (!/legacy ai paths runtime identity fields|invalid ai paths runtime state payload/i.test(message)) {
      // Non-canonical runtime payloads are reset to the empty persisted state.
    }
  }

  let normalizedNodes = normalizeNodes(working.nodes ?? []);
  const fallbackNodeTimestamp =
    typeof working.updatedAt === 'string' && working.updatedAt.trim().length > 0
      ? working.updatedAt
      : new Date().toISOString();
  normalizedNodes = normalizeNodeMetadata(normalizedNodes, fallbackNodeTimestamp);
  let normalizedEdges = sanitizeEdges(normalizedNodes, working.edges ?? []);
  working = {
    ...working,
    nodes: normalizedNodes,
    edges: normalizedEdges,
  };

  const identityIssues = validateCanonicalPathNodeIdentities(working, { palette });
  if (identityIssues.length > 0) {
    const repaired = repairPathNodeIdentities(working, { palette });
    nodeIdentityRepaired = repaired.changed || repaired.warnings.length > 0;
    working = repaired.config;
    normalizedNodes = normalizeNodes(working.nodes ?? []);
    normalizedNodes = normalizeNodeMetadata(normalizedNodes, fallbackNodeTimestamp);
    normalizedEdges = sanitizeEdges(normalizedNodes, working.edges ?? []);
    working = {
      ...working,
      nodes: normalizedNodes,
      edges: normalizedEdges,
    };
  }

  const prunedReferences = prunePathNodeKeyedReferences(working);
  if (prunedReferences.changed) {
    working = prunedReferences.config;
  }

  const remainingIdentityIssues = validateCanonicalPathNodeIdentities(working, { palette });
  if (remainingIdentityIssues.length > 0) {
    return {
      config: null,
      runtimeStateReset,
      nodeIdentityRepaired,
      error: `Path identity repair could not canonicalize all node references (${remainingIdentityIssues.length} issue(s)).`,
    };
  }

  return {
    config: working,
    runtimeStateReset,
    nodeIdentityRepaired,
    error: null,
  };
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const settings = await listAiPathsSettings();
  const updates: Array<{ key: string; value: string }> = [];
  const issues: MigrationIssue[] = [];
  const changes: MigrationChange[] = [];

  let scannedSettings = 0;
  let scannedPathConfigs = 0;
  let changedPaths = 0;
  let runtimeStateResets = 0;
  let nodeIdentityRepairs = 0;

  for (const setting of settings) {
    scannedSettings += 1;
    if (!setting.key.startsWith(AI_PATHS_CONFIG_PREFIX)) continue;

    const pathId = setting.key.slice(AI_PATHS_CONFIG_PREFIX.length);
    if (options.pathId && pathId !== options.pathId) continue;

    scannedPathConfigs += 1;
    const parsed = parsePathConfig(setting.value);
    if (!parsed) {
      issues.push({
        key: setting.key,
        reason: 'Invalid or unsupported path config JSON payload.',
      });
      continue;
    }

    const normalized = normalizePathConfig(parsed);
    if (!normalized.config) {
      issues.push({
        key: setting.key,
        reason: normalized.error ?? 'Unknown normalization error.',
      });
      continue;
    }

    const changed = stableStringify(parsed) !== stableStringify(normalized.config);
    if (!changed) continue;

    changedPaths += 1;
    if (normalized.runtimeStateReset) runtimeStateResets += 1;
    if (normalized.nodeIdentityRepaired) nodeIdentityRepairs += 1;
    changes.push({
      pathId,
      runtimeStateReset: normalized.runtimeStateReset,
      nodeIdentityRepaired: normalized.nodeIdentityRepaired,
    });
    updates.push({
      key: setting.key,
      value: JSON.stringify(normalized.config),
    });

    if (options.limit && updates.length >= options.limit) {
      break;
    }
  }

  if (!options.dryRun && updates.length > 0) {
    await upsertAiPathsSettingsBulk(updates);
  }

  console.log(
    JSON.stringify(
      {
        mode: options.dryRun ? 'dry-run' : 'write',
        pathFilter: options.pathId ?? 'all',
        updateLimit: options.limit ?? null,
        scannedSettings,
        scannedPathConfigs,
        changedPaths,
        runtimeStateResets,
        nodeIdentityRepairs,
        updateCount: updates.length,
        changes,
        issues,
      },
      null,
      2
    )
  );
}

void main().catch((error) => {
  console.error('Failed to migrate AI Paths config contract v2:', error);
  process.exit(1);
});
