/* eslint-disable max-lines, complexity, no-await-in-loop, consistent-return, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-floating-promises, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/consistent-type-assertions */

import 'server-only';

import { createHash, randomUUID } from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import type { Collection } from 'mongodb';

import {
  SOCIAL_ARTICLE_PROMPT_PRESETS_COLLECTION,
  SOCIAL_ARTICLE_SCRAPE_RUNS_COLLECTION,
  SOCIAL_ARTICLE_SOURCE_PRESETS_COLLECTION,
  SOCIAL_ARTICLES_COLLECTION,
  parseSocialArticleAggregatorStore,
  socialArticlePromptPresetSchema,
  socialArticleRecordSchema,
  socialArticleScrapeRunSchema,
  socialArticleSourcePresetSchema,
  type ScrapedSocialArticle,
  type SocialArticleAggregatorStore,
  type SocialArticlePromptPreset,
  type SocialArticleRecord,
  type SocialArticleScrapeRun,
  type SocialArticleSourcePreset,
} from '@/shared/contracts/social-article-aggregator';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

type TimestampedDoc<T extends { createdAt?: string; updatedAt?: string }> = Omit<
  T,
  'createdAt' | 'updatedAt'
> & {
  createdAt: Date;
  updatedAt: Date;
};

type SourcePresetDoc = TimestampedDoc<SocialArticleSourcePreset>;
type PromptPresetDoc = TimestampedDoc<SocialArticlePromptPreset>;
type ScrapeRunDoc = TimestampedDoc<SocialArticleScrapeRun>;
type ArticleDoc = TimestampedDoc<SocialArticleRecord>;

const LOCAL_STORE_FILENAME = 'social_article_aggregator.json';

let indexesEnsured: Promise<void> | null = null;

const hasMongo = (): boolean =>
  typeof process.env['MONGODB_URI'] === 'string' && process.env['MONGODB_URI'].length > 0;

const resolveLocalStorePath = (): string => {
  const customPath = process.env['SOCIAL_ARTICLE_AGGREGATOR_STORE_PATH']?.trim();
  if (!customPath) return path.join(os.tmpdir(), LOCAL_STORE_FILENAME);
  const baseDir = path.extname(customPath) ? path.dirname(customPath) : customPath;
  return path.join(baseDir, LOCAL_STORE_FILENAME);
};

const LOCAL_STORE_PATH = resolveLocalStorePath();

const nowIso = (): string => new Date().toISOString();

const readLocalStore = async (): Promise<SocialArticleAggregatorStore> => {
  try {
    const raw = await fs.readFile(LOCAL_STORE_PATH, 'utf8');
    return parseSocialArticleAggregatorStore(JSON.parse(raw) as unknown);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      ErrorSystem.captureException(error, {
        service: 'social-article-aggregator.repository',
        action: 'readLocalStore',
      });
    }
    return parseSocialArticleAggregatorStore({});
  }
};

const writeLocalStore = async (store: SocialArticleAggregatorStore): Promise<void> => {
  await fs.mkdir(path.dirname(LOCAL_STORE_PATH), { recursive: true });
  await fs.writeFile(LOCAL_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
};

const ensureIndexes = async (): Promise<void> => {
  if (!hasMongo()) return;
  if (indexesEnsured) return indexesEnsured;

  indexesEnsured = (async () => {
    const db = await getMongoDb();
    await Promise.all([
      db
        .collection<SourcePresetDoc>(SOCIAL_ARTICLE_SOURCE_PRESETS_COLLECTION)
        .createIndex({ id: 1 }, { unique: true }),
      db
        .collection<PromptPresetDoc>(SOCIAL_ARTICLE_PROMPT_PRESETS_COLLECTION)
        .createIndex({ id: 1 }, { unique: true }),
      db
        .collection<ScrapeRunDoc>(SOCIAL_ARTICLE_SCRAPE_RUNS_COLLECTION)
        .createIndex({ id: 1 }, { unique: true }),
      db
        .collection<ScrapeRunDoc>(SOCIAL_ARTICLE_SCRAPE_RUNS_COLLECTION)
        .createIndex({ startedAt: -1 }),
      db
        .collection<ArticleDoc>(SOCIAL_ARTICLES_COLLECTION)
        .createIndex({ id: 1 }, { unique: true }),
      db.collection<ArticleDoc>(SOCIAL_ARTICLES_COLLECTION).createIndex({ updatedAt: -1 }),
      db.collection<ArticleDoc>(SOCIAL_ARTICLES_COLLECTION).createIndex({ canonicalUrl: 1 }),
    ]);
  })().catch((error) => {
    ErrorSystem.captureException(error, {
      service: 'social-article-aggregator.repository',
      action: 'ensureIndexes',
    });
    indexesEnsured = null;
    throw error;
  });

  return indexesEnsured;
};

const collection = async <T extends object>(name: string): Promise<Collection<T>> => {
  await ensureIndexes();
  const db = await getMongoDb();
  return db.collection<T>(name);
};

const toIsoDoc = <T extends { createdAt?: string; updatedAt?: string }>(
  doc: TimestampedDoc<T>
): T => ({
  ...doc,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
} as T);

const stripTimestamps = <T extends { createdAt?: string; updatedAt?: string }>(
  value: T
): Omit<T, 'createdAt' | 'updatedAt'> => {
  const { createdAt: ignoredCreatedAt, updatedAt: ignoredUpdatedAt, ...rest } = value;
  void ignoredCreatedAt;
  void ignoredUpdatedAt;
  return rest;
};

const normalizeSourcePreset = (
  preset: SocialArticleSourcePreset
): SocialArticleSourcePreset => socialArticleSourcePresetSchema.parse(preset);

const normalizePromptPreset = (
  preset: SocialArticlePromptPreset
): SocialArticlePromptPreset => socialArticlePromptPresetSchema.parse(preset);

const normalizeScrapeRun = (run: SocialArticleScrapeRun): SocialArticleScrapeRun =>
  socialArticleScrapeRunSchema.parse(run);

const normalizeArticle = (article: SocialArticleRecord): SocialArticleRecord =>
  socialArticleRecordSchema.parse(article);

const upsertLocalArrayItem = <T extends { id: string; createdAt?: string; updatedAt?: string }>(
  items: T[],
  item: T
): T[] => {
  const index = items.findIndex((entry) => entry.id === item.id);
  if (index >= 0) {
    const next = [...items];
    next[index] = item;
    return next;
  }
  return [item, ...items];
};

const deleteLocalArrayItem = <T extends { id: string }>(items: T[], id: string): T | null => {
  const existing = items.find((entry) => entry.id === id) ?? null;
  return existing;
};

const normalizeUrlForId = (value: string): string => {
  try {
    const url = new URL(value);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    return url.toString();
  } catch {
    return value.trim().toLowerCase();
  }
};

export const buildSocialArticleId = (article: Pick<ScrapedSocialArticle, 'canonicalUrl' | 'resolvedUrl'>): string => {
  const source = normalizeUrlForId(article.canonicalUrl?.trim() || article.resolvedUrl);
  return `article_${createHash('sha1').update(source).digest('hex')}`;
};

export async function listSocialArticleSourcePresets(): Promise<SocialArticleSourcePreset[]> {
  if (!hasMongo()) {
    const store = await readLocalStore();
    return [...store.sourcePresets].sort((left, right) =>
      left.name.localeCompare(right.name)
    );
  }
  const docs = await (await collection<SourcePresetDoc>(SOCIAL_ARTICLE_SOURCE_PRESETS_COLLECTION))
    .find({})
    .sort({ name: 1 })
    .toArray();
  return docs.map((doc) => normalizeSourcePreset(toIsoDoc<SocialArticleSourcePreset>(doc)));
}

export async function getSocialArticleSourcePresetsByIds(
  ids: string[]
): Promise<SocialArticleSourcePreset[]> {
  const normalizedIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (normalizedIds.length === 0) return [];
  if (!hasMongo()) {
    const store = await readLocalStore();
    return store.sourcePresets.filter((preset) => normalizedIds.includes(preset.id));
  }
  const docs = await (await collection<SourcePresetDoc>(SOCIAL_ARTICLE_SOURCE_PRESETS_COLLECTION))
    .find({ id: { $in: normalizedIds } })
    .toArray();
  return docs.map((doc) => normalizeSourcePreset(toIsoDoc<SocialArticleSourcePreset>(doc)));
}

export async function upsertSocialArticleSourcePreset(
  input: SocialArticleSourcePreset
): Promise<SocialArticleSourcePreset> {
  const now = nowIso();
  const normalized = normalizeSourcePreset(input);
  if (!hasMongo()) {
    const store = await readLocalStore();
    const existing = store.sourcePresets.find((entry) => entry.id === normalized.id);
    const next = normalizeSourcePreset({
      ...normalized,
      createdAt: existing?.createdAt ?? normalized.createdAt ?? now,
      updatedAt: now,
    });
    store.sourcePresets = upsertLocalArrayItem(store.sourcePresets, next);
    await writeLocalStore(store);
    return next;
  }

  const mongoNow = new Date();
  const result = await (await collection<SourcePresetDoc>(SOCIAL_ARTICLE_SOURCE_PRESETS_COLLECTION))
    .findOneAndUpdate(
      { id: normalized.id },
      {
        $set: { ...stripTimestamps(normalized), updatedAt: mongoNow },
        $setOnInsert: { createdAt: mongoNow },
      },
      { upsert: true, returnDocument: 'after' }
    );
  return normalizeSourcePreset(
    result ? toIsoDoc<SocialArticleSourcePreset>(result) : { ...normalized, updatedAt: now }
  );
}

export async function deleteSocialArticleSourcePreset(
  id: string
): Promise<SocialArticleSourcePreset | null> {
  const normalizedId = id.trim();
  if (!normalizedId) return null;
  if (!hasMongo()) {
    const store = await readLocalStore();
    const existing = deleteLocalArrayItem(store.sourcePresets, normalizedId);
    if (!existing) return null;
    store.sourcePresets = store.sourcePresets.filter((entry) => entry.id !== normalizedId);
    await writeLocalStore(store);
    return existing;
  }
  const result = await (await collection<SourcePresetDoc>(SOCIAL_ARTICLE_SOURCE_PRESETS_COLLECTION))
    .findOneAndDelete({ id: normalizedId });
  return result ? normalizeSourcePreset(toIsoDoc<SocialArticleSourcePreset>(result)) : null;
}

export async function listSocialArticlePromptPresets(): Promise<SocialArticlePromptPreset[]> {
  if (!hasMongo()) {
    const store = await readLocalStore();
    return [...store.promptPresets].sort((left, right) =>
      Number(right.isDefault) - Number(left.isDefault) || left.name.localeCompare(right.name)
    );
  }
  const docs = await (await collection<PromptPresetDoc>(SOCIAL_ARTICLE_PROMPT_PRESETS_COLLECTION))
    .find({})
    .sort({ isDefault: -1, name: 1 })
    .toArray();
  return docs.map((doc) => normalizePromptPreset(toIsoDoc<SocialArticlePromptPreset>(doc)));
}

export async function upsertSocialArticlePromptPreset(
  input: SocialArticlePromptPreset
): Promise<SocialArticlePromptPreset> {
  const now = nowIso();
  const normalized = normalizePromptPreset(input);
  if (!hasMongo()) {
    const store = await readLocalStore();
    const existing = store.promptPresets.find((entry) => entry.id === normalized.id);
    const next = normalizePromptPreset({
      ...normalized,
      createdAt: existing?.createdAt ?? normalized.createdAt ?? now,
      updatedAt: now,
    });
    store.promptPresets = upsertLocalArrayItem(
      normalized.isDefault
        ? store.promptPresets.map((entry) => ({ ...entry, isDefault: false }))
        : store.promptPresets,
      next
    );
    await writeLocalStore(store);
    return next;
  }

  const mongoNow = new Date();
  const presets = await collection<PromptPresetDoc>(SOCIAL_ARTICLE_PROMPT_PRESETS_COLLECTION);
  if (normalized.isDefault) {
    await presets.updateMany({ id: { $ne: normalized.id } }, { $set: { isDefault: false } });
  }
  const result = await presets.findOneAndUpdate(
    { id: normalized.id },
    {
      $set: { ...stripTimestamps(normalized), updatedAt: mongoNow },
      $setOnInsert: { createdAt: mongoNow },
    },
    { upsert: true, returnDocument: 'after' }
  );
  return normalizePromptPreset(
    result ? toIsoDoc<SocialArticlePromptPreset>(result) : { ...normalized, updatedAt: now }
  );
}

export async function deleteSocialArticlePromptPreset(
  id: string
): Promise<SocialArticlePromptPreset | null> {
  const normalizedId = id.trim();
  if (!normalizedId) return null;
  if (!hasMongo()) {
    const store = await readLocalStore();
    const existing = deleteLocalArrayItem(store.promptPresets, normalizedId);
    if (!existing) return null;
    store.promptPresets = store.promptPresets.filter((entry) => entry.id !== normalizedId);
    await writeLocalStore(store);
    return existing;
  }
  const result = await (await collection<PromptPresetDoc>(SOCIAL_ARTICLE_PROMPT_PRESETS_COLLECTION))
    .findOneAndDelete({ id: normalizedId });
  return result ? normalizePromptPreset(toIsoDoc<SocialArticlePromptPreset>(result)) : null;
}

export async function createSocialArticleScrapeRun(
  input: Omit<SocialArticleScrapeRun, 'id' | 'createdAt' | 'updatedAt'>
): Promise<SocialArticleScrapeRun> {
  const run = normalizeScrapeRun({ ...input, id: randomUUID() });
  return upsertSocialArticleScrapeRun(run);
}

export async function getSocialArticleScrapeRunById(
  id: string
): Promise<SocialArticleScrapeRun | null> {
  const normalizedId = id.trim();
  if (!normalizedId) return null;
  if (!hasMongo()) {
    const store = await readLocalStore();
    return store.scrapeRuns.find((run) => run.id === normalizedId) ?? null;
  }
  const doc = await (await collection<ScrapeRunDoc>(SOCIAL_ARTICLE_SCRAPE_RUNS_COLLECTION))
    .findOne({ id: normalizedId });
  return doc ? normalizeScrapeRun(toIsoDoc<SocialArticleScrapeRun>(doc)) : null;
}

export async function upsertSocialArticleScrapeRun(
  input: SocialArticleScrapeRun
): Promise<SocialArticleScrapeRun> {
  const now = nowIso();
  const normalized = normalizeScrapeRun(input);
  if (!hasMongo()) {
    const store = await readLocalStore();
    const existing = store.scrapeRuns.find((entry) => entry.id === normalized.id);
    const next = normalizeScrapeRun({
      ...normalized,
      createdAt: existing?.createdAt ?? normalized.createdAt ?? now,
      updatedAt: now,
    });
    store.scrapeRuns = upsertLocalArrayItem(store.scrapeRuns, next).slice(0, 1000);
    await writeLocalStore(store);
    return next;
  }

  const mongoNow = new Date();
  const result = await (await collection<ScrapeRunDoc>(SOCIAL_ARTICLE_SCRAPE_RUNS_COLLECTION))
    .findOneAndUpdate(
      { id: normalized.id },
      {
        $set: { ...stripTimestamps(normalized), updatedAt: mongoNow },
        $setOnInsert: { createdAt: mongoNow },
      },
      { upsert: true, returnDocument: 'after' }
    );
  return normalizeScrapeRun(
    result ? toIsoDoc<SocialArticleScrapeRun>(result) : { ...normalized, updatedAt: now }
  );
}

export async function listSocialArticlesByIds(
  ids: string[]
): Promise<SocialArticleRecord[]> {
  const normalizedIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (normalizedIds.length === 0) return [];
  if (!hasMongo()) {
    const store = await readLocalStore();
    const byId = new Map(store.articles.map((article) => [article.id, article]));
    return normalizedIds.map((id) => byId.get(id)).filter((item): item is SocialArticleRecord => item !== undefined);
  }
  const docs = await (await collection<ArticleDoc>(SOCIAL_ARTICLES_COLLECTION))
    .find({ id: { $in: normalizedIds } })
    .toArray();
  const articles = docs.map((doc) => normalizeArticle(toIsoDoc<SocialArticleRecord>(doc)));
  const byId = new Map(articles.map((article) => [article.id, article]));
  return normalizedIds.map((id) => byId.get(id)).filter((item): item is SocialArticleRecord => item !== undefined);
}

const toRetainedArticleRecord = (
  article: ScrapedSocialArticle,
  existing: SocialArticleRecord | null,
  runId: string
): SocialArticleRecord => {
  const scrapedAt = nowIso();
  return normalizeArticle({
    ...article,
    id: buildSocialArticleId(article),
    lastScrapeRunId: runId,
    scrapeCount: existing ? existing.scrapeCount + 1 : 1,
    scrapedAt,
    wordCount: article.wordCount,
    createdAt: existing?.createdAt ?? scrapedAt,
    updatedAt: scrapedAt,
  });
};

export async function deleteSocialArticle(id: string): Promise<SocialArticleRecord | null> {
  const normalizedId = id.trim();
  if (!normalizedId) return null;
  if (!hasMongo()) {
    const store = await readLocalStore();
    const existing = store.articles.find((a) => a.id === normalizedId) ?? null;
    if (!existing) return null;
    store.articles = store.articles.filter((a) => a.id !== normalizedId);
    await writeLocalStore(store);
    return existing;
  }
  const result = await (await collection<ArticleDoc>(SOCIAL_ARTICLES_COLLECTION))
    .findOneAndDelete({ id: normalizedId });
  return result ? normalizeArticle(toIsoDoc<SocialArticleRecord>(result)) : null;
}

export async function listSocialArticles(options: {
  limit?: number;
  offset?: number;
  search?: string;
} = {}): Promise<{ articles: SocialArticleRecord[]; total: number }> {
  const limit = Math.min(options.limit ?? 50, 200);
  const offset = options.offset ?? 0;
  const search = options.search?.trim().toLowerCase() ?? '';

  if (!hasMongo()) {
    const store = await readLocalStore();
    const filtered = search
      ? store.articles.filter(
          (a) =>
            a.title.toLowerCase().includes(search) ||
            a.resolvedUrl.toLowerCase().includes(search) ||
            (a.description ?? '').toLowerCase().includes(search)
        )
      : store.articles;
    const sorted = [...filtered].sort((a, b) =>
      (b.scrapedAt ?? '').localeCompare(a.scrapedAt ?? '')
    );
    return { articles: sorted.slice(offset, offset + limit), total: filtered.length };
  }

  const col = await collection<ArticleDoc>(SOCIAL_ARTICLES_COLLECTION);
  const filter = search
    ? { $or: [
        { title: { $regex: search, $options: 'i' } },
        { resolvedUrl: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ] }
    : {};
  const [docs, total] = await Promise.all([
    col.find(filter).sort({ scrapedAt: -1 }).skip(offset).limit(limit).toArray(),
    col.countDocuments(filter),
  ]);
  return {
    articles: docs.map((doc) => normalizeArticle(toIsoDoc<SocialArticleRecord>(doc))),
    total,
  };
}

export async function listSocialArticleScrapeRuns(options: {
  limit?: number;
} = {}): Promise<SocialArticleScrapeRun[]> {
  const limit = Math.min(options.limit ?? 20, 100);
  if (!hasMongo()) {
    const store = await readLocalStore();
    return [...store.scrapeRuns]
      .sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''))
      .slice(0, limit);
  }
  const docs = await (await collection<ScrapeRunDoc>(SOCIAL_ARTICLE_SCRAPE_RUNS_COLLECTION))
    .find({})
    .sort({ startedAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map((doc) => normalizeScrapeRun(toIsoDoc<SocialArticleScrapeRun>(doc)));
}

export async function upsertScrapedSocialArticles(
  input: {
    articles: ScrapedSocialArticle[];
    runId: string;
  }
): Promise<SocialArticleRecord[]> {
  if (input.articles.length === 0) return [];

  if (!hasMongo()) {
    const store = await readLocalStore();
    const retained: SocialArticleRecord[] = [];
    for (const scraped of input.articles) {
      const id = buildSocialArticleId(scraped);
      const existing = store.articles.find((article) => article.id === id) ?? null;
      const next = toRetainedArticleRecord(scraped, existing, input.runId);
      store.articles = upsertLocalArrayItem(store.articles, next);
      retained.push(next);
    }
    await writeLocalStore(store);
    return retained;
  }

  const articlesCollection = await collection<ArticleDoc>(SOCIAL_ARTICLES_COLLECTION);
  const retained: SocialArticleRecord[] = [];
  for (const scraped of input.articles) {
    const id = buildSocialArticleId(scraped);
    const existingDoc = await articlesCollection.findOne({ id });
    const existing = existingDoc
      ? normalizeArticle(toIsoDoc<SocialArticleRecord>(existingDoc))
      : null;
    const next = toRetainedArticleRecord(scraped, existing, input.runId);
    const mongoNow = new Date(next.updatedAt ?? nowIso());
    const result = await articlesCollection.findOneAndUpdate(
      { id: next.id },
      {
        $set: { ...stripTimestamps(next), updatedAt: mongoNow },
        $setOnInsert: { createdAt: existingDoc?.createdAt ?? mongoNow },
      },
      { upsert: true, returnDocument: 'after' }
    );
    retained.push(
      normalizeArticle(
        result ? toIsoDoc<SocialArticleRecord>(result) : next
      )
    );
  }
  return retained;
}
