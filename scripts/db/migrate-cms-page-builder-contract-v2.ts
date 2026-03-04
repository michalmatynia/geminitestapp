import 'dotenv/config';

import {
  emptyCmsPageBuilderComponentMigrationStats,
  mergeCmsPageBuilderComponentMigrationStats,
  migrateCmsPageBuilderComponents,
  type CmsPageBuilderComponentMigrationStats,
} from '@/features/cms/migrations/page-builder-contract-migration';
import { getCmsRepository, getCmsRepositoryProvider } from '@/features/cms/services/cms-repository';
import type { PageComponent } from '@/shared/contracts/cms';
import { getAppDbProvider, type AppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoClient } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

type CliOptions = {
  dryRun: boolean;
  pageIds: Set<string>;
  limit: number | null;
};

type PageReport = {
  pageId: string;
  pageName: string;
  componentsScanned: number;
  componentsChanged: number;
  missingSectionIds: number;
  normalizedZones: number;
  normalizedParents: number;
  normalizedSettings: number;
  normalizedBlocks: number;
  prunedLegacyKeys: number;
  normalizedOrder: number;
};

type MigrationSummary = {
  mode: 'dry-run' | 'write';
  provider: AppDbProvider;
  scannedPages: number;
  changedPages: number;
  unchangedPages: number;
  writesApplied: number;
  stats: CmsPageBuilderComponentMigrationStats;
  reports: PageReport[];
};

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    pageIds: new Set<string>(),
    limit: null,
  };

  for (const arg of argv) {
    if (arg === '--write') {
      options.dryRun = false;
      continue;
    }
    if (arg.startsWith('--pages=')) {
      const values = arg
        .slice('--pages='.length)
        .split(',')
        .map((value: string): string => value.trim())
        .filter((value: string): boolean => value.length > 0);
      values.forEach((value: string): void => {
        options.pageIds.add(value);
      });
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number(arg.slice('--limit='.length).trim());
      if (Number.isFinite(parsed) && parsed > 0) {
        options.limit = Math.floor(parsed);
      }
    }
  }

  return options;
};

const closeResources = async (): Promise<void> => {
  await prisma.$disconnect().catch(() => {});
  if (process.env['MONGODB_URI']) {
    const mongoClient = await getMongoClient().catch(() => null);
    await mongoClient?.close().catch(() => {});
  }
};

const resolveProvider = async (): Promise<AppDbProvider> => {
  const repoProvider = getCmsRepositoryProvider();
  if (repoProvider === 'mongodb' || repoProvider === 'prisma') return repoProvider;
  const fallback = await getAppDbProvider();
  if (fallback === 'mongodb' || fallback === 'prisma') return fallback;
  throw new Error(`Unsupported CMS provider "${fallback}"`);
};

const run = async (): Promise<MigrationSummary> => {
  const options = parseCliOptions(process.argv.slice(2));
  const repository = await getCmsRepository();
  const provider = await resolveProvider();
  const pages = await repository.getPages();

  const selectedPages = pages.filter((page) => {
    if (options.pageIds.size === 0) return true;
    return options.pageIds.has(page.id);
  });
  const scopedPages = options.limit ? selectedPages.slice(0, options.limit) : selectedPages;

  let writesApplied = 0;
  let changedPages = 0;
  let unchangedPages = 0;
  let aggregateStats = emptyCmsPageBuilderComponentMigrationStats();
  const reports: PageReport[] = [];

  for (const page of scopedPages) {
    const sourceComponents = page.components.map(
      (component, index): PageComponent =>
        ({
          id: `legacy-component-${page.id}-${index}`,
          type: component.type,
          order: component.order,
          content: component.content,
          pageId: page.id,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt ?? page.createdAt,
        }) as PageComponent
    );

    const result = migrateCmsPageBuilderComponents(sourceComponents);
    aggregateStats = mergeCmsPageBuilderComponentMigrationStats(aggregateStats, result.stats);

    if (!result.changed) {
      unchangedPages += 1;
      continue;
    }

    changedPages += 1;
    reports.push({
      pageId: page.id,
      pageName: page.name,
      componentsScanned: result.stats.componentsScanned,
      componentsChanged: result.stats.componentsChanged,
      missingSectionIds: result.stats.missingSectionIds,
      normalizedZones: result.stats.normalizedZones,
      normalizedParents: result.stats.normalizedParents,
      normalizedSettings: result.stats.normalizedSettings,
      normalizedBlocks: result.stats.normalizedBlocks,
      prunedLegacyKeys: result.stats.prunedLegacyKeys,
      normalizedOrder: result.stats.normalizedOrder,
    });

    if (!options.dryRun) {
      await repository.replacePageComponents(page.id, result.components);
      writesApplied += 1;
    }
  }

  return {
    mode: options.dryRun ? 'dry-run' : 'write',
    provider,
    scannedPages: scopedPages.length,
    changedPages,
    unchangedPages,
    writesApplied,
    stats: aggregateStats,
    reports,
  };
};

void run()
  .then((summary: MigrationSummary) => {
    console.log(JSON.stringify(summary, null, 2));
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ ok: false, error: message }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeResources();
  });
