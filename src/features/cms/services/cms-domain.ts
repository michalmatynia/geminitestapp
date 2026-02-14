import 'server-only';

import { randomUUID } from 'crypto';

import { getCmsDomainSettings } from '@/features/cms/services/cms-domain-settings';
import { getCmsDataProvider } from '@/features/cms/services/cms-provider';
import type { CmsDomain, Slug } from '@/features/cms/types';
import type { CmsRepository } from '@/features/cms/types/services/cms-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import type { NextRequest } from 'next/server';

type CmsDomainRecord = {
  id: string;
  name?: string;
  domain: string;
  aliasOf?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CmsDomainResponse = CmsDomain;

type CmsDomainSlugLink = {
  domainId: string;
  slugId: string;
  isDefault?: boolean;
  assignedAt: Date;
  updatedAt?: Date;
};

const DOMAIN_COLLECTION = 'cms_domains';
const DOMAIN_SLUGS_COLLECTION = 'cms_domain_slugs';
const SLUGS_COLLECTION = 'cms_slugs';

type SlugDocument = {
  id: string;
  isDefault?: boolean;
  updatedAt?: Date;
};

const getFallbackDomain = (): string => {
  const url =
    process.env['NEXT_PUBLIC_APP_URL'] ||
    process.env['NEXTAUTH_URL'] ||
    'http://localhost';
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return 'default';
  }
};

const buildDefaultDomain = (hostHeader: string | null): CmsDomain => ({
  id: 'default-domain',
  name: 'Default domain',
  domain: normalizeHost(hostHeader),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const normalizeHost = (hostHeader: string | null): string => {
  if (!hostHeader) return getFallbackDomain();
  const raw = hostHeader.split(',')[0]?.trim() ?? '';
  if (!raw) return getFallbackDomain();
  try {
    return new URL(`http://${raw}`).hostname.toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
};

const getHostFromRequest = (req: NextRequest): string | null =>
  req.headers.get('x-forwarded-host') ?? req.headers.get('host');

const getHostFromHeaders = (
  headers:
    | Headers
    | { get?: (key: string) => string | null }
    | Record<string, unknown>
    | null
    | undefined
): string | null => {
  if (!headers) return null;
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get('x-forwarded-host') ?? (headers as Headers).get('host');
  }
  if (typeof headers === 'object') {
    const record = headers as Record<string, unknown>;
    const forwarded =
      record['x-forwarded-host'] ??
      record['X-Forwarded-Host'] ??
      record['host'] ??
      record['Host'];
    if (typeof forwarded === 'string') return forwarded;
  }
  return null;
};

const canUsePrismaSlugs = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'slug' in prisma;

export async function isDomainZoningEnabled(): Promise<boolean> {
  if (!process.env['MONGODB_URI']) return false;
  const settings = await getCmsDomainSettings();
  return settings.zoningEnabled;
}

export async function setGlobalDefaultSlug(slugId: string | null): Promise<void> {
  const provider = await getCmsDataProvider();
  if (provider === 'mongodb') {
    if (!process.env['MONGODB_URI']) return;
    const db = await getMongoDb();
    const now = new Date();
    await (db.collection<SlugDocument>(SLUGS_COLLECTION)).updateMany(
      {},
      { $set: { isDefault: false, updatedAt: now } }
    );
    if (!slugId) return;
    await db.collection<SlugDocument>(SLUGS_COLLECTION).updateOne(
      { id: slugId },
      { $set: { isDefault: true, updatedAt: now } }
    );
    return;
  }
  if (!canUsePrismaSlugs()) return;
  await prisma.slug.updateMany({ data: { isDefault: false } });
  if (!slugId) return;
  try {
    await prisma.slug.update({ where: { id: slugId }, data: { isDefault: true } });
  } catch {
    // Ignore missing slug
  }
}

export async function resolveCmsDomainFromRequest(req: NextRequest): Promise<CmsDomain> {
  const host = getHostFromRequest(req);
  return resolveCmsDomainByHost(host);
}

export async function resolveCmsDomainFromHeaders(
  headers:
    | Headers
    | Promise<Headers>
    | { get?: (key: string) => string | null }
    | Record<string, unknown>
    | null
    | undefined
): Promise<CmsDomain> {
  const resolved = await Promise.resolve(headers);
  if (typeof resolved === 'function') {
    return resolveCmsDomainByHost(null);
  }
  const host = getHostFromHeaders(resolved);
  return resolveCmsDomainByHost(host);
}

const getDomainRecordById = async (domainId: string): Promise<CmsDomainRecord | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const db = await getMongoDb();
  return db
    .collection<CmsDomainRecord>(DOMAIN_COLLECTION)
    .findOne({ id: domainId });
};

export async function resolveCmsDomainScopeById(domainId: string): Promise<CmsDomain | null> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) {
    return buildDefaultDomain(null);
  }
  let current = await getDomainRecordById(domainId);
  if (!current) return null;
  const visited = new Set<string>([current.id]);
  while (current.aliasOf) {
    if (visited.has(current.aliasOf)) break;
    const next = await getDomainRecordById(current.aliasOf);
    if (!next) break;
    visited.add(next.id);
    current = next;
  }
  return toDomainResponse(current);
}

export async function resolveCmsDomainByHost(hostHeader: string | null): Promise<CmsDomain> {
  const domain = normalizeHost(hostHeader);
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) {
    return buildDefaultDomain(hostHeader);
  }

  const db = await getMongoDb();
  const existing = await db
    .collection<CmsDomainRecord>(DOMAIN_COLLECTION)
    .findOne({ domain });
  if (existing) {
    const scoped = await resolveCmsDomainScopeById(existing.id);
    return scoped ?? toDomainResponse(existing);
  }

  const now = new Date();
  const doc: CmsDomainRecord = {
    id: randomUUID(),
    name: domain,
    domain,
    aliasOf: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<CmsDomainRecord>(DOMAIN_COLLECTION).insertOne(doc);
  return toDomainResponse(doc);
}

export async function getCmsDomainById(domainId: string): Promise<CmsDomain | null> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) {
    return buildDefaultDomain(null);
  }
  const doc = await getDomainRecordById(domainId);
  return doc ? toDomainResponse(doc) : null;
}

export async function getDomainSlugLinks(domainId: string): Promise<CmsDomainSlugLink[]> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) return [];
  const db = await getMongoDb();
  return db
    .collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION)
    .find({ domainId })
    .toArray();
}

export async function getDomainIdsForSlug(slugId: string): Promise<string[]> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) return [];
  const db = await getMongoDb();
  const links = await db
    .collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION)
    .find({ slugId })
    .toArray();
  const ids = links.map((link: CmsDomainSlugLink) => link.domainId);
  return Array.from(new Set(ids));
}

const toDomainResponse = (doc: CmsDomainRecord): CmsDomainResponse => ({
  id: doc.id,
  name: doc.name ?? doc.domain,
  domain: doc.domain,
  aliasOf: doc.aliasOf ?? null,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
});

export async function listCmsDomains(): Promise<CmsDomainResponse[]> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) return [];
  const db = await getMongoDb();
  const docs = await db
    .collection<CmsDomainRecord>(DOMAIN_COLLECTION)
    .find()
    .sort({ domain: 1 })
    .toArray();
  return docs.map((doc: CmsDomainRecord) => toDomainResponse(doc));
}

export async function createCmsDomain(domain: string): Promise<CmsDomainResponse> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) {
    const normalizedDomain = normalizeHost(domain);
    const now = new Date().toISOString();
    return {
      id: 'default-domain',
      name: normalizedDomain,
      domain: normalizedDomain,
      createdAt: now,
      updatedAt: now,
    };
  }
  const db = await getMongoDb();
  const normalized = normalizeHost(domain);
  const existing = await db
    .collection<CmsDomainRecord>(DOMAIN_COLLECTION)
    .findOne({ domain: normalized });
  if (existing) return toDomainResponse(existing);
  const now = new Date();
  const doc: CmsDomainRecord = {
    id: randomUUID(),
    name: normalized,
    domain: normalized,
    aliasOf: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<CmsDomainRecord>(DOMAIN_COLLECTION).insertOne(doc);
  return toDomainResponse(doc);
}

export async function deleteCmsDomain(domainId: string): Promise<void> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) return;
  const db = await getMongoDb();
  await db
    .collection<CmsDomainRecord>(DOMAIN_COLLECTION)
    .updateMany(
      { aliasOf: domainId },
      { $set: { aliasOf: null, updatedAt: new Date() } }
    );
  await db.collection<CmsDomainRecord>(DOMAIN_COLLECTION).deleteOne({ id: domainId });
  await db.collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION).deleteMany({ domainId });
}

export async function setCmsDomainAlias(domainId: string, aliasOf: string | null): Promise<CmsDomainResponse | null> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) return null;
  if (aliasOf === domainId) aliasOf = null;
  const db = await getMongoDb();
  const domain = await getDomainRecordById(domainId);
  if (!domain) return null;

  let targetId: string | null = aliasOf;
  if (aliasOf) {
    const canonical = await resolveCmsDomainScopeById(aliasOf);
    targetId = canonical?.id ?? null;
  }

  // Keep existing links so removing the alias restores the previous slug set.

  const updatedAt = new Date();
  await db
    .collection<CmsDomainRecord>(DOMAIN_COLLECTION)
    .updateOne(
      { id: domainId },
      { $set: { aliasOf: targetId ?? null, updatedAt } }
    );
  return toDomainResponse({
    ...domain,
    aliasOf: targetId ?? null,
    updatedAt,
  });
}

export async function isSlugAssignedToDomain(domainId: string, slugId: string): Promise<boolean> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) return true;
  const db = await getMongoDb();
  const doc = await db
    .collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION)
    .findOne({ domainId, slugId });
  return Boolean(doc);
}

export async function ensureDomainSlug(domainId: string, slugId: string): Promise<void> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) return;
  const db = await getMongoDb();
  await db.collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION).updateOne(
    { domainId, slugId },
    {
      $setOnInsert: {
        domainId,
        slugId,
        isDefault: false,
        assignedAt: new Date(),
      },
      $set: { updatedAt: new Date() },
    },
    { upsert: true }
  );
}

export async function removeDomainSlug(domainId: string, slugId: string): Promise<void> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) return;
  const db = await getMongoDb();
  await db.collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION).deleteOne({ domainId, slugId });
}

export async function setDomainDefaultSlug(domainId: string, slugId: string | null): Promise<void> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) return;
  const db = await getMongoDb();
  await db.collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION).updateMany(
    { domainId },
    { $set: { isDefault: false, updatedAt: new Date() } }
  );
  if (!slugId) return;
  await db.collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION).updateOne(
    { domainId, slugId },
    {
      $set: { isDefault: true, updatedAt: new Date() },
      $setOnInsert: { domainId, slugId, assignedAt: new Date() },
    },
    { upsert: true }
  );
}

export async function isSlugLinkedToAnyDomain(slugId: string): Promise<boolean> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) return false;
  const db = await getMongoDb();
  const count = await db
    .collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION)
    .countDocuments({ slugId }, { limit: 1 });
  return count > 0;
}

export async function getSlugsForDomain(domainId: string, repo: CmsRepository): Promise<Slug[]> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) {
    return repo.getSlugs();
  }
  const links = await getDomainSlugLinks(domainId);
  if (!links.length) return [];
  const map = new Map(links.map((link: CmsDomainSlugLink) => [link.slugId, link]));
  const slugs = await repo.getSlugs();
  return slugs
    .filter((slug: Slug) => map.has(slug.id))
    .map((slug: Slug) => ({
      ...slug,
      isDefault: map.get(slug.id)?.isDefault ?? false,
    }));
}

export async function getSlugForDomainById(
  domainId: string,
  slugId: string,
  repo: CmsRepository
): Promise<Slug | null> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) {
    return repo.getSlugById(slugId);
  }
  const slug = await repo.getSlugById(slugId);
  if (!slug) return null;
  const links = await getDomainSlugLinks(domainId);
  const link = links.find((item: CmsDomainSlugLink) => item.slugId === slugId);
  if (!link && process.env['MONGODB_URI']) return null;
  return {
    ...slug,
    isDefault: link?.isDefault ?? false,
  };
}

export async function getSlugForDomainByValue(
  domainId: string,
  slugValue: string,
  repo: CmsRepository
): Promise<Slug | null> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) {
    return repo.getSlugByValue(slugValue);
  }
  const slug = await repo.getSlugByValue(slugValue);
  if (!slug) return null;
  const isAllowed = await isSlugAssignedToDomain(domainId, slug.id);
  if (!isAllowed) return null;
  const links = await getDomainSlugLinks(domainId);
  const link = links.find((item: CmsDomainSlugLink) => item.slugId === slug.id);
  return {
    ...slug,
    isDefault: link?.isDefault ?? false,
  };
}
