import 'dotenv/config';

import {
  deleteAiPathsSettings,
  listAiPathsSettings,
  upsertAiPathsSettingsBulk,
} from '@/features/ai/ai-paths/server/settings-store';
import { PATH_INDEX_KEY } from '@/shared/lib/ai-paths/core/constants';

const LEGACY_PATH_INDEX_KEY = 'ai_paths_index_v1';

type CliOptions = {
  dryRun: boolean;
  overwriteCanonical: boolean;
};

type CanonicalUpdateMode = 'none' | 'set_from_legacy' | 'overwrite_from_legacy';

type CleanupSummary = {
  mode: 'dry-run' | 'write';
  legacyFound: boolean;
  canonicalFound: boolean;
  legacyLength: number;
  canonicalLength: number;
  canonicalUpdateMode: CanonicalUpdateMode;
  canonicalUpdated: boolean;
  legacyDeleted: boolean;
  warning: string | null;
};

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    overwriteCanonical: false,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--write') {
      options.dryRun = false;
      return;
    }
    if (arg === '--overwrite-canonical') {
      options.overwriteCanonical = true;
    }
  });

  return options;
};

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const settings = await listAiPathsSettings([PATH_INDEX_KEY, LEGACY_PATH_INDEX_KEY]);
  const canonicalRecord = settings.find((item) => item.key === PATH_INDEX_KEY) ?? null;
  const legacyRecord = settings.find((item) => item.key === LEGACY_PATH_INDEX_KEY) ?? null;

  const canonicalLength = canonicalRecord?.value.length ?? 0;
  const legacyLength = legacyRecord?.value.length ?? 0;
  let warning: string | null = null;
  let canonicalUpdateMode: CanonicalUpdateMode = 'none';

  const legacyTrimmed = legacyRecord?.value.trim() ?? '';
  const canonicalTrimmed = canonicalRecord?.value.trim() ?? '';
  const canonicalMissingOrEmpty = !canonicalRecord || canonicalTrimmed.length === 0;
  const legacyHasUsablePayload = legacyTrimmed.length > 0;

  if (legacyRecord && legacyHasUsablePayload) {
    if (canonicalMissingOrEmpty) {
      canonicalUpdateMode = 'set_from_legacy';
    } else if (options.overwriteCanonical && canonicalRecord.value !== legacyRecord.value) {
      canonicalUpdateMode = 'overwrite_from_legacy';
    } else if (canonicalRecord.value !== legacyRecord.value) {
      warning =
        'Canonical and legacy indexes differ; keeping canonical value. Use --overwrite-canonical to replace.';
    }
  } else if (legacyRecord && !legacyHasUsablePayload && canonicalMissingOrEmpty) {
    warning = 'Legacy index key exists but payload is empty; canonical index was not backfilled.';
  }

  if (!options.dryRun) {
    if (legacyRecord && canonicalUpdateMode !== 'none') {
      await upsertAiPathsSettingsBulk([
        {
          key: PATH_INDEX_KEY,
          value: legacyRecord.value,
        },
      ]);
    }
    if (legacyRecord) {
      await deleteAiPathsSettings([LEGACY_PATH_INDEX_KEY]);
    }
  }

  const summary: CleanupSummary = {
    mode: options.dryRun ? 'dry-run' : 'write',
    legacyFound: Boolean(legacyRecord),
    canonicalFound: Boolean(canonicalRecord),
    legacyLength,
    canonicalLength,
    canonicalUpdateMode,
    canonicalUpdated: !options.dryRun && canonicalUpdateMode !== 'none' && Boolean(legacyRecord),
    legacyDeleted: !options.dryRun && Boolean(legacyRecord),
    warning,
  };

  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

void main().catch((error) => {
  console.error('Failed to cleanup legacy AI Paths index key:', error);
  process.exit(1);
});
