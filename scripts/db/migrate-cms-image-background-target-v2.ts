import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '@prisma/client';
import { Pool } from 'pg';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

type CliOptions = {
  dryRun: boolean;
};

type ProviderSummary = {
  provider: 'prisma' | 'mongodb';
  configured: boolean;
  changed: boolean;
  writesApplied: number;
  pagesScanned: number;
  pagesChanged: number;
  componentsScanned: number;
  componentsChanged: number;
  imageBlocksNormalized: number;
  warnings: string[];
  error: string | null;
};

type MigrationSummary = {
  mode: 'dry-run' | 'write';
  providers: ProviderSummary[];
};

type UnknownRecord = Record<string, unknown>;

type NormalizeResult<T> = {
  value: T;
  changed: boolean;
  imageBlocksNormalized: number;
};

type PageComponentLike = {
  type?: unknown;
  order?: unknown;
  content?: unknown;
};

type MongoPageDoc = {
  id: string;
  components?: PageComponentLike[];
};

const PAGES_COLLECTION = 'cms_pages';

const parseCliOptions = (argv: string[]): CliOptions => {
  const write = argv.some((arg: string) => arg === '--write' || arg === '--apply');
  return { dryRun: !write };
};

const asRecord = (value: unknown): UnknownRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as UnknownRecord;
};

const normalizeBlock = (rawBlock: unknown): NormalizeResult<unknown> => {
  const block = asRecord(rawBlock);
  if (!block) {
    return { value: rawBlock, changed: false, imageBlocksNormalized: 0 };
  }

  let changed = false;
  let imageBlocksNormalized = 0;
  let nextBlock: UnknownRecord = block;

  const type = typeof block['type'] === 'string' ? block['type'] : null;
  const settings = asRecord(block['settings']);
  if (settings) {
    const nextSettings = { ...settings };
    let settingsChanged = false;
    if (Object.prototype.hasOwnProperty.call(nextSettings, 'backgroundTarget')) {
      delete nextSettings['backgroundTarget'];
      settingsChanged = true;
    }
    if (Object.prototype.hasOwnProperty.call(nextSettings, 'backgroundMode')) {
      delete nextSettings['backgroundMode'];
      settingsChanged = true;
    }
    if (settingsChanged) {
      changed = true;
      if (type === 'ImageElement') {
        imageBlocksNormalized += 1;
      }
      nextBlock = { ...nextBlock, settings: nextSettings };
    }
  }

  const childBlocks = block['blocks'];
  if (Array.isArray(childBlocks)) {
    const normalizedChildren = childBlocks.map(normalizeBlock);
    const childChanged = normalizedChildren.some((child) => child.changed);
    if (childChanged) {
      changed = true;
      nextBlock = {
        ...nextBlock,
        blocks: normalizedChildren.map((child) => child.value),
      };
    }
    imageBlocksNormalized += normalizedChildren.reduce(
      (sum, child) => sum + child.imageBlocksNormalized,
      0
    );
  }

  return {
    value: changed ? nextBlock : rawBlock,
    changed,
    imageBlocksNormalized,
  };
};

const normalizeComponentContent = (rawContent: unknown): NormalizeResult<unknown> => {
  const content = asRecord(rawContent);
  if (!content) {
    return { value: rawContent, changed: false, imageBlocksNormalized: 0 };
  }

  const rawBlocks = content['blocks'];
  if (!Array.isArray(rawBlocks)) {
    return { value: rawContent, changed: false, imageBlocksNormalized: 0 };
  }

  const normalizedBlocks = rawBlocks.map(normalizeBlock);
  const changed = normalizedBlocks.some((block) => block.changed);
  const imageBlocksNormalized = normalizedBlocks.reduce(
    (sum, block) => sum + block.imageBlocksNormalized,
    0
  );

  if (!changed) {
    return { value: rawContent, changed: false, imageBlocksNormalized };
  }

  return {
    value: {
      ...content,
      blocks: normalizedBlocks.map((block) => block.value),
    },
    changed: true,
    imageBlocksNormalized,
  };
};

const migratePrisma = async (options: CliOptions): Promise<ProviderSummary> => {
  if (!process.env['DATABASE_URL']) {
    return {
      provider: 'prisma',
      configured: false,
      changed: false,
      writesApplied: 0,
      pagesScanned: 0,
      pagesChanged: 0,
      componentsScanned: 0,
      componentsChanged: 0,
      imageBlocksNormalized: 0,
      warnings: ['DATABASE_URL is not configured.'],
      error: null,
    };
  }

  let pool: Pool | null = null;
  let prisma: PrismaClient | null = null;

  try {
    pool = new Pool({
      connectionString: process.env['DATABASE_URL'],
    });
    prisma = new PrismaClient({
      adapter: new PrismaPg(pool),
    });

    const components = await prisma.pageComponent.findMany({
      select: {
        id: true,
        pageId: true,
        content: true,
      },
    });

    const pageIdsWithChanges = new Set<string>();
    let componentsChanged = 0;
    let imageBlocksNormalized = 0;
    const componentUpdates: Array<{ id: string; content: Prisma.InputJsonValue }> = [];

    components.forEach((component) => {
      const normalizedContent = normalizeComponentContent(component.content);
      imageBlocksNormalized += normalizedContent.imageBlocksNormalized;
      if (!normalizedContent.changed) return;
      componentsChanged += 1;
      pageIdsWithChanges.add(component.pageId);
      componentUpdates.push({
        id: component.id,
        content: normalizedContent.value as Prisma.InputJsonValue,
      });
    });

    let writesApplied = 0;
    if (!options.dryRun) {
      for (const update of componentUpdates) {
        await prisma.pageComponent.update({
          where: { id: update.id },
          data: { content: update.content },
        });
        writesApplied += 1;
      }
    }

    return {
      provider: 'prisma',
      configured: true,
      changed: componentsChanged > 0,
      writesApplied,
      pagesScanned: new Set(components.map((component) => component.pageId)).size,
      pagesChanged: pageIdsWithChanges.size,
      componentsScanned: components.length,
      componentsChanged,
      imageBlocksNormalized,
      warnings: [],
      error: null,
    };
  } catch (error) {
    return {
      provider: 'prisma',
      configured: true,
      changed: false,
      writesApplied: 0,
      pagesScanned: 0,
      pagesChanged: 0,
      componentsScanned: 0,
      componentsChanged: 0,
      imageBlocksNormalized: 0,
      warnings: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (prisma) {
      await prisma.$disconnect().catch(() => {});
    }
    if (pool) {
      await pool.end().catch(() => {});
    }
  }
};

const migrateMongo = async (options: CliOptions): Promise<ProviderSummary> => {
  if (!process.env['MONGODB_URI']) {
    return {
      provider: 'mongodb',
      configured: false,
      changed: false,
      writesApplied: 0,
      pagesScanned: 0,
      pagesChanged: 0,
      componentsScanned: 0,
      componentsChanged: 0,
      imageBlocksNormalized: 0,
      warnings: ['MONGODB_URI is not configured.'],
      error: null,
    };
  }

  try {
    const db = await getMongoDb();
    const pages = await db
      .collection<MongoPageDoc>(PAGES_COLLECTION)
      .find({}, { projection: { id: 1, components: 1 } })
      .toArray();

    let pagesChanged = 0;
    let componentsScanned = 0;
    let componentsChanged = 0;
    let imageBlocksNormalized = 0;
    let writesApplied = 0;

    for (const page of pages) {
      const components = Array.isArray(page.components) ? page.components : [];
      componentsScanned += components.length;

      let pageChanged = false;
      const nextComponents = components.map((component) => {
        const normalizedContent = normalizeComponentContent(component.content);
        imageBlocksNormalized += normalizedContent.imageBlocksNormalized;
        if (!normalizedContent.changed) return component;
        pageChanged = true;
        componentsChanged += 1;
        return {
          ...component,
          content: normalizedContent.value,
        };
      });

      if (!pageChanged) continue;
      pagesChanged += 1;

      if (!options.dryRun) {
        const update = await db.collection<MongoPageDoc>(PAGES_COLLECTION).updateOne(
          { id: page.id },
          {
            $set: {
              components: nextComponents,
              updatedAt: new Date(),
            },
          }
        );
        if (update.modifiedCount > 0) {
          writesApplied += 1;
        }
      }
    }

    return {
      provider: 'mongodb',
      configured: true,
      changed: pagesChanged > 0,
      writesApplied,
      pagesScanned: pages.length,
      pagesChanged,
      componentsScanned,
      componentsChanged,
      imageBlocksNormalized,
      warnings: [],
      error: null,
    };
  } catch (error) {
    return {
      provider: 'mongodb',
      configured: true,
      changed: false,
      writesApplied: 0,
      pagesScanned: 0,
      pagesChanged: 0,
      componentsScanned: 0,
      componentsChanged: 0,
      imageBlocksNormalized: 0,
      warnings: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const run = async (): Promise<void> => {
  const options = parseCliOptions(process.argv.slice(2));

  const providers = await Promise.all([migratePrisma(options), migrateMongo(options)]);
  const summary: MigrationSummary = {
    mode: options.dryRun ? 'dry-run' : 'write',
    providers,
  };

  console.log('[migrate-cms-image-background-target-v2] Summary');
  console.log(JSON.stringify(summary, null, 2));

  const hasError = providers.some((provider) => provider.error);
  if (hasError) process.exitCode = 1;
};

void run();

