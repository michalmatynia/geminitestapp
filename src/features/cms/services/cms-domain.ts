import 'server-only';

import { randomUUID } from 'crypto';

import type { CmsDomain } from '@/shared/contracts/cms';
import { getCmsDataProvider } from '@/shared/lib/cms/services/cms-provider';
import { getMongoDb } from '@/shared/lib/db/cms-builder-mongo-client';

import {
  buildDefaultDomain,
  buildUnmappedDomain,
  deleteDomainRecord,
  deleteDomainSlugLinks,
  getDomainRecordById,
  normalizeHost,
} from './domain';
import {
  DOMAIN_COLLECTION,
  DOMAIN_SLUGS_COLLECTION,
  SLUGS_COLLECTION,
  hasMongoUri,
  isDomainZoningEnabled,
  toDomainResponse,
  type CmsDomainRecord,
  type CmsDomainSlugLink,
  type SlugDocument,
} from './cms-domain-core';
export { getDomainSlugLinks, isDomainZoningEnabled } from './cms-domain-core';
export {
  ensureDomainSlug,
  getCmsSlugById,
  getCmsSlugByValue,
  getCmsSlugsForDomain,
  getSlugForDomainById,
  getSlugForDomainByValue,
  getSlugsForDomain,
  isSlugAssignedToDomain,
  isSlugLinkedToAnyDomain,
  removeDomainSlug,
  setDomainDefaultSlug,
} from './cms-domain-slugs';

import type { NextRequest } from 'next/server';

export type CmsDomainResponse = CmsDomain;

type HeaderInput =
  | Headers
  | { get?: (key: string) => string | null }
  | Record<string, unknown>
  | null
  | undefined;

const getHostFromRequest = (req: NextRequest): string | null =>
  req.headers.get('x-forwarded-host') ?? req.headers.get('host');

const hasHeaderGetter = (
  headers: Exclude<HeaderInput, null | undefined>
): headers is Headers | { get: (key: string) => string | null } =>
  typeof (headers as { get?: unknown }).get === 'function';

const getHostFromHeaderRecord = (headers: Record<string, unknown>): string | null => {
  const forwarded =
    headers['x-forwarded-host'] ?? headers['X-Forwarded-Host'] ?? headers['host'] ?? headers['Host'];
  return typeof forwarded === 'string' ? forwarded : null;
};

const getHostFromHeaders = (headers: HeaderInput): string | null => {
  if (headers === null || headers === undefined) return null;
  if (hasHeaderGetter(headers)) {
    return headers.get('x-forwarded-host') ?? headers.get('host');
  }
  return getHostFromHeaderRecord(headers);
};

const resolveCanonicalDomainRecord = async (
  record: CmsDomainRecord,
  visited = new Set<string>([record.id])
): Promise<CmsDomainRecord> => {
  const aliasOf = record.aliasOf ?? null;
  if (aliasOf === null || visited.has(aliasOf)) return record;
  const next = await getDomainRecordById(aliasOf);
  if (next === null) return record;
  return resolveCanonicalDomainRecord(next, new Set([...visited, next.id]));
};

const resolveAliasTargetId = async (
  domainId: string,
  aliasOf: string | null
): Promise<string | null> => {
  const requestedAliasId = aliasOf === domainId ? null : aliasOf;
  if (requestedAliasId === null) return null;
  const canonical = await resolveCmsDomainScopeById(requestedAliasId);
  return canonical?.id ?? null;
};

export async function setGlobalDefaultSlug(slugId: string | null): Promise<void> {
  await getCmsDataProvider();
  if (!hasMongoUri()) return;
  const db = await getMongoDb();
  const now = new Date();
  await db
    .collection<SlugDocument>(SLUGS_COLLECTION)
    .updateMany({}, { $set: { isDefault: false, updatedAt: now } });
  if (slugId === null) return;
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
  if (initialRecord === null) return null;
  const canonicalRecord = await resolveCanonicalDomainRecord(initialRecord);
  return toDomainResponse(canonicalRecord);
}

export async function resolveCmsDomainByHost(hostHeader: string | null): Promise<CmsDomain> {
  const domain = normalizeHost(hostHeader);
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) {
    return buildDefaultDomain(hostHeader);
  }
  const db = await getMongoDb();

  const existing = await db.collection<CmsDomainRecord>(DOMAIN_COLLECTION).findOne({ domain });
  if (existing !== null) {
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
  return doc === null ? null : toDomainResponse(doc);
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
  if (existing !== null) return toDomainResponse(existing);
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
  if (domain === null) return null;
  const targetId = await resolveAliasTargetId(domainId, aliasOf);

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
