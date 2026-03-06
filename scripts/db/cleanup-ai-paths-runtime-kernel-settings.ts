import 'dotenv/config';

import { pathToFileURL } from 'node:url';

import {
  listAiPathsSettings,
  upsertAiPathsSettingsBulk,
} from '@/features/ai/ai-paths/server/settings-store';
import { runMaintenanceAction } from '@/features/ai/ai-paths/server/settings-store.maintenance';
import type { AiPathsSettingRecord } from '@/features/ai/ai-paths/server/settings-store.constants';
import { normalizeHistoricalRuntimeStateCompatibilityHistoryField } from './ai-paths-runtime-compatibility-normalization';

const ACTION_ID = 'normalize_runtime_kernel_settings' as const;

type CliOptions = {
  dryRun: boolean;
};

export type CleanupSummary = {
  mode: 'dry-run' | 'write';
  actionId: typeof ACTION_ID;
  affectedRecords: number;
  deletedKeys: string[];
  updated: boolean;
  changedKeys: string[];
};

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
  };
  argv.forEach((arg: string): void => {
    if (arg === '--write') {
      options.dryRun = false;
    }
  });
  return options;
};

const collectChangedKeys = (
  previousRecords: AiPathsSettingRecord[],
  nextRecords: AiPathsSettingRecord[],
  deletedKeys: string[]
): string[] => {
  const previousByKey = new Map<string, string>(
    previousRecords.map((record) => [record.key, record.value])
  );
  return Array.from(
    new Set(
      nextRecords
        .filter((record) => previousByKey.get(record.key) !== record.value)
        .map((record) => record.key)
        .concat(deletedKeys)
    )
  ).sort((left, right) => left.localeCompare(right));
};

const normalizePathConfigRuntimeStateHistory = (
  records: AiPathsSettingRecord[]
): AiPathsSettingRecord[] =>
  records.map((record) => {
    if (!record.key.startsWith('ai_paths_config_')) return record;
    try {
      const parsed = JSON.parse(record.value) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return record;
      const config = parsed as Record<string, unknown>;
      const normalizedRuntimeState = normalizeHistoricalRuntimeStateCompatibilityHistoryField(
        config['runtimeState']
      );
      if (!normalizedRuntimeState.changed) return record;
      return {
        ...record,
        value: JSON.stringify({
          ...config,
          runtimeState: normalizedRuntimeState.value,
        }),
      };
    } catch {
      return record;
    }
  });

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseCliOptions(argv);
  const records = await listAiPathsSettings();
  const result = runMaintenanceAction({
    actionId: ACTION_ID,
    records,
  });
  const nextRecords = normalizePathConfigRuntimeStateHistory(result.nextRecords);
  const changedKeys = collectChangedKeys(records, nextRecords, result.deletedKeys);
  const affectedRecords = changedKeys.length;

  if (!options.dryRun && affectedRecords > 0) {
    await upsertAiPathsSettingsBulk(nextRecords);
  }

  const summary: CleanupSummary = {
    mode: options.dryRun ? 'dry-run' : 'write',
    actionId: ACTION_ID,
    affectedRecords,
    deletedKeys: result.deletedKeys,
    updated: !options.dryRun && affectedRecords > 0,
    changedKeys,
  };

  console.log(JSON.stringify(summary, null, 2));
}

const isEntrypoint =
  typeof process.argv[1] === 'string' &&
  process.argv[1].length > 0 &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  void main().catch((error) => {
    console.error('Failed to cleanup AI Paths runtime-kernel settings:', error);
    process.exit(1);
  });
}
