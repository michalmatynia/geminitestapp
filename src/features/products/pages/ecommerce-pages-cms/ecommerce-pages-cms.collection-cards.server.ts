import 'server-only';

import type { Db } from 'mongodb';

import {
  DEFAULT_LOCALE,
  ensureCmsPagesIndex,
  getCmsPagesCollection,
  isAllowedHref,
  isRecord,
  makeStoredFilename,
  readBoolean,
  readStringList,
  readText,
  validateImageFile,
  withEcommerceMongoDb,
  withMainAppMongoDb,
  writeLocalImageFile,
  type CmsPageDoc,
} from './ecommerce-pages-cms.shared.server';
import { badRequestError, externalServiceError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { resolveEcommerceMongoSourceConfig } from '@/shared/lib/db/utils/mongo';
import { uploadBufferToFastComet } from '@/shared/lib/files/services/storage/file-storage-service';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const HOME_PAGE_KEY = 'home';
const MAX_COLLECTION_CARD_IMAGE_BYTES = 5 * 1024 * 1024;
const COLLECTION_CARD_PUBLIC_DIR = '/uploads/cms/stargater/collection-cards';
const COLLECTION_CARD_FASTCOMET_FOLDER = 'stargater/collection-cards';

export type EcommercePagesCmsCollectionCardSelectorType = 'all' | 'category' | 'theme' | 'custom';

export type EcommercePagesCmsCollectionCard = {
  id: string;
  label: string;
  sublabel: string;
  tag: string;
  visible: boolean;
  href: string;
  imageUrl: string;
  selectorType: EcommercePagesCmsCollectionCardSelectorType;
  selectorValues: string[];
  fallbackCount: number;
};

export type EcommercePagesCmsCollectionCardsSnapshot = {
  cards: EcommercePagesCmsCollectionCard[];
  cloudConfigured: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type EcommercePagesCmsCollectionCardImageUploadResult = {
  filename: string;
  localPublicPath: string;
  mimetype: string;
  remoteUrl: string;
  size: number;
};

export type EcommercePagesCmsCollectionCardsSaveResult =
  EcommercePagesCmsCollectionCardsSnapshot & { cloudMirrored: boolean };

const COLLECTION_CARD_DEFAULT_FALLBACK: EcommercePagesCmsCollectionCard = {
  id: 'objects',
  label: 'All Items',
  sublabel: 'Keychains · Pins · Charms',
  tag: 'Full Catalog',
  visible: true,
  href: '/products',
  imageUrl: '',
  selectorType: 'all',
  selectorValues: [],
  fallbackCount: 1800,
};

const DEFAULT_COLLECTION_CARDS: EcommercePagesCmsCollectionCard[] = [
  COLLECTION_CARD_DEFAULT_FALLBACK,
  {
    id: 'womenswear',
    label: 'Anime',
    sublabel: 'Pins · Keychains · Jewellery',
    tag: 'New Season',
    visible: true,
    href: '/products?categories=Anime%20Ring,Anime%20Keychain',
    imageUrl: '',
    selectorType: 'category',
    selectorValues: ['Anime Ring', 'Anime Keychain'],
    fallbackCount: 640,
  },
  {
    id: 'menswear',
    label: 'Gaming',
    sublabel: 'RPG · FPS · Strategy Drops',
    tag: 'Hot Drops',
    visible: true,
    href: '/products?themes=Elden%20Ring,Warhammer%2040k',
    imageUrl: '',
    selectorType: 'theme',
    selectorValues: ['Elden Ring', 'Warhammer 40k'],
    fallbackCount: 520,
  },
  {
    id: 'accessories',
    label: 'Film & TV',
    sublabel: 'Cinema · Series · Icons',
    tag: 'Collector',
    visible: true,
    href: '/products?categories=Film%20Collectibles',
    imageUrl: '',
    selectorType: 'category',
    selectorValues: ['Film Collectibles'],
    fallbackCount: 380,
  },
];

const normalizeSelectorType = (value: unknown): EcommercePagesCmsCollectionCardSelectorType => {
  const normalized = readText(value).toLowerCase();
  if (normalized === 'all' || normalized === 'category') return normalized;
  if (normalized === 'theme' || normalized === 'custom') return normalized;
  return 'custom';
};

const readFallbackCount = (
  value: unknown,
  fallback: EcommercePagesCmsCollectionCard
): number => {
  const rawValue = typeof value === 'number' ? value : Number(readText(value));
  return Number.isFinite(rawValue) ? Math.max(0, Math.trunc(rawValue)) : fallback.fallbackCount;
};

const readFallbackText = (
  value: unknown,
  fallback: string
): string => {
  const text = readText(value);
  return text.length > 0 ? text : fallback;
};

const normalizeCollectionCard = (
  value: unknown,
  fallback: EcommercePagesCmsCollectionCard
): EcommercePagesCmsCollectionCard => {
  const record = isRecord(value) ? value : {};
  const href = readFallbackText(record['href'], fallback.href);
  const imageUrl = readText(record['imageUrl']);
  const selectorValues = readStringList(record['selectorValues']).slice(0, 24);
  return {
    id: readFallbackText(record['id'], fallback.id),
    label: readFallbackText(record['label'], fallback.label),
    sublabel: readFallbackText(record['sublabel'], fallback.sublabel),
    tag: readFallbackText(record['tag'], fallback.tag),
    visible: readBoolean(record['visible'], fallback.visible),
    href: isAllowedHref(href) ? href : fallback.href,
    imageUrl: isAllowedHref(imageUrl) ? imageUrl : '',
    selectorType: normalizeSelectorType(record['selectorType'] ?? fallback.selectorType),
    selectorValues: selectorValues.length > 0 ? selectorValues : fallback.selectorValues,
    fallbackCount: readFallbackCount(record['fallbackCount'], fallback),
  };
};

const getDefaultCollectionCard = (index: number): EcommercePagesCmsCollectionCard =>
  DEFAULT_COLLECTION_CARDS[index] ?? COLLECTION_CARD_DEFAULT_FALLBACK;

const getCollectionCardsFromDoc = (doc: CmsPageDoc | null): EcommercePagesCmsCollectionCard[] => {
  const categories = isRecord(doc?.content) && isRecord(doc.content['categories'])
    ? doc.content['categories']
    : null;
  const cards = categories !== null ? categories['cards'] : null;
  if (!Array.isArray(cards)) return DEFAULT_COLLECTION_CARDS;
  return cards
    .slice(0, 8)
    .map((card, index) => normalizeCollectionCard(card, getDefaultCollectionCard(index)));
};

const toCollectionCardsSnapshot = (
  doc: CmsPageDoc | null
): Omit<EcommercePagesCmsCollectionCardsSnapshot, 'cloudConfigured'> => ({
  cards: getCollectionCardsFromDoc(doc),
  updatedAt: doc?.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null,
  updatedBy: readText(doc?.updatedBy).length > 0 ? readText(doc?.updatedBy) : null,
});

const readCollectionCardsSnapshotFromDb = async (
  db: Db
): Promise<Omit<EcommercePagesCmsCollectionCardsSnapshot, 'cloudConfigured'>> => {
  const collection = getCmsPagesCollection(db);
  await ensureCmsPagesIndex(collection);
  const defaultDoc = await collection.findOne({ page: HOME_PAGE_KEY, locale: DEFAULT_LOCALE });
  return toCollectionCardsSnapshot(defaultDoc);
};

const validateCollectionCards = (
  cards: EcommercePagesCmsCollectionCard[]
): EcommercePagesCmsCollectionCard[] => {
  if (!Array.isArray(cards)) throw badRequestError('Collection cards must be a list.');
  if (cards.length > 8) throw badRequestError('Collection cards can contain at most 8 cards.');
  const normalized = cards.map((card, index) =>
    normalizeCollectionCard(card, getDefaultCollectionCard(index))
  );
  if (normalized.length === 0) throw badRequestError('At least one collection card is required.');
  return normalized;
};

const saveCollectionCardsToDb = async (
  db: Db,
  cards: EcommercePagesCmsCollectionCard[],
  userId: string,
  now: Date
): Promise<Omit<EcommercePagesCmsCollectionCardsSnapshot, 'cloudConfigured'>> => {
  const collection = getCmsPagesCollection(db);
  await ensureCmsPagesIndex(collection);
  await collection.updateOne(
    { page: HOME_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $setOnInsert: {
        page: HOME_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content: { categories: { cards } },
        createdAt: now,
      },
    },
    { upsert: true }
  );
  await collection.updateMany(
    { page: HOME_PAGE_KEY },
    { $set: { 'content.categories.cards': cards, updatedAt: now, updatedBy: userId } }
  );
  const updatedDoc = await collection.findOne({ page: HOME_PAGE_KEY, locale: DEFAULT_LOCALE });
  return { ...toCollectionCardsSnapshot(updatedDoc), updatedAt: now.toISOString(), updatedBy: userId };
};

const saveCollectionCardsToLocalAndEcommerce = async (
  cards: EcommercePagesCmsCollectionCard[],
  userId: string
): Promise<EcommercePagesCmsCollectionCardsSaveResult> => {
  const now = new Date();
  const localDb = await getMongoDb('local');
  const localSnapshot = await saveCollectionCardsToDb(localDb, cards, userId, now);
  try {
    await withEcommerceMongoDb('local', (db) => saveCollectionCardsToDb(db, cards, userId, now));
    await withEcommerceMongoDb('cloud', (db) => saveCollectionCardsToDb(db, cards, userId, now));
    await withMainAppMongoDb('cloud', (db) => saveCollectionCardsToDb(db, cards, userId, now));
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'products.pages-cms',
      action: 'mirrorCollectionCardsToEcommerceDatabases',
    });
    throw externalServiceError(
      'Collection cards were saved locally but could not be mirrored to the ecommerce databases.',
      { cause: error }
    );
  }
  return { ...localSnapshot, cloudConfigured: true, cloudMirrored: true };
};

export const readEcommercePagesCmsCollectionCards =
  async (): Promise<EcommercePagesCmsCollectionCardsSnapshot> => {
    const localDb = await getMongoDb('local');
    const cloudConfig = resolveEcommerceMongoSourceConfig('cloud');
    return {
      ...(await readCollectionCardsSnapshotFromDb(localDb)),
      cloudConfigured: cloudConfig.configured,
    };
  };

export const saveEcommercePagesCmsCollectionCards = async (input: {
  cards: EcommercePagesCmsCollectionCard[];
  userId: string;
}): Promise<EcommercePagesCmsCollectionCardsSaveResult> => {
  const cards = validateCollectionCards(input.cards);
  return saveCollectionCardsToLocalAndEcommerce(cards, input.userId);
};

export const uploadEcommercePagesCmsCollectionCardImage = async (input: {
  file: File;
}): Promise<EcommercePagesCmsCollectionCardImageUploadResult> => {
  const mimetype = validateImageFile(input.file, {
    emptyMessage: 'Collection card image is empty.',
    maxBytes: MAX_COLLECTION_CARD_IMAGE_BYTES,
    maxMessage: 'Collection card image must be 5 MB or smaller.',
    typeMessage: 'Collection card image must be PNG, JPG, WebP, GIF, or SVG.',
  });
  const filename = makeStoredFilename(input.file, mimetype, 'collection-card');
  const localPublicPath = `${COLLECTION_CARD_PUBLIC_DIR}/${filename}`;
  const buffer = Buffer.from(await input.file.arrayBuffer());

  await writeLocalImageFile({ buffer, publicPath: localPublicPath });
  const remoteUrl = await uploadBufferToFastComet({
    buffer,
    category: 'cms',
    filename,
    folder: COLLECTION_CARD_FASTCOMET_FOLDER,
    mimetype,
    publicPath: localPublicPath,
  });
  return { filename, localPublicPath, mimetype, remoteUrl, size: input.file.size };
};
