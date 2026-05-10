import 'server-only';

import type { Db } from 'mongodb';

import {
  DEFAULT_LOCALE,
  ensureCmsPagesIndex,
  getCmsPagesCollection,
  isAllowedHref,
  isRecord,
  readBoolean,
  readText,
  withEcommerceMongoDb,
  withMainAppMongoDb,
  type CmsPageDoc,
} from './ecommerce-pages-cms.shared.server';
import { badRequestError, externalServiceError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { resolveEcommerceMongoSourceConfig } from '@/shared/lib/db/utils/mongo';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const HOME_PAGE_KEY = 'home';
const MAX_EDITORIAL_ARTICLES = 12;

export type EcommercePagesCmsEditorialArticle = {
  id: string;
  tag: string;
  title: string;
  excerpt: string;
  body: string;
  visible: boolean;
  href: string;
};

export type EcommercePagesCmsEditorialArticlesSnapshot = {
  articles: EcommercePagesCmsEditorialArticle[];
  cloudConfigured: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type EcommercePagesCmsEditorialArticlesSaveResult =
  EcommercePagesCmsEditorialArticlesSnapshot & { cloudMirrored: boolean };

const DEFAULT_EDITORIAL_ARTICLES: EcommercePagesCmsEditorialArticle[] = [
  {
    id: 'attack-on-titan-final-collection',
    tag: 'Universe Report',
    title: 'Attack on Titan - The Final Collection',
    excerpt:
      'Survey Corps insignia, crystal-cast pins and wall-break keychains from the most iconic arc in modern anime.',
    body:
      'Survey Corps insignia, crystal-cast pins and wall-break keychains anchor this edit of Attack on Titan collectibles.\n\nThe collection focuses on objects that feel like field notes from the final arc: compact, symbolic, and easy to carry every day.',
    visible: true,
    href: '/lore-drops/attack-on-titan-final-collection',
  },
  {
    id: 'elden-ring-talisman-series',
    tag: 'Gaming Drop',
    title: 'Elden Ring Talisman Series',
    excerpt:
      'Gilded pendants, smithing stone charms and Great Rune keychains - forged for Tarnished who survived the Lands Between.',
    body:
      'The Elden Ring talisman series leans into worn metal, rune geometry, and small relic silhouettes.\n\nIt is built for collectors who want a subtle object from the Lands Between without losing the atmosphere of the source material.',
    visible: true,
    href: '/lore-drops/elden-ring-talisman-series',
  },
  {
    id: 'blade-runner-2049-off-world-edition',
    tag: 'Film Collectible',
    title: 'Blade Runner 2049 - Off-World Edition',
    excerpt:
      'Origami figures, spinner-craft pendants and neon-etched charms inspired by the rain-soaked skylines of New Los Angeles.',
    body:
      'The Off-World Edition pulls from rain, neon, glass, and the quiet iconography of Blade Runner 2049.\n\nEach piece is selected for its ability to read as a collectible first and a reference second.',
    visible: true,
    href: '/lore-drops/blade-runner-2049-off-world-edition',
  },
];

const slugify = (value: string): string => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug.length > 0 ? slug : 'article';
};

const readFallbackText = (value: unknown, fallback: string): string => {
  const text = readText(value);
  return text.length > 0 ? text : fallback;
};

const getArticleHref = (
  record: Record<string, unknown>,
  id: string,
  fallback: EcommercePagesCmsEditorialArticle
): string => {
  const href = readFallbackText(record['href'], `/lore-drops/${id}`);
  if (href.length === 0 || href.startsWith('#')) return `/lore-drops/${id}`;
  if (isAllowedHref(href)) return href;
  return fallback.href;
};

const normalizeEditorialArticle = (
  value: unknown,
  fallback: EcommercePagesCmsEditorialArticle
): EcommercePagesCmsEditorialArticle => {
  const record = isRecord(value) ? value : {};
  const title = readFallbackText(record['title'], fallback.title);
  const id = slugify(readFallbackText(record['id'], title.length > 0 ? title : fallback.id));
  const excerpt = readFallbackText(record['excerpt'], fallback.excerpt);
  return {
    id,
    tag: readFallbackText(record['tag'], fallback.tag),
    title,
    excerpt,
    body: readFallbackText(
      record['body'],
      fallback.body.length > 0 ? fallback.body : excerpt
    ),
    visible: readBoolean(record['visible'], fallback.visible),
    href: getArticleHref(record, id, fallback),
  };
};

const getDefaultEditorialArticle = (index: number): EcommercePagesCmsEditorialArticle =>
  DEFAULT_EDITORIAL_ARTICLES[index] ?? DEFAULT_EDITORIAL_ARTICLES[0];

const getEditorialArticlesFromDoc = (doc: CmsPageDoc | null): EcommercePagesCmsEditorialArticle[] => {
  const editorial = isRecord(doc?.content) && isRecord(doc.content['editorial'])
    ? doc.content['editorial']
    : null;
  const reports = editorial !== null ? editorial['reports'] : null;
  if (!Array.isArray(reports)) return DEFAULT_EDITORIAL_ARTICLES;
  return reports
    .slice(0, MAX_EDITORIAL_ARTICLES)
    .map((article, index) => normalizeEditorialArticle(article, getDefaultEditorialArticle(index)));
};

const toEditorialArticlesSnapshot = (
  doc: CmsPageDoc | null
): Omit<EcommercePagesCmsEditorialArticlesSnapshot, 'cloudConfigured'> => ({
  articles: getEditorialArticlesFromDoc(doc),
  updatedAt: doc?.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null,
  updatedBy: readText(doc?.updatedBy).length > 0 ? readText(doc?.updatedBy) : null,
});

const readEditorialArticlesSnapshotFromDb = async (
  db: Db
): Promise<Omit<EcommercePagesCmsEditorialArticlesSnapshot, 'cloudConfigured'>> => {
  const collection = getCmsPagesCollection(db);
  await ensureCmsPagesIndex(collection);
  const defaultDoc = await collection.findOne({ page: HOME_PAGE_KEY, locale: DEFAULT_LOCALE });
  return toEditorialArticlesSnapshot(defaultDoc);
};

const validateEditorialArticles = (
  articles: EcommercePagesCmsEditorialArticle[]
): EcommercePagesCmsEditorialArticle[] => {
  if (!Array.isArray(articles)) throw badRequestError('Editorial articles must be a list.');
  if (articles.length > MAX_EDITORIAL_ARTICLES) {
    throw badRequestError(`Editorial articles can contain at most ${MAX_EDITORIAL_ARTICLES} articles.`);
  }
  return articles.map((article, index) =>
    normalizeEditorialArticle(article, getDefaultEditorialArticle(index))
  );
};

const saveEditorialArticlesToDb = async (
  db: Db,
  articles: EcommercePagesCmsEditorialArticle[],
  userId: string,
  now: Date
): Promise<Omit<EcommercePagesCmsEditorialArticlesSnapshot, 'cloudConfigured'>> => {
  const collection = getCmsPagesCollection(db);
  await ensureCmsPagesIndex(collection);
  await collection.updateOne(
    { page: HOME_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $setOnInsert: {
        page: HOME_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content: { editorial: { reports: articles } },
        createdAt: now,
      },
    },
    { upsert: true }
  );
  await collection.updateMany(
    { page: HOME_PAGE_KEY },
    { $set: { 'content.editorial.reports': articles, updatedAt: now, updatedBy: userId } }
  );
  const updatedDoc = await collection.findOne({ page: HOME_PAGE_KEY, locale: DEFAULT_LOCALE });
  return { ...toEditorialArticlesSnapshot(updatedDoc), updatedAt: now.toISOString(), updatedBy: userId };
};

const saveEditorialArticlesToLocalAndEcommerce = async (
  articles: EcommercePagesCmsEditorialArticle[],
  userId: string
): Promise<EcommercePagesCmsEditorialArticlesSaveResult> => {
  const now = new Date();
  const localDb = await getMongoDb('local');
  const localSnapshot = await saveEditorialArticlesToDb(localDb, articles, userId, now);
  try {
    await withEcommerceMongoDb('local', (db) => saveEditorialArticlesToDb(db, articles, userId, now));
    await withEcommerceMongoDb('cloud', (db) => saveEditorialArticlesToDb(db, articles, userId, now));
    await withMainAppMongoDb('cloud', (db) => saveEditorialArticlesToDb(db, articles, userId, now));
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'products.pages-cms',
      action: 'mirrorEditorialArticlesToEcommerceDatabases',
    });
    throw externalServiceError(
      'Editorial articles were saved locally but could not be mirrored to the ecommerce databases.',
      { cause: error }
    );
  }
  return { ...localSnapshot, cloudConfigured: true, cloudMirrored: true };
};

export const readEcommercePagesCmsEditorialArticles =
  async (): Promise<EcommercePagesCmsEditorialArticlesSnapshot> => {
    const localDb = await getMongoDb('local');
    const cloudConfig = resolveEcommerceMongoSourceConfig('cloud');
    return {
      ...(await readEditorialArticlesSnapshotFromDb(localDb)),
      cloudConfigured: cloudConfig.configured,
    };
  };

export const saveEcommercePagesCmsEditorialArticles = async (input: {
  articles: EcommercePagesCmsEditorialArticle[];
  userId: string;
}): Promise<EcommercePagesCmsEditorialArticlesSaveResult> => {
  const articles = validateEditorialArticles(input.articles);
  return saveEditorialArticlesToLocalAndEcommerce(articles, input.userId);
};
