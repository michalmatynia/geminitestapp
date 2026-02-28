import 'dotenv/config';

import { runImageStudioCardLinkBackfill } from '@/shared/lib/ai/image-studio/server/card-link-backfill';

type CliOptions = {
  projectId?: string;
  dryRun: boolean;
  includeHeuristicGenerationLinks: boolean;
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    includeHeuristicGenerationLinks: true,
  };

  argv.forEach((arg) => {
    if (arg === '--write') {
      options.dryRun = false;
      return;
    }
    if (arg === '--no-heuristic') {
      options.includeHeuristicGenerationLinks = false;
      return;
    }
    if (arg.startsWith('--project=')) {
      const value = arg.slice('--project='.length).trim();
      if (value) {
        options.projectId = value.replace(/[^a-zA-Z0-9-_]/g, '_');
      }
    }
  });

  return options;
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const result = await runImageStudioCardLinkBackfill({
    ...(options.projectId ? { projectId: options.projectId } : {}),
    dryRun: options.dryRun,
    includeHeuristicGenerationLinks: options.includeHeuristicGenerationLinks,
  });

  console.log(
    JSON.stringify(
      {
        mode: options.dryRun ? 'dry-run' : 'write',
        projectId: options.projectId ?? 'all',
        projectCount: result.projectCount,
        scannedSlots: result.scannedSlots,
        scannedLinks: result.scannedLinks,
        updatedCards: result.updatedCards,
        slotLinkBackfilled: result.slotLinkBackfilled,
        maskFolderBackfilled: result.maskFolderBackfilled,
        inferredGenerationBackfilled: result.inferredGenerationBackfilled,
        errors: result.projects.flatMap((project) =>
          project.errors.map((error) => ({ projectId: project.projectId, error }))
        ),
      },
      null,
      2
    )
  );
}

void main().catch((error) => {
  console.error('Failed to backfill Image Studio center lineage:', error);
  process.exit(1);
});
