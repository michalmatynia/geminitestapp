import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import type { Collection } from 'mongodb';
import {
  getAboutContent,
  getAccountContent,
  getCheckoutContent,
  getContactContent,
  getHomeContent,
  getLookbookPageContent,
  getProductsContent,
  getSiteContent,
  getStoriesPageContent,
  getValuesContent,
  getWishlistContent,
  saveAboutContent,
  saveAccountContent,
  saveCheckoutContent,
  saveContactContent,
  saveHomeContent,
  saveLookbookPageContent,
  saveProductsContent,
  saveSiteContent,
  saveStoriesPageContent,
  saveValuesContent,
  saveWishlistContent,
} from '../src/lib/cms';
import { getAllLookbookEntries, saveLookbookEntry } from '../src/lib/lookbookCms';
import { getAllStories, saveStory } from '../src/lib/storiesCms';
import { DEFAULT_LOCALE, normalizeLocaleList, SUPPORTED_LOCALES, type EcomLocale } from '../src/lib/locales';
import { closeMongoClients, getDb } from '../src/lib/mongodb';

type CliOptions = {
  apply: boolean;
  force: boolean;
  locales: EcomLocale[];
  updatedBy: string;
};

type BackfillStatus = 'exists' | 'create' | 'migrate-legacy' | 'update';

type BackfillResult = {
  area: 'pages' | 'stories' | 'lookbook';
  key: string;
  locale: EcomLocale;
  status: BackfillStatus;
  willWrite: boolean;
};

type CmsPageDoc = {
  _id?: unknown;
  page: string;
  locale?: string | null;
  content?: unknown;
};

type LocalizedContentDoc = {
  _id?: unknown;
  locale?: string | null;
};

type PageBackfillDefinition = {
  key: string;
  resolveContent: (locale: EcomLocale) => Promise<unknown>;
  write: (content: unknown, locale: EcomLocale, updatedBy: string) => Promise<unknown>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appRoot, '../..');

function loadEnvFiles(): void {
  for (const envPath of [
    path.join(repoRoot, '.env'),
    path.join(repoRoot, '.env.local'),
    path.join(appRoot, '.env'),
    path.join(appRoot, '.env.local'),
  ]) {
    if (existsSync(envPath)) {
      loadDotenv({ path: envPath, override: false });
    }
  }
}

function printHelp(): void {
  process.stdout.write(`Usage: npm run cms:locales:backfill --workspace @app/ecom-web -- [options]

Backfills ecommerce CMS locale documents for page content, stories, and lookbook entries.

Options:
  --apply              Write changes. Without this flag the script only reports a dry run.
  --dry-run            Force dry-run mode.
  --force              Update existing localized records from the computed source content.
  --locales=en,pl      Comma-separated locales to process. Defaults to all supported locales.
  --updated-by=value   Metadata user id for new page CMS saves. Defaults to ecom-cms-locale-backfill.
  --help              Show this help text.
`);
}

function parseArgs(argv: string[]): CliOptions | null {
  const options: CliOptions = {
    apply: false,
    force: false,
    locales: [...SUPPORTED_LOCALES],
    updatedBy: 'ecom-cms-locale-backfill',
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') return null;
    if (arg === '--apply') {
      options.apply = true;
      continue;
    }
    if (arg === '--dry-run') {
      options.apply = false;
      continue;
    }
    if (arg === '--force') {
      options.force = true;
      continue;
    }
    if (arg.startsWith('--locales=')) {
      options.locales = normalizeLocaleList(arg.slice('--locales='.length).split(','), SUPPORTED_LOCALES);
      continue;
    }
    if (arg.startsWith('--updated-by=')) {
      const updatedBy = arg.slice('--updated-by='.length).trim();
      if (updatedBy) options.updatedBy = updatedBy;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function definePage<TContent>(
  key: string,
  resolveContent: (locale?: EcomLocale) => Promise<TContent>,
  saveContent: (content: TContent, updatedBy: string, locale?: EcomLocale) => Promise<unknown>,
): PageBackfillDefinition {
  return {
    key,
    resolveContent: (locale) => resolveContent(locale),
    write: (content, locale, updatedBy) => saveContent(content as TContent, updatedBy, locale),
  };
}

const PAGE_DEFINITIONS: PageBackfillDefinition[] = [
  definePage('home', getHomeContent, saveHomeContent),
  definePage('site', getSiteContent, saveSiteContent),
  definePage('about', getAboutContent, saveAboutContent),
  definePage('values', getValuesContent, saveValuesContent),
  definePage('stories-page', getStoriesPageContent, saveStoriesPageContent),
  definePage('lookbook-page', getLookbookPageContent, saveLookbookPageContent),
  definePage('contact', getContactContent, saveContactContent),
  definePage('wishlist', getWishlistContent, saveWishlistContent),
  definePage('checkout', getCheckoutContent, saveCheckoutContent),
  definePage('products', getProductsContent, saveProductsContent),
  definePage('account', getAccountContent, saveAccountContent),
];

function statusFor(exactDoc: unknown, legacyDoc: unknown, force: boolean): BackfillStatus {
  if (exactDoc) return force ? 'update' : 'exists';
  return legacyDoc ? 'migrate-legacy' : 'create';
}

function shouldWrite(status: BackfillStatus, options: CliOptions): boolean {
  if (status === 'exists') return false;
  if (status === 'update') return options.force;
  return true;
}

async function backfillPages(
  collection: Collection<CmsPageDoc>,
  options: CliOptions,
): Promise<BackfillResult[]> {
  const results: BackfillResult[] = [];

  for (const locale of options.locales) {
    for (const definition of PAGE_DEFINITIONS) {
      const exactDoc = await collection.findOne({ page: definition.key, locale });
      const legacyDoc = locale === DEFAULT_LOCALE && !exactDoc
        ? await collection.findOne({ page: definition.key, locale: { $exists: false } })
        : null;
      const status = statusFor(exactDoc, legacyDoc, options.force);
      const willWrite = shouldWrite(status, options);

      results.push({
        area: 'pages',
        key: definition.key,
        locale,
        status,
        willWrite,
      });

      if (!options.apply || !willWrite) continue;

      if (status === 'migrate-legacy' && legacyDoc?._id) {
        await collection.updateOne(
          { _id: legacyDoc._id },
          { $set: { locale: DEFAULT_LOCALE } },
        );
        continue;
      }

      const content = await definition.resolveContent(locale);
      await definition.write(content, locale, options.updatedBy);
    }
  }

  return results;
}

async function backfillCollectionItems<TItem extends object>({
  area,
  collection,
  locales,
  force,
  apply,
  getItems,
  getKey,
  keyField,
  saveItem,
}: {
  area: 'stories' | 'lookbook';
  collection: Collection<LocalizedContentDoc>;
  locales: EcomLocale[];
  force: boolean;
  apply: boolean;
  getItems: (locale: EcomLocale) => Promise<TItem[]>;
  getKey: (item: TItem) => string;
  keyField: 'slug' | 'id';
  saveItem: (item: TItem, locale: EcomLocale) => Promise<void>;
}): Promise<BackfillResult[]> {
  const results: BackfillResult[] = [];

  for (const locale of locales) {
    const items = await getItems(locale);

    for (const item of items) {
      const key = getKey(item);
      const exactDoc = await collection.findOne({ [keyField]: key, locale });
      const legacyDoc = locale === DEFAULT_LOCALE && !exactDoc
        ? await collection.findOne({ [keyField]: key, locale: { $exists: false } })
        : null;
      const status = statusFor(exactDoc, legacyDoc, force);
      const willWrite = status === 'exists' ? false : status === 'update' ? force : true;

      results.push({
        area,
        key,
        locale,
        status,
        willWrite,
      });

      if (!apply || !willWrite) continue;

      if (status === 'migrate-legacy' && legacyDoc?._id) {
        await collection.updateOne({ _id: legacyDoc._id }, { $set: { locale: DEFAULT_LOCALE } });
        continue;
      }

      await saveItem(item, locale);
    }
  }

  return results;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (!options) {
    printHelp();
    return;
  }

  loadEnvFiles();

  const db = await getDb();
  try {
    const [pages, stories, lookbook] = await Promise.all([
      backfillPages(db.collection<CmsPageDoc>('ecom_cms_pages'), options),
      backfillCollectionItems({
        area: 'stories',
        collection: db.collection<LocalizedContentDoc>('ecom_stories'),
        locales: options.locales,
        force: options.force,
        apply: options.apply,
        getItems: getAllStories,
        getKey: (story) => String(story['slug'] ?? ''),
        keyField: 'slug',
        saveItem: (story, locale) => saveStory(story as Parameters<typeof saveStory>[0], locale),
      }),
      backfillCollectionItems({
        area: 'lookbook',
        collection: db.collection<LocalizedContentDoc>('ecom_lookbook'),
        locales: options.locales,
        force: options.force,
        apply: options.apply,
        getItems: getAllLookbookEntries,
        getKey: (entry) => String(entry['id'] ?? ''),
        keyField: 'id',
        saveItem: (entry, locale) => saveLookbookEntry(entry as Parameters<typeof saveLookbookEntry>[0], locale),
      }),
    ]);

    const results = [...pages, ...stories, ...lookbook];
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          apply: options.apply,
          force: options.force,
          locales: options.locales,
          counts: {
            total: results.length,
            willWrite: results.filter((result) => result.willWrite).length,
            pages: pages.filter((result) => result.willWrite).length,
            stories: stories.filter((result) => result.willWrite).length,
            lookbook: lookbook.filter((result) => result.willWrite).length,
          },
          results,
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await closeMongoClients();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ ok: false, message })}\n`);
  process.exitCode = 1;
});
