import 'dotenv/config';

import {
  listMongoAiPathsSettings,
  upsertMongoAiPathsSettings,
} from '@/features/ai/ai-paths/server/settings-store.repository';
import { parsePositiveInt } from '@/features/ai/ai-paths/server/settings-store.helpers';
import type { PathConfig } from '@/shared/contracts/ai-paths';

import {
  rewritePathConfigDatabaseUpdateContract,
  type DatabaseUpdateContractNodeIssue,
  type DatabaseUpdateContractNodeUpdate,
} from './lib/ai-paths-database-update-contract';

type CliOptions = {
  dryRun: boolean;
  pathId: string | null;
  limit: number | null;
};

type BackfillIssue = {
  key: string;
  reason: string;
};

type PathNodeUpdate = DatabaseUpdateContractNodeUpdate & {
  pathId: string;
  pathName: string | null;
};

type PathNodeIssue = DatabaseUpdateContractNodeIssue & {
  pathId: string;
  pathName: string | null;
};

const AI_PATHS_CONFIG_PREFIX = 'ai_paths_config_';
const AI_PATHS_MONGO_OP_TIMEOUT_MS = parsePositiveInt(
  process.env['AI_PATHS_MONGO_OP_TIMEOUT_MS'],
  15_000
);

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
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    if (!Array.isArray(record['nodes']) || !Array.isArray(record['edges'])) return null;
    return parsed as PathConfig;
  } catch {
    return null;
  }
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const settings = await listMongoAiPathsSettings(AI_PATHS_MONGO_OP_TIMEOUT_MS);
  const updates: Array<{ key: string; value: string }> = [];
  const changedPathIds: string[] = [];
  const changedNodeUpdates: PathNodeUpdate[] = [];
  const nodeIssues: PathNodeIssue[] = [];
  const issues: BackfillIssue[] = [];

  let scannedSettings = 0;
  let scannedPathConfigs = 0;
  let changedPaths = 0;
  let changedNodes = 0;

  for (const setting of settings) {
    scannedSettings += 1;
    if (!setting.key.startsWith(AI_PATHS_CONFIG_PREFIX)) continue;

    const pathId = setting.key.slice(AI_PATHS_CONFIG_PREFIX.length);
    if (options.pathId && options.pathId !== pathId) continue;
    scannedPathConfigs += 1;

    const parsed = parsePathConfig(setting.value);
    if (!parsed) {
      issues.push({
        key: setting.key,
        reason: 'Invalid or unsupported path config payload.',
      });
      continue;
    }

    const pathName = typeof parsed.name === 'string' ? parsed.name : null;
    const rewritten = rewritePathConfigDatabaseUpdateContract(parsed);
    if (rewritten.issues.length > 0) {
      nodeIssues.push(
        ...rewritten.issues.map((entry: DatabaseUpdateContractNodeIssue): PathNodeIssue => ({
          ...entry,
          pathId,
          pathName,
        }))
      );
    }

    if (!rewritten.changed) continue;

    changedPaths += 1;
    changedNodes += rewritten.updates.length;
    changedPathIds.push(pathId);
    changedNodeUpdates.push(
      ...rewritten.updates.map((entry: DatabaseUpdateContractNodeUpdate): PathNodeUpdate => ({
        ...entry,
        pathId,
        pathName,
      }))
    );
    updates.push({
      key: setting.key,
      value: JSON.stringify(rewritten.config),
    });

    if (options.limit && updates.length >= options.limit) {
      break;
    }
  }

  if (!options.dryRun && updates.length > 0) {
    await upsertMongoAiPathsSettings(updates, AI_PATHS_MONGO_OP_TIMEOUT_MS);
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
        changedNodes,
        updateCount: updates.length,
        changedPathIds,
        changedNodeUpdates,
        nodeIssueCount: nodeIssues.length,
        nodeIssues,
        issues,
      },
      null,
      2
    )
  );
  process.exit(0);
}

void main().catch((error) => {
  console.error('Failed to backfill AI Paths database update contract:', error);
  process.exit(1);
});
