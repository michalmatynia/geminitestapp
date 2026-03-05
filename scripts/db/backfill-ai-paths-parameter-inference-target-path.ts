import 'dotenv/config';

import {
  listAiPathsSettings,
  upsertAiPathsSettingsBulk,
} from '@/features/ai/ai-paths/server/settings-store';
import type { PathConfig } from '@/shared/contracts/ai-paths';

import {
  rewritePathConfigParameterInferenceTargetPaths,
  type ParameterInferenceTargetPathNodeIssue,
  type ParameterInferenceTargetPathNodeUpdate,
} from './lib/ai-paths-parameter-inference-target-path';

type CliOptions = {
  dryRun: boolean;
  pathId: string | null;
  limit: number | null;
};

type BackfillIssue = {
  key: string;
  reason: string;
};

type UnknownTargetPathIssue = ParameterInferenceTargetPathNodeIssue & {
  pathId: string;
  pathName: string | null;
};

type PathNodeUpdate = ParameterInferenceTargetPathNodeUpdate & {
  pathId: string;
  pathName: string | null;
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
  const settings = await listAiPathsSettings();

  const updates: Array<{ key: string; value: string }> = [];
  const changedPathIds: string[] = [];
  const changedNodeUpdates: PathNodeUpdate[] = [];
  const unknownTargetPathIssues: UnknownTargetPathIssue[] = [];
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
    const rewritten = rewritePathConfigParameterInferenceTargetPaths(parsed);
    if (rewritten.issues.length > 0) {
      unknownTargetPathIssues.push(
        ...rewritten.issues.map((entry: ParameterInferenceTargetPathNodeIssue): UnknownTargetPathIssue => ({
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
      ...rewritten.updates.map((entry: ParameterInferenceTargetPathNodeUpdate): PathNodeUpdate => ({
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
        changedNodes,
        updateCount: updates.length,
        changedPathIds,
        changedNodeUpdates,
        unknownTargetPathIssueCount: unknownTargetPathIssues.length,
        unknownTargetPathIssues,
        issues,
      },
      null,
      2
    )
  );
  process.exit(0);
}

void main().catch((error) => {
  console.error('Failed to backfill AI Paths parameter inference target path:', error);
  process.exit(1);
});
