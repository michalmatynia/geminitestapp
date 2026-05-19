import type { Collection } from 'mongodb';
import { DEFAULT_PATTERN_PRODUCTS } from './defaultPatterns';
import { getDb } from './mongodb';
import type {
  PatternCatalogResult,
  PatternCategory,
  PatternFormat,
  PatternLicense,
  PatternLicenseId,
  PatternMotif,
  PatternPreview,
  PatternProduct,
} from './types';
import {
  PATTERN_CATEGORIES,
  PATTERN_FORMATS,
  PATTERN_LICENSE_IDS,
  PATTERN_MOTIFS,
} from './types';

const PATTERNS_COLLECTION = 'patterns';

type PatternDocument = PatternProduct & {
  _id?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asText = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;

const asTextArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => asText(item)).filter((item) => item.length > 0)
    : [];

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const asCategory = (value: unknown): PatternCategory =>
  typeof value === 'string' && PATTERN_CATEGORIES.includes(value as PatternCategory)
    ? (value as PatternCategory)
    : 'editorial';

const asFormats = (value: unknown): PatternFormat[] => {
  const formats = Array.isArray(value)
    ? value.filter((item): item is PatternFormat => PATTERN_FORMATS.includes(item as PatternFormat))
    : [];
  return formats.length > 0 ? formats : ['SVG', 'PDF'];
};

const asLicenseId = (value: unknown): PatternLicenseId =>
  typeof value === 'string' && PATTERN_LICENSE_IDS.includes(value as PatternLicenseId)
    ? (value as PatternLicenseId)
    : 'studio';

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const normalizeLicense = (value: unknown, fallback: PatternLicense): PatternLicense => {
  if (!isRecord(value)) return fallback;
  const id = asLicenseId(value.id);
  return {
    id,
    label: asText(value.label, fallback.label),
    price: Math.max(0, Math.round(asNumber(value.price, fallback.price))),
    summary: asText(value.summary, fallback.summary),
  };
};

const normalizePreview = (value: unknown, fallback: PatternPreview): PatternPreview => {
  if (!isRecord(value)) return fallback;
  const motif = typeof value.motif === 'string' && PATTERN_MOTIFS.includes(value.motif as PatternMotif)
    ? (value.motif as PatternMotif)
    : fallback.motif;

  return {
    motif,
    paper: asText(value.paper, fallback.paper),
    ink: asText(value.ink, fallback.ink),
    accent: asText(value.accent, fallback.accent),
    density: Math.max(3, Math.min(10, Math.round(asNumber(value.density, fallback.density)))),
  };
};

export function normalizePatternProduct(input: unknown, index = 0): PatternProduct | null {
  if (!isRecord(input)) return null;
  const fallback = DEFAULT_PATTERN_PRODUCTS[index % DEFAULT_PATTERN_PRODUCTS.length];
  const id = asText(input.id, fallback.id);
  const slug = asText(input.slug, fallback.slug);
  const licenses = Array.isArray(input.licenses)
    ? input.licenses.map((entry, i) => normalizeLicense(entry, fallback.licenses[i] ?? fallback.licenses[0]))
    : fallback.licenses;

  if (id.length === 0 || slug.length === 0 || licenses.length === 0) return null;

  return {
    id,
    slug,
    name: asText(input.name, fallback.name),
    collection: asText(input.collection, fallback.collection),
    edition: asText(input.edition, fallback.edition),
    category: asCategory(input.category),
    description: asText(input.description, fallback.description),
    tags: asTextArray(input.tags),
    formats: asFormats(input.formats),
    repeatSize: asText(input.repeatSize, fallback.repeatSize),
    fileSize: asText(input.fileSize, fallback.fileSize),
    updatedAt: asText(input.updatedAt, fallback.updatedAt),
    featured: asBoolean(input.featured, fallback.featured),
    status: input.status === 'draft' ? 'draft' : 'published',
    preview: normalizePreview(input.preview, fallback.preview),
    defaultLicense: asLicenseId(input.defaultLicense),
    licenses,
  };
}

async function getPatternsCollection(): Promise<Collection<PatternDocument>> {
  const db = await getDb();
  return db.collection<PatternDocument>(PATTERNS_COLLECTION);
}

export async function ensurePatternIndexes(): Promise<void> {
  const collection = await getPatternsCollection();
  await Promise.all([
    collection.createIndex({ slug: 1 }, { unique: true }),
    collection.createIndex({ status: 1, featured: -1, updatedAt: -1 }),
    collection.createIndex({ category: 1 }),
  ]);
}

export async function getPatternProducts(): Promise<PatternCatalogResult> {
  try {
    await ensurePatternIndexes();
    const collection = await getPatternsCollection();
    const docs = await collection
      .find({ status: 'published' }, { projection: { _id: 0 } })
      .sort({ featured: -1, updatedAt: -1, name: 1 })
      .toArray();
    const patterns = docs
      .map((doc, index) => normalizePatternProduct(doc, index))
      .filter((pattern): pattern is PatternProduct => pattern !== null);

    return { patterns, source: 'mongo' };
  } catch {
    return { patterns: DEFAULT_PATTERN_PRODUCTS, source: 'fallback' };
  }
}

export async function getStudioPatternProducts(): Promise<PatternCatalogResult> {
  try {
    await ensurePatternIndexes();
    const collection = await getPatternsCollection();
    const docs = await collection
      .find({}, { projection: { _id: 0 } })
      .sort({ status: -1, featured: -1, updatedAt: -1, name: 1 })
      .toArray();
    const patterns = docs
      .map((doc, index) => normalizePatternProduct(doc, index))
      .filter((pattern): pattern is PatternProduct => pattern !== null);

    if (patterns.length > 0) return { patterns, source: 'mongo' };
  } catch {
    return { patterns: DEFAULT_PATTERN_PRODUCTS, source: 'fallback' };
  }

  return { patterns: DEFAULT_PATTERN_PRODUCTS, source: 'fallback' };
}

export async function getPatternProductBySlug(
  slug: string
): Promise<{ pattern: PatternProduct; source: PatternCatalogResult['source'] } | null> {
  const normalizedSlug = slug.trim();
  if (normalizedSlug.length === 0) return null;

  try {
    await ensurePatternIndexes();
    const collection = await getPatternsCollection();
    const doc = await collection.findOne(
      { slug: normalizedSlug, status: 'published' },
      { projection: { _id: 0 } }
    );
    const pattern = normalizePatternProduct(doc, 0);
    if (pattern !== null) return { pattern, source: 'mongo' };
    return null;
  } catch {
    const fallback = DEFAULT_PATTERN_PRODUCTS.find((pattern) => pattern.slug === normalizedSlug);
    return fallback ? { pattern: fallback, source: 'fallback' } : null;
  }
}

export async function upsertDefaultPatterns(): Promise<{ matched: number; upserted: number }> {
  await ensurePatternIndexes();
  const collection = await getPatternsCollection();
  const result = await collection.bulkWrite(
    DEFAULT_PATTERN_PRODUCTS.map((pattern) => ({
      updateOne: {
        filter: { slug: pattern.slug },
        update: { $set: pattern },
        upsert: true,
      },
    }))
  );

  return {
    matched: result.matchedCount,
    upserted: result.upsertedCount,
  };
}

export async function savePatternProduct(input: unknown): Promise<PatternProduct> {
  const pattern = normalizePatternProduct(input);
  if (pattern === null) {
    throw new Error('Invalid pattern payload.');
  }

  const now = new Date().toISOString();
  const savedPattern: PatternProduct = {
    ...pattern,
    updatedAt: now,
  };

  await ensurePatternIndexes();
  const collection = await getPatternsCollection();
  await collection.updateOne(
    { id: savedPattern.id },
    { $set: savedPattern },
    { upsert: true }
  );

  return savedPattern;
}

export async function getPatternPricingCatalog(): Promise<PatternProduct[]> {
  const { patterns } = await getPatternProducts();
  return patterns;
}
