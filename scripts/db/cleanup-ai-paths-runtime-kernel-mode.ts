import 'dotenv/config';

import { listAiPathsSettings, upsertAiPathsSettingsBulk } from '@/features/ai/ai-paths/server/settings-store';
import { AI_PATHS_RUNTIME_KERNEL_MODE_KEY } from '@/shared/lib/ai-paths/core/constants';

type CliOptions = {
  dryRun: boolean;
};

type CleanupSummary = {
  mode: 'dry-run' | 'write';
  keyFound: boolean;
  previousValue: string | null;
  normalizedValue: string | null;
  needsUpdate: boolean;
  updated: boolean;
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

const normalizeMode = (value: string | null): string | null => {
  if (value === null) return null;
  return value.trim().toLowerCase();
};

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const settings = await listAiPathsSettings([AI_PATHS_RUNTIME_KERNEL_MODE_KEY]);
  const runtimeModeRecord = settings.find((item) => item.key === AI_PATHS_RUNTIME_KERNEL_MODE_KEY) ?? null;

  const previousValue = runtimeModeRecord?.value ?? null;
  const normalizedValue = normalizeMode(previousValue);
  const needsUpdate = normalizedValue === 'legacy_only';

  if (!options.dryRun && needsUpdate) {
    await upsertAiPathsSettingsBulk([
      {
        key: AI_PATHS_RUNTIME_KERNEL_MODE_KEY,
        value: 'auto',
      },
    ]);
  }

  const summary: CleanupSummary = {
    mode: options.dryRun ? 'dry-run' : 'write',
    keyFound: Boolean(runtimeModeRecord),
    previousValue,
    normalizedValue,
    needsUpdate,
    updated: !options.dryRun && needsUpdate,
  };

  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

void main().catch((error) => {
  console.error('Failed to cleanup AI Paths runtime-kernel mode setting:', error);
  process.exit(1);
});
