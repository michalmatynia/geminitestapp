import 'dotenv/config';

import {
  sanitizeEdges,
} from '@/features/ai/ai-paths/lib/core/utils/graph';
import { normalizeNodes } from '@/features/ai/ai-paths/lib/core/normalization';
import { stableStringify } from '@/features/ai/ai-paths/lib/core/utils/runtime';
import {
  listAiPathsSettings,
  upsertAiPathsSettingsBulk,
} from '@/features/ai/ai-paths/server/settings-store';
import type { PathConfig } from '@/shared/contracts/ai-paths';

type CliOptions = {
  dryRun: boolean;
  pathId: string | null;
  limit: number | null;
};

type BackfillIssue = {
  key: string;
  reason: string;
};

const AI_PATHS_CONFIG_PREFIX = 'ai_paths_config_';

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
    const record = parsed as Record<string, unknown>;
    if (!Array.isArray(record['nodes']) || !Array.isArray(record['edges'])) {
      return null;
    }
    return parsed as PathConfig;
  } catch {
    return null;
  }
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const settings = await listAiPathsSettings();
  const updates: Array<{ key: string; value: string }> = [];
  const changedPathIds: string[] = [];
  const issues: BackfillIssue[] = [];

  let scannedSettings = 0;
  let scannedPathConfigs = 0;
  let changedPaths = 0;
  let droppedEdges = 0;
  let rewiredEdges = 0;

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
        reason: 'Invalid or unsupported path config payload.',
      });
      continue;
    }

    const normalizedNodes = normalizeNodes(parsed.nodes ?? []);
    const canonicalEdges = sanitizeEdges(normalizedNodes, parsed.edges ?? []);
    if (stableStringify(parsed.edges ?? []) === stableStringify(canonicalEdges)) {
      continue;
    }

    changedPaths += 1;
    changedPathIds.push(pathId);
    droppedEdges += Math.max(0, (parsed.edges?.length ?? 0) - canonicalEdges.length);
    rewiredEdges += canonicalEdges.reduce((count: number, edge, index: number): number => {
      const original = parsed.edges?.[index];
      if (!original) return count;
      if (
        original.fromPort !== edge.fromPort ||
        original.toPort !== edge.toPort
      ) {
        return count + 1;
      }
      return count;
    }, 0);

    updates.push({
      key: setting.key,
      value: JSON.stringify({
        ...parsed,
        nodes: normalizedNodes,
        edges: canonicalEdges,
      }),
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
        droppedEdges,
        rewiredEdges,
        updateCount: updates.length,
        changedPathIds,
        issues,
      },
      null,
      2
    )
  );
  process.exit(0);
}

void main().catch((error) => {
  console.error('Failed to backfill AI Paths sanitized edges:', error);
  process.exit(1);
});
