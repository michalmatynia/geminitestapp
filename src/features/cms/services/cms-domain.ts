/* eslint-disable complexity, max-lines, no-await-in-loop, no-param-reassign, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions -- Domain zoning service keeps legacy Mongo fallback and alias resolution paths together. */
import 'server-only';

import { randomUUID } from 'crypto';
import { cache } from 'react';

import type { CmsDomain, CmsRepository, CmsSlugLookupOptions, Slug } from '@/shared/contracts/cms';
import { getCmsDataProvider } from '@/shared/lib/cms/services/cms-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { isTransientMongoConnectionError } from '@/shared/lib/db/utils/mongo';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { getCmsDomainSettings } from './cms-domain-settings';
import {
  buildDefaultDomain,
  buildUnmappedDomain,
  deleteDomainRecord,
  deleteDomainSlugLink,
  deleteDomainSlugLinks,
  getDomainRecordById,
  isSlugLinkedToDomain,
  normalizeHost,
  resetDomainDefaultSlug,
  setDomainDefaultSlugLink,
  upsertDomainSlugLink,
} from './domain';

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
      record['x-forwarded-host'] ?? record['X-Forwarded-Host'] ?? record['host'] ?? record['Host'];
    if (typeof forwarded === 'string') return forwarded;
  }
  return null;
};

export const isDomainZoningEnabled = cache(async (): Promise<boolean> => {
  if (!process.env['MONGODB_URI']) return false;
  try {
    const settings = await getCmsDomainSettings();
    return settings.zoningEnabled;
  } catch (error) {
    if (!isTransientMongoConnectionError(error)) {
      void ErrorSystem.captureException(error, {
        service: 'cms.domain',
        source: 'cms.domain',
        action: 'isDomainZoningEnabled',
      });
    }
    return false;
  }
});

export async function setGlobalDefaultSlug(slugId: string | null): Promise<void> {
  await getCmsDataProvider();
  if (!process.env['MONGODB_URI']) return;
  const db = await getMongoDb();
  const now = new Date();
  await db
    .collection<SlugDocument>(SLUGS_COLLECTION)
    .updateMany({}, { $set: { isDefault: false, updatedAt: now } });
  if (!slugId) return;
  await db
    .collection<SlugDocument>(SLUGS_COLLECTION)
    .updateOne({ id: slugId }, { $set: { isDefault: true, updatedAt: now } });
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

export async function resolveCmsDomainScopeById(domainId: string): Promise<CmsDomain | null> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) {
    return buildDefaultDomain(null);
  }
  const initialRecord = await getDomainRecordById(domainId);
  let current = initialRecord;
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

  const existing = await db.collection<CmsDomainRecord>(DOMAIN_COLLECTION).findOne({ domain });
  if (existing) {
    const scoped = await resolveCmsDomainScopeById(existing.id);
    return scoped ?? toDomainResponse(existing);
  }
  return buildUnmappedDomain(hostHeader);
}

export async function getCmsDomainById(domainId: string): Promise<CmsDomain | null> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) {
    return buildDefaultDomain(null);
  }
  const doc = await getDomainRecordById(domainId);
  return doc ? toDomainResponse(doc) : null;
}

export const getDomainSlugLinks = cache(async (domainId: string): Promise<CmsDomainSlugLink[]> => {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) return [];
  const db = await getMongoDb();
  return db.collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION).find({ domainId }).toArray();
});

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
  // updateMany must complete before deleteOne to clear aliases first
  const db = await getMongoDb();
  await db
    .collection<CmsDomainRecord>(DOMAIN_COLLECTION)
    .updateMany({ aliasOf: domainId }, { $set: { aliasOf: null, updatedAt: new Date() } });

  await Promise.all([
    deleteDomainRecord(domainId),
    deleteDomainSlugLinks(domainId),
  ]);
}

export async function setCmsDomainAlias(
  domainId: string,
  aliasOf: string | null
): Promise<CmsDomainResponse | null> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) return null;
  const [domain, db] = await Promise.all([getDomainRecordById(domainId), getMongoDb()]);
  if (aliasOf === domainId) aliasOf = null;
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
    .updateOne({ id: domainId }, { $set: { aliasOf: targetId ?? null, updatedAt } });
  return toDomainResponse({
    ...domain,
    aliasOf: targetId ?? null,
    updatedAt,
  });
}

export async function isSlugAssignedToDomain(domainId: string, slugId: string): Promise<boolean> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) return true;
  return await isSlugLinkedToDomain(domainId, slugId);
}

export async function ensureDomainSlug(domainId: string, slugId: string): Promise<void> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) return;
  await upsertDomainSlugLink(domainId, slugId);
}

export async function removeDomainSlug(domainId: string, slugId: string): Promise<void> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) return;
  await deleteDomainSlugLink(domainId, slugId);
}

export async function setDomainDefaultSlug(domainId: string, slugId: string | null): Promise<void> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) return;
  await resetDomainDefaultSlug(domainId);
  if (!slugId) return;
  await setDomainDefaultSlugLink(domainId, slugId);
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

export async function getCmsSlugsForDomain(
  domainId: string,
  repo: CmsRepository,
  options?: CmsSlugLookupOptions
): Promise<Slug[]> {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) {
    return repo.getSlugs(options);
  }
  const links = await getDomainSlugLinks(domainId);
  if (!links.length) return [];

  const slugIds = links.map((link: CmsDomainSlugLink) => link.slugId);
  const map = new Map(links.map((link: CmsDomainSlugLink) => [link.slugId, link]));

  const slugs = await repo.getSlugsByIds(slugIds, options);
  return slugs.map((slug: Slug) => ({
    ...slug,
    isDefault: map.get(slug.id)?.isDefault ?? false,
  }));
}

export async function getCmsSlugById(
  domainId: string,
  slugId: string,
  repo: CmsRepository,
  options?: CmsSlugLookupOptions
): Promise<Slug | null> {
  const zoningEnabled = await isDomainZoningEnabled();
  const slugPromise = repo.getSlugById(slugId, options);
  if (!zoningEnabled) return slugPromise;
  const [slug, links] = await Promise.all([slugPromise, getDomainSlugLinks(domainId)]);
  if (!slug) return null;
  const link = links.find((item: CmsDomainSlugLink) => item.slugId === slugId);
  if (!link && process.env['MONGODB_URI']) return null;
  return {
    ...slug,
    isDefault: link?.isDefault ?? false,
  };
}

export async function getCmsSlugByValue(
  domainId: string,
  slugValue: string,
  repo: CmsRepository,
  options?: CmsSlugLookupOptions
): Promise<Slug | null> {
  const zoningEnabled = await isDomainZoningEnabled();
  const slugPromise = repo.getSlugByValue(slugValue, options);
  if (!zoningEnabled) return slugPromise;
  const [slug, links] = await Promise.all([slugPromise, getDomainSlugLinks(domainId)]);
  if (!slug) return null;
  const link = links.find((item: CmsDomainSlugLink) => item.slugId === slug.id);
  if (!link) return null;
  return {
    ...slug,
    isDefault: link.isDefault ?? false,
  };
}

export {
  getCmsSlugById as getSlugForDomainById,
  getCmsSlugByValue as getSlugForDomainByValue,
  getCmsSlugsForDomain as getSlugsForDomain,
};
