import 'server-only';

import { randomUUID } from 'crypto';

import type { Collection } from 'mongodb';

import {
  PATTERN_CATEGORIES,
  PATTERN_FORMATS,
  PATTERN_LICENSE_IDS,
  PATTERN_MOTIFS,
  type PatternCategory,
  type PatternFormat,
  type PatternLicense,
  type PatternLicenseId,
  type PatternMotif,
  type PatternPreview,
  type PatternProduct,
} from '@/features/patterns/types';
import {
  getPatternsMongoDb,
  resolvePatternsMongoConnectionInfo,
} from '@/features/patterns/server/patterns-mongo-client';

const PATTERNS_COLLECTION = 'patterns';

type PatternDocument = PatternProduct & {
  _id?: unknown;
};

const DEFAULT_LICENSES: Record<PatternLicenseId, PatternLicense> = {
  personal: {
    id: 'personal',
    label: 'Personal',
    price: 29,
    summary: 'Single personal project or private reference archive.',
  },
  studio: {
    id: 'studio',
    label: 'Studio',
    price: 89,
    summary: 'Commercial work for one studio or client.',
  },
  extended: {
    id: 'extended',
    label: 'Extended',
    price: 189,
    summary: 'Reusable product, packaging, and campaign assets.',
  },
};

const DEFAULT_PREVIEW: PatternPreview = {
  motif: 'grid',
  paper: '#f7f0e3',
  ink: '#1f1f1d',
  accent: '#c44f2f',
  density: 6,
};

const DEFAULT_FORMATS: PatternFormat[] = ['SVG', 'PDF'];

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

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const asCategory = (value: unknown): PatternCategory =>
  typeof value === 'string' && PATTERN_CATEGORIES.includes(value as PatternCategory)
    ? (value as PatternCategory)
    : 'editorial';

const asLicenseId = (value: unknown, fallback: PatternLicenseId = 'studio'): PatternLicenseId =>
  typeof value === 'string' && PATTERN_LICENSE_IDS.includes(value as PatternLicenseId)
    ? (value as PatternLicenseId)
    : fallback;

const asMotif = (value: unknown, fallback: PatternMotif = DEFAULT_PREVIEW.motif): PatternMotif =>
  typeof value === 'string' && PATTERN_MOTIFS.includes(value as PatternMotif)
    ? (value as PatternMotif)
    : fallback;

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const normalizeHexColor = (value: unknown, fallback: string): string => {
  const text = asText(value);
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text : fallback;
};

const normalizeFormats = (value: unknown): PatternFormat[] => {
  const formats = Array.isArray(value)
    ? value.filter((item): item is PatternFormat => PATTERN_FORMATS.includes(item as PatternFormat))
    : [];
  const uniqueFormats = Array.from(new Set(formats));
  return uniqueFormats.length > 0 ? uniqueFormats : DEFAULT_FORMATS;
};

const normalizeLicense = (value: unknown, licenseId: PatternLicenseId): PatternLicense => {
  const fallback = DEFAULT_LICENSES[licenseId];
  if (!isRecord(value)) return fallback;
  return {
    id: licenseId,
    label: asText(value.label, fallback.label),
    price: Math.max(0, Math.round(asNumber(value.price, fallback.price))),
    summary: asText(value.summary, fallback.summary),
  };
};

const normalizeLicenses = (value: unknown): PatternLicense[] => {
  const entries = Array.isArray(value) ? value : [];
  const inputById = new Map<PatternLicenseId, unknown>();
  entries.forEach((entry) => {
    if (!isRecord(entry)) return;
    const id = asLicenseId(entry.id, 'studio');
    inputById.set(id, entry);
  });
  return PATTERN_LICENSE_IDS.map((licenseId) => normalizeLicense(inputById.get(licenseId), licenseId));
};

const normalizePreview = (value: unknown): PatternPreview => {
  if (!isRecord(value)) return DEFAULT_PREVIEW;
  return {
    motif: asMotif(value.motif),
    paper: normalizeHexColor(value.paper, DEFAULT_PREVIEW.paper),
    ink: normalizeHexColor(value.ink, DEFAULT_PREVIEW.ink),
    accent: normalizeHexColor(value.accent, DEFAULT_PREVIEW.accent),
    density: Math.max(3, Math.min(10, Math.round(asNumber(value.density, DEFAULT_PREVIEW.density)))),
  };
};

export const createPatternId = (nameOrSlug: string): string => {
  const slug = slugify(nameOrSlug);
  return slug.length > 0 ? `pattern-${slug}` : `pattern-${randomUUID()}`;
};

export const createPatternSlug = (nameOrSlug: string): string => {
  const slug = slugify(nameOrSlug);
  return slug.length > 0 ? slug : `pattern-${randomUUID()}`;
};

export function normalizePatternProduct(input: unknown): PatternProduct | null {
  if (!isRecord(input)) return null;

  const name = asText(input.name, 'Untitled pattern');
  const slug = createPatternSlug(asText(input.slug, name));
  const id = asText(input.id, createPatternId(slug));
  const licenses = normalizeLicenses(input.licenses);
  const defaultLicense = asLicenseId(input.defaultLicense, 'studio');

  if (id.length === 0 || slug.length === 0) return null;

  return {
    id,
    slug,
    name,
    collection: asText(input.collection, 'Pattern archive'),
    edition: asText(input.edition, 'Digital vector repeat'),
    category: asCategory(input.category),
    description: asText(input.description, 'Downloadable vector repeat pattern.'),
    tags: asTextArray(input.tags),
    formats: normalizeFormats(input.formats),
    repeatSize: asText(input.repeatSize, '24 x 24 cm'),
    fileSize: asText(input.fileSize, '4 MB'),
    updatedAt: asText(input.updatedAt, new Date().toISOString()),
    featured: asBoolean(input.featured),
    status: input.status === 'draft' ? 'draft' : 'published',
    preview: normalizePreview(input.preview),
    defaultLicense,
    licenses,
  };
}

async function getPatternsCollection(): Promise<Collection<PatternDocument>> {
  const db = await getPatternsMongoDb();
  return db.collection<PatternDocument>(PATTERNS_COLLECTION);
}

export async function ensurePatternIndexes(): Promise<void> {
  const collection = await getPatternsCollection();
  await Promise.all([
    collection.createIndex({ id: 1 }, { unique: true }),
    collection.createIndex({ slug: 1 }, { unique: true }),
    collection.createIndex({ status: 1, featured: -1, updatedAt: -1 }),
    collection.createIndex({ category: 1 }),
  ]);
}

export async function listPatternProducts(): Promise<PatternProduct[]> {
  await ensurePatternIndexes();
  const collection = await getPatternsCollection();
  const docs = await collection
    .find({}, { projection: { _id: 0 } })
    .sort({ status: -1, featured: -1, updatedAt: -1, name: 1 })
    .toArray();

  return docs
    .map((doc) => normalizePatternProduct(doc))
    .filter((pattern): pattern is PatternProduct => pattern !== null);
}

export async function getPatternProductById(identifier: string): Promise<PatternProduct | null> {
  const normalizedIdentifier = identifier.trim();
  if (normalizedIdentifier.length === 0) return null;

  await ensurePatternIndexes();
  const collection = await getPatternsCollection();
  const doc = await collection.findOne(
    { $or: [{ id: normalizedIdentifier }, { slug: normalizedIdentifier }] },
    { projection: { _id: 0 } }
  );

  return normalizePatternProduct(doc);
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
  const duplicateSlug = await collection.findOne(
    { slug: savedPattern.slug, id: { $ne: savedPattern.id } },
    { projection: { _id: 0, id: 1 } }
  );
  if (duplicateSlug) {
    throw new Error('Another pattern already uses this slug.');
  }

  await collection.updateOne(
    { id: savedPattern.id },
    { $set: savedPattern },
    { upsert: true }
  );

  return savedPattern;
}

export async function deletePatternProduct(identifier: string): Promise<number> {
  const normalizedIdentifier = identifier.trim();
  if (normalizedIdentifier.length === 0) return 0;

  await ensurePatternIndexes();
  const collection = await getPatternsCollection();
  const result = await collection.deleteOne({
    $or: [{ id: normalizedIdentifier }, { slug: normalizedIdentifier }],
  });
  return result.deletedCount;
}

export const getPatternsDatabaseName = (): string => resolvePatternsMongoConnectionInfo().dbName;
