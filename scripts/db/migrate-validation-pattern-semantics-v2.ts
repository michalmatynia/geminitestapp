import 'dotenv/config';

import { migrateProductValidationPatternSemanticsToLatest } from '@/shared/lib/products/services/validation-pattern-semantic-migration';

type CliOptions = {
  dryRun: boolean;
  limit: number | null;
  patternId: string | null;
};

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    limit: null,
    patternId: null,
  };

  for (const arg of argv) {
    if (arg === '--write') {
      options.dryRun = false;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.limit = parsed;
      }
      continue;
    }
    if (arg.startsWith('--pattern=')) {
      const raw = arg.slice('--pattern='.length).trim();
      options.patternId = raw.length > 0 ? raw : null;
    }
  }

  return options;
};

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const summary = await migrateProductValidationPatternSemanticsToLatest({
    dryRun: options.dryRun,
    limit: options.limit,
    patternId: options.patternId,
  });

  console.log(JSON.stringify(summary, null, 2));
}

void main().catch((error) => {
  console.error('Failed to migrate validation pattern semantics to v2:', error);
  process.exit(1);
});
