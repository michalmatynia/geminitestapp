/* eslint-disable max-lines */

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

const SCRIPT_FILE_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIRECTORY = path.dirname(SCRIPT_FILE_PATH);
const appRoot = path.resolve(SCRIPT_DIRECTORY, '..');
const repoRoot = path.resolve(appRoot, '../..');

function hasDocumentId(document: { _id?: unknown } | null): document is { _id: unknown } {
  return document?._id !== null && document?._id !== undefined;
}

function statusFor<TDoc>(
  exactDoc: TDoc | null,
  legacyDoc: TDoc | null,
  force: boolean,
): BackfillStatus {
  if (exactDoc !== null) {
    return force ? 'update' : 'exists';
  }
  return legacyDoc !== null ? 'migrate-legacy' : 'create';
}

function willWrite(status: BackfillStatus, force: boolean): boolean {
  if (status === 'exists') return false;
  if (status === 'update') return force;
  return true;
}

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
  --help               Show this help text.
`);
}

function parseArgs(argv: string[]): CliOptions | null {
  const options: CliOptions = {
    apply: false,
    force: false,
    locales: [...SUPPORTED_LOCALES],
    updatedBy: 'ecom-cms-locale-backfill',
  };
  const booleanHandlers: Partial<Record<string, () => void>> = {
    '--apply': () => {
      options.apply = true;
    },
    '--dry-run': () => {
      options.apply = false;
    },
    '--force': () => {
      options.force = true;
    },
  };
  const localArgPrefix = '--locales=';
  const updatedByArgPrefix = '--updated-by=';

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      return null;
    }

    const booleanHandler = booleanHandlers[arg];
    if (booleanHandler) {
      booleanHandler();
      continue;
    }

    if (arg.startsWith(localArgPrefix)) {
      const localeValue = arg.slice(localArgPrefix.length).split(',');
      options.locales = normalizeLocaleList(localeValue, SUPPORTED_LOCALES);
      continue;
    }

    if (arg.startsWith(updatedByArgPrefix)) {
      const updatedBy = arg.slice(updatedByArgPrefix.length).trim();
      if (updatedBy !== '') {
        options.updatedBy = updatedBy;
      }
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

async function backfillPageForLocale(
  collection: Collection<CmsPageDoc>,
  locale: EcomLocale,
  definition: PageBackfillDefinition,
  options: CliOptions,
): Promise<BackfillResult> {
  const exactDoc = await collection.findOne({ page: definition.key, locale });
  const legacyDoc =
    locale === DEFAULT_LOCALE && exactDoc === null
      ? await collection.findOne({ page: definition.key, locale: { $exists: false } })
      : null;
  const status = statusFor(exactDoc, legacyDoc, options.force);
  const willWriteResult = willWrite(status, options.force);
  const result: BackfillResult = {
    area: 'pages',
    key: definition.key,
    locale,
    status,
    willWrite: willWriteResult,
  };

  if (!options.apply || !willWriteResult) return result;

  if (status === 'migrate-legacy' && hasDocumentId(legacyDoc)) {
    await collection.updateOne({ _id: legacyDoc._id }, { $set: { locale: DEFAULT_LOCALE } });
    return result;
  }

  const content = await definition.resolveContent(locale);
  await definition.write(content, locale, options.updatedBy);
  return result;
}

async function backfillPages(
  collection: Collection<CmsPageDoc>,
  options: CliOptions,
): Promise<BackfillResult[]> {
  const localeResults = await Promise.all(
    options.locales.map((locale) =>
      Promise.all(
        PAGE_DEFINITIONS.map((definition) =>
          backfillPageForLocale(collection, locale, definition, options),
        ),
      ),
    ),
  );
  return localeResults.flat();
}

async function backfillCollectionItem<TItem>(
  params: {
    area: 'stories' | 'lookbook';
    collection: Collection<LocalizedContentDoc>;
    locale: EcomLocale;
    force: boolean;
    apply: boolean;
    item: TItem;
    keyField: 'slug' | 'id';
    getKey: (item: TItem) => string;
    saveItem: (item: TItem, locale: EcomLocale) => Promise<void>;
  },
): Promise<BackfillResult> {
  const { area, collection, locale, force, apply, item, keyField, getKey, saveItem } = params;
  const key = getKey(item);
  const exactDoc = await collection.findOne({ [keyField]: key, locale });
  const legacyDoc =
    locale === DEFAULT_LOCALE && exactDoc === null
      ? await collection.findOne({ [keyField]: key, locale: { $exists: false } })
      : null;
  const status = statusFor(exactDoc, legacyDoc, force);
  const willWriteResult = willWrite(status, force);
  const result: BackfillResult = {
    area,
    key,
    locale,
    status,
    willWrite: willWriteResult,
  };

  if (!apply || !willWriteResult) return result;

  if (status === 'migrate-legacy' && hasDocumentId(legacyDoc)) {
    await collection.updateOne({ _id: legacyDoc._id }, { $set: { locale: DEFAULT_LOCALE } });
    return result;
  }

  await saveItem(item, locale);
  return result;
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
  const localeResults = await Promise.all(
    locales.map(async (locale) => {
      const items = await getItems(locale);
      return Promise.all(
        items.map((item) =>
          backfillCollectionItem({
            area,
            collection,
            locale,
            force,
            apply,
            item,
            keyField,
            getKey,
            saveItem,
          }),
        ),
      );
    }),
  );
  return localeResults.flat();
}

function createSummary(results: BackfillResult[]): {
  total: number;
  willWrite: number;
  pages: number;
  stories: number;
  lookbook: number;
} {
  const pages = results.filter((result) => result.area === 'pages' && result.willWrite).length;
  const stories = results.filter((result) => result.area === 'stories' && result.willWrite).length;
  const lookbook = results.filter((result) => result.area === 'lookbook' && result.willWrite).length;
  return {
    total: results.length,
    willWrite: results.filter((result) => result.willWrite).length,
    pages,
    stories,
    lookbook,
  };
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
        getKey: (story) => {
          const slug = (story as { slug?: string }).slug;
          return typeof slug === 'string' ? slug : '';
        },
        keyField: 'slug',
        saveItem: (story, locale) => saveStory(story, locale),
      }),
      backfillCollectionItems({
        area: 'lookbook',
        collection: db.collection<LocalizedContentDoc>('ecom_lookbook'),
        locales: options.locales,
        force: options.force,
        apply: options.apply,
        getItems: getAllLookbookEntries,
        getKey: (entry) => {
          const id = (entry as { id?: string }).id;
          return typeof id === 'string' ? id : '';
        },
        keyField: 'id',
        saveItem: (entry, locale) => saveLookbookEntry(entry, locale),
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
            counts: createSummary(results),
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
