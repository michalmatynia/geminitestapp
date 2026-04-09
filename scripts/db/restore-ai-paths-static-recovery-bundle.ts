import 'dotenv/config';

import { pathToFileURL } from 'node:url';

import {
  listAiPathsSettings,
  upsertAiPathsSettingsBulk,
} from '@/features/ai/ai-paths/server/settings-store';
import { runMaintenanceAction } from '@/features/ai/ai-paths/server/settings-store.maintenance';
import type { AiPathsSettingRecord } from '@/features/ai/ai-paths/server/settings-store.constants';

const ACTION_ID = 'restore_static_recovery_bundle' as const;

type CliOptions = {
  dryRun: boolean;
};

export type RestoreSummary = {
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

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseCliOptions(argv);
  const records = await listAiPathsSettings();
  const result = runMaintenanceAction({
    actionId: ACTION_ID,
    records,
  });
  const changedKeys = collectChangedKeys(records, result.nextRecords, result.deletedKeys);
  const affectedRecords = changedKeys.length;

  if (!options.dryRun && affectedRecords > 0) {
    await upsertAiPathsSettingsBulk(result.nextRecords);
  }

  const summary: RestoreSummary = {
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
    console.error('Failed to restore AI Paths static recovery bundle:', error);
    process.exit(1);
  });
}
