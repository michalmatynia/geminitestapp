import { getDb } from '@/lib/mongodb';
import {
  HOME_CONTENT_DEFAULTS,
  normalizeHomeContent,
  validateHomeContent,
  type HomeContent,
} from '@/data/homeContent';
import {
  SITE_CONTENT_DEFAULTS,
  normalizeSiteContent,
  validateSiteContent,
  type SiteContent,
} from '@/data/siteContent';
import {
  ABOUT_CONTENT_DEFAULTS,
  normalizeAboutContent,
  validateAboutContent,
  type AboutContent,
} from '@/data/aboutContent';
import {
  VALUES_CONTENT_DEFAULTS,
  normalizeValuesContent,
  validateValuesContent,
  type ValuesContent,
} from '@/data/valuesContent';
import {
  STORIES_PAGE_CONTENT_DEFAULTS,
  normalizeStoriesPageContent,
  validateStoriesPageContent,
  type StoriesPageContent,
} from '@/data/storiesPageContent';
import {
  LOOKBOOK_PAGE_CONTENT_DEFAULTS,
  normalizeLookbookPageContent,
  validateLookbookPageContent,
  type LookbookPageContent,
} from '@/data/lookbookPageContent';
import {
  CONTACT_CONTENT_DEFAULTS,
  normalizeContactContent,
  validateContactContent,
  type ContactContent,
} from '@/data/contactContent';
import {
  WISHLIST_CONTENT_DEFAULTS,
  normalizeWishlistContent,
  validateWishlistContent,
  type WishlistContent,
} from '@/data/wishlistContent';
import {
  CHECKOUT_CONTENT_DEFAULTS,
  normalizeCheckoutContent,
  validateCheckoutContent,
  type CheckoutContent,
} from '@/data/checkoutContent';
import {
  PRODUCTS_CONTENT_DEFAULTS,
  normalizeProductsContent,
  validateProductsContent,
  type ProductsContent,
} from '@/data/productsContent';
import {
  ACCOUNT_CONTENT_DEFAULTS,
  normalizeAccountContent,
  validateAccountContent,
  type AccountContent,
} from '@/data/accountContent';

const CMS_PAGES_COLLECTION = 'ecom_cms_pages';
const HOME_PAGE_KEY = 'home';
const SITE_PAGE_KEY = 'site';
const ABOUT_PAGE_KEY = 'about';
const VALUES_PAGE_KEY = 'values';
const STORIES_PAGE_KEY = 'stories-page';
const LOOKBOOK_PAGE_KEY = 'lookbook-page';
const CONTACT_PAGE_KEY = 'contact';
const WISHLIST_PAGE_KEY = 'wishlist';
const CHECKOUT_PAGE_KEY = 'checkout';
const PRODUCTS_PAGE_KEY = 'products';
const ACCOUNT_PAGE_KEY = 'account';
const DEFAULT_LOCALE = 'en';

interface CmsPageDoc {
  page: string;
  locale: string;
  content?: unknown;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface HomeCmsSnapshot {
  content: HomeContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface SiteCmsSnapshot {
  content: SiteContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface AboutCmsSnapshot {
  content: AboutContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface ValuesCmsSnapshot {
  content: ValuesContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface StoriesPageCmsSnapshot {
  content: StoriesPageContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface LookbookPageCmsSnapshot {
  content: LookbookPageContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface ContactCmsSnapshot {
  content: ContactContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface WishlistCmsSnapshot {
  content: WishlistContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface CheckoutCmsSnapshot {
  content: CheckoutContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface ProductsCmsSnapshot {
  content: ProductsContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface AccountCmsSnapshot {
  content: AccountContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

function toHomeSnapshot(doc: CmsPageDoc | null): HomeCmsSnapshot {
  return {
    content: normalizeHomeContent(doc?.content ?? HOME_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getHomeContent(): Promise<HomeContent> {
  try {
    const db = await getDb();
    const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
      page: HOME_PAGE_KEY,
      locale: DEFAULT_LOCALE,
    });
    return toHomeSnapshot(doc).content;
  } catch (error) {
    console.error('Failed to load home CMS content, using defaults.', error);
    return HOME_CONTENT_DEFAULTS;
  }
}

export async function getHomeCmsSnapshot(): Promise<HomeCmsSnapshot> {
  const db = await getDb();
  const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
    page: HOME_PAGE_KEY,
    locale: DEFAULT_LOCALE,
  });
  return toHomeSnapshot(doc);
}

export function parseHomeContentUpdate(input: unknown): { content: HomeContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateHomeContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveHomeContent(content: HomeContent, userId: string): Promise<HomeCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: HOME_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: HOME_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toSiteSnapshot(doc: CmsPageDoc | null): SiteCmsSnapshot {
  return {
    content: normalizeSiteContent(doc?.content ?? SITE_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getSiteContent(): Promise<SiteContent> {
  try {
    const db = await getDb();
    const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
      page: SITE_PAGE_KEY,
      locale: DEFAULT_LOCALE,
    });
    return toSiteSnapshot(doc).content;
  } catch (error) {
    console.error('Failed to load site CMS content, using defaults.', error);
    return SITE_CONTENT_DEFAULTS;
  }
}

export async function getSiteCmsSnapshot(): Promise<SiteCmsSnapshot> {
  const db = await getDb();
  const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
    page: SITE_PAGE_KEY,
    locale: DEFAULT_LOCALE,
  });
  return toSiteSnapshot(doc);
}

export function parseSiteContentUpdate(input: unknown): { content: SiteContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateSiteContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveSiteContent(content: SiteContent, userId: string): Promise<SiteCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: SITE_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: SITE_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toAboutSnapshot(doc: CmsPageDoc | null): AboutCmsSnapshot {
  return {
    content: normalizeAboutContent(doc?.content ?? ABOUT_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getAboutContent(): Promise<AboutContent> {
  try {
    const db = await getDb();
    const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
      page: ABOUT_PAGE_KEY,
      locale: DEFAULT_LOCALE,
    });
    return toAboutSnapshot(doc).content;
  } catch (error) {
    console.error('Failed to load about CMS content, using defaults.', error);
    return ABOUT_CONTENT_DEFAULTS;
  }
}

export async function getAboutCmsSnapshot(): Promise<AboutCmsSnapshot> {
  const db = await getDb();
  const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
    page: ABOUT_PAGE_KEY,
    locale: DEFAULT_LOCALE,
  });
  return toAboutSnapshot(doc);
}

export function parseAboutContentUpdate(input: unknown): { content: AboutContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateAboutContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveAboutContent(content: AboutContent, userId: string): Promise<AboutCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: ABOUT_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: ABOUT_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toValuesSnapshot(doc: CmsPageDoc | null): ValuesCmsSnapshot {
  return {
    content: normalizeValuesContent(doc?.content ?? VALUES_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getValuesContent(): Promise<ValuesContent> {
  try {
    const db = await getDb();
    const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
      page: VALUES_PAGE_KEY,
      locale: DEFAULT_LOCALE,
    });
    return toValuesSnapshot(doc).content;
  } catch (error) {
    console.error('Failed to load values CMS content, using defaults.', error);
    return VALUES_CONTENT_DEFAULTS;
  }
}

export async function getValuesCmsSnapshot(): Promise<ValuesCmsSnapshot> {
  const db = await getDb();
  const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
    page: VALUES_PAGE_KEY,
    locale: DEFAULT_LOCALE,
  });
  return toValuesSnapshot(doc);
}

export function parseValuesContentUpdate(input: unknown): { content: ValuesContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateValuesContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveValuesContent(content: ValuesContent, userId: string): Promise<ValuesCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: VALUES_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: VALUES_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toStoriesPageSnapshot(doc: CmsPageDoc | null): StoriesPageCmsSnapshot {
  return {
    content: normalizeStoriesPageContent(doc?.content ?? STORIES_PAGE_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getStoriesPageContent(): Promise<StoriesPageContent> {
  try {
    const db = await getDb();
    const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
      page: STORIES_PAGE_KEY,
      locale: DEFAULT_LOCALE,
    });
    return toStoriesPageSnapshot(doc).content;
  } catch (error) {
    console.error('Failed to load stories page CMS content, using defaults.', error);
    return STORIES_PAGE_CONTENT_DEFAULTS;
  }
}

export async function getStoriesPageCmsSnapshot(): Promise<StoriesPageCmsSnapshot> {
  const db = await getDb();
  const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
    page: STORIES_PAGE_KEY,
    locale: DEFAULT_LOCALE,
  });
  return toStoriesPageSnapshot(doc);
}

export function parseStoriesPageContentUpdate(input: unknown): { content: StoriesPageContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateStoriesPageContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveStoriesPageContent(content: StoriesPageContent, userId: string): Promise<StoriesPageCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: STORIES_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: STORIES_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toLookbookPageSnapshot(doc: CmsPageDoc | null): LookbookPageCmsSnapshot {
  return {
    content: normalizeLookbookPageContent(doc?.content ?? LOOKBOOK_PAGE_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getLookbookPageContent(): Promise<LookbookPageContent> {
  try {
    const db = await getDb();
    const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
      page: LOOKBOOK_PAGE_KEY,
      locale: DEFAULT_LOCALE,
    });
    return toLookbookPageSnapshot(doc).content;
  } catch (error) {
    console.error('Failed to load lookbook page CMS content, using defaults.', error);
    return LOOKBOOK_PAGE_CONTENT_DEFAULTS;
  }
}

export async function getLookbookPageCmsSnapshot(): Promise<LookbookPageCmsSnapshot> {
  const db = await getDb();
  const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
    page: LOOKBOOK_PAGE_KEY,
    locale: DEFAULT_LOCALE,
  });
  return toLookbookPageSnapshot(doc);
}

export function parseLookbookPageContentUpdate(input: unknown): { content: LookbookPageContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateLookbookPageContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveLookbookPageContent(content: LookbookPageContent, userId: string): Promise<LookbookPageCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: LOOKBOOK_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: LOOKBOOK_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toContactSnapshot(doc: CmsPageDoc | null): ContactCmsSnapshot {
  return {
    content: normalizeContactContent(doc?.content ?? CONTACT_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getContactContent(): Promise<ContactContent> {
  try {
    const db = await getDb();
    const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
      page: CONTACT_PAGE_KEY,
      locale: DEFAULT_LOCALE,
    });
    return toContactSnapshot(doc).content;
  } catch (error) {
    console.error('Failed to load contact CMS content, using defaults.', error);
    return CONTACT_CONTENT_DEFAULTS;
  }
}

export async function getContactCmsSnapshot(): Promise<ContactCmsSnapshot> {
  const db = await getDb();
  const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
    page: CONTACT_PAGE_KEY,
    locale: DEFAULT_LOCALE,
  });
  return toContactSnapshot(doc);
}

export function parseContactContentUpdate(input: unknown): { content: ContactContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateContactContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveContactContent(content: ContactContent, userId: string): Promise<ContactCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: CONTACT_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: CONTACT_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toWishlistSnapshot(doc: CmsPageDoc | null): WishlistCmsSnapshot {
  return {
    content: normalizeWishlistContent(doc?.content ?? WISHLIST_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getWishlistContent(): Promise<WishlistContent> {
  try {
    const db = await getDb();
    const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
      page: WISHLIST_PAGE_KEY,
      locale: DEFAULT_LOCALE,
    });
    return toWishlistSnapshot(doc).content;
  } catch (error) {
    console.error('Failed to load wishlist CMS content, using defaults.', error);
    return WISHLIST_CONTENT_DEFAULTS;
  }
}

export async function getWishlistCmsSnapshot(): Promise<WishlistCmsSnapshot> {
  const db = await getDb();
  const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
    page: WISHLIST_PAGE_KEY,
    locale: DEFAULT_LOCALE,
  });
  return toWishlistSnapshot(doc);
}

export function parseWishlistContentUpdate(input: unknown): { content: WishlistContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateWishlistContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveWishlistContent(content: WishlistContent, userId: string): Promise<WishlistCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: WISHLIST_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: WISHLIST_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toCheckoutSnapshot(doc: CmsPageDoc | null): CheckoutCmsSnapshot {
  return {
    content: normalizeCheckoutContent(doc?.content ?? CHECKOUT_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getCheckoutContent(): Promise<CheckoutContent> {
  try {
    const db = await getDb();
    const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
      page: CHECKOUT_PAGE_KEY,
      locale: DEFAULT_LOCALE,
    });
    return toCheckoutSnapshot(doc).content;
  } catch (error) {
    console.error('Failed to load checkout CMS content, using defaults.', error);
    return CHECKOUT_CONTENT_DEFAULTS;
  }
}

export async function getCheckoutCmsSnapshot(): Promise<CheckoutCmsSnapshot> {
  const db = await getDb();
  const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
    page: CHECKOUT_PAGE_KEY,
    locale: DEFAULT_LOCALE,
  });
  return toCheckoutSnapshot(doc);
}

export function parseCheckoutContentUpdate(input: unknown): { content: CheckoutContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateCheckoutContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveCheckoutContent(content: CheckoutContent, userId: string): Promise<CheckoutCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: CHECKOUT_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: CHECKOUT_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toProductsSnapshot(doc: CmsPageDoc | null): ProductsCmsSnapshot {
  return {
    content: normalizeProductsContent(doc?.content ?? PRODUCTS_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getProductsContent(): Promise<ProductsContent> {
  try {
    const db = await getDb();
    const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
      page: PRODUCTS_PAGE_KEY,
      locale: DEFAULT_LOCALE,
    });
    return toProductsSnapshot(doc).content;
  } catch (error) {
    console.error('Failed to load products CMS content, using defaults.', error);
    return PRODUCTS_CONTENT_DEFAULTS;
  }
}

export async function getProductsCmsSnapshot(): Promise<ProductsCmsSnapshot> {
  const db = await getDb();
  const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
    page: PRODUCTS_PAGE_KEY,
    locale: DEFAULT_LOCALE,
  });
  return toProductsSnapshot(doc);
}

export function parseProductsContentUpdate(input: unknown): { content: ProductsContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateProductsContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveProductsContent(content: ProductsContent, userId: string): Promise<ProductsCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: PRODUCTS_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: PRODUCTS_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toAccountSnapshot(doc: CmsPageDoc | null): AccountCmsSnapshot {
  return {
    content: normalizeAccountContent(doc?.content ?? ACCOUNT_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getAccountContent(): Promise<AccountContent> {
  try {
    const db = await getDb();
    const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
      page: ACCOUNT_PAGE_KEY,
      locale: DEFAULT_LOCALE,
    });
    return toAccountSnapshot(doc).content;
  } catch (error) {
    console.error('Failed to load account CMS content, using defaults.', error);
    return ACCOUNT_CONTENT_DEFAULTS;
  }
}

export async function getAccountCmsSnapshot(): Promise<AccountCmsSnapshot> {
  const db = await getDb();
  const doc = await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).findOne({
    page: ACCOUNT_PAGE_KEY,
    locale: DEFAULT_LOCALE,
  });
  return toAccountSnapshot(doc);
}

export function parseAccountContentUpdate(input: unknown): { content: AccountContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateAccountContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveAccountContent(content: AccountContent, userId: string): Promise<AccountCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: ACCOUNT_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: ACCOUNT_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}
