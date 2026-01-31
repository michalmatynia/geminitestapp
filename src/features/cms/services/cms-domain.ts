import "server-only";

import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import type { CmsRepository } from "@/features/cms/types/services/cms-repository";
import type { CmsDomain, Slug } from "@/features/cms/types";

type CmsDomainRecord = {
  id: string;
  domain: string;
  aliasOf?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CmsDomainResponse = {
  id: string;
  domain: string;
  aliasOf?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type CmsDomainSlugLink = {
  domainId: string;
  slugId: string;
  isDefault?: boolean;
  assignedAt: Date;
  updatedAt?: Date;
};

const DOMAIN_COLLECTION = "cms_domains";
const DOMAIN_SLUGS_COLLECTION = "cms_domain_slugs";

const getFallbackDomain = (): string => {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost";
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "default";
  }
};

const normalizeHost = (hostHeader: string | null): string => {
  if (!hostHeader) return getFallbackDomain();
  const raw = hostHeader.split(",")[0]?.trim() ?? "";
  if (!raw) return getFallbackDomain();
  try {
    return new URL(`http://${raw}`).hostname.toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
};

const getHostFromRequest = (req: NextRequest): string | null =>
  req.headers.get("x-forwarded-host") ?? req.headers.get("host");

const getHostFromHeaders = (headers: Headers): string | null =>
  headers.get("x-forwarded-host") ?? headers.get("host");

export async function resolveCmsDomainFromRequest(req: NextRequest): Promise<CmsDomain> {
  const host = getHostFromRequest(req);
  return resolveCmsDomainByHost(host);
}

export async function resolveCmsDomainFromHeaders(headers: Headers): Promise<CmsDomain> {
  const host = getHostFromHeaders(headers);
  return resolveCmsDomainByHost(host);
}

const getDomainRecordById = async (domainId: string): Promise<CmsDomainRecord | null> => {
  if (!process.env.MONGODB_URI) return null;
  const db = await getMongoDb();
  return db
    .collection<CmsDomainRecord>(DOMAIN_COLLECTION)
    .findOne({ id: domainId });
};

export async function resolveCmsDomainScopeById(domainId: string): Promise<CmsDomain | null> {
  if (!process.env.MONGODB_URI) {
    return {
      id: "default-domain",
      domain: getFallbackDomain(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
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
  return current;
}

export async function resolveCmsDomainByHost(hostHeader: string | null): Promise<CmsDomain> {
  const domain = normalizeHost(hostHeader);
  if (!process.env.MONGODB_URI) {
    return {
      id: "default-domain",
      domain,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const db = await getMongoDb();
  const existing = await db
    .collection<CmsDomainRecord>(DOMAIN_COLLECTION)
    .findOne({ domain });
  if (existing) {
    const scoped = await resolveCmsDomainScopeById(existing.id);
    return scoped ?? existing;
  }

  const now = new Date();
  const doc: CmsDomainRecord = {
    id: randomUUID(),
    domain,
    aliasOf: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<CmsDomainRecord>(DOMAIN_COLLECTION).insertOne(doc);
  return doc;
}

export async function getCmsDomainById(domainId: string): Promise<CmsDomain | null> {
  if (!process.env.MONGODB_URI) {
    return {
      id: "default-domain",
      domain: getFallbackDomain(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  const doc = await getDomainRecordById(domainId);
  return doc ?? null;
}

export async function getDomainSlugLinks(domainId: string): Promise<CmsDomainSlugLink[]> {
  if (!process.env.MONGODB_URI) return [];
  const db = await getMongoDb();
  return db
    .collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION)
    .find({ domainId })
    .toArray();
}

const toDomainResponse = (doc: CmsDomainRecord): CmsDomainResponse => ({
  id: doc.id,
  domain: doc.domain,
  aliasOf: doc.aliasOf ?? undefined,
  createdAt: doc.createdAt?.toISOString?.() ?? undefined,
  updatedAt: doc.updatedAt?.toISOString?.() ?? undefined,
});

export async function listCmsDomains(): Promise<CmsDomainResponse[]> {
  if (!process.env.MONGODB_URI) return [];
  const db = await getMongoDb();
  const docs = await db
    .collection<CmsDomainRecord>(DOMAIN_COLLECTION)
    .find()
    .sort({ domain: 1 })
    .toArray();
  return docs.map((doc) => toDomainResponse(doc));
}

export async function createCmsDomain(domain: string): Promise<CmsDomainResponse> {
  if (!process.env.MONGODB_URI) {
    return { id: "default-domain", domain };
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
    domain: normalized,
    aliasOf: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<CmsDomainRecord>(DOMAIN_COLLECTION).insertOne(doc);
  return toDomainResponse(doc);
}

export async function deleteCmsDomain(domainId: string): Promise<void> {
  if (!process.env.MONGODB_URI) return;
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
  if (!process.env.MONGODB_URI) return null;
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
  if (!process.env.MONGODB_URI) return true;
  const db = await getMongoDb();
  const doc = await db
    .collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION)
    .findOne({ domainId, slugId });
  return Boolean(doc);
}

export async function ensureDomainSlug(domainId: string, slugId: string): Promise<void> {
  if (!process.env.MONGODB_URI) return;
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
  if (!process.env.MONGODB_URI) return;
  const db = await getMongoDb();
  await db.collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION).deleteOne({ domainId, slugId });
}

export async function setDomainDefaultSlug(domainId: string, slugId: string | null): Promise<void> {
  if (!process.env.MONGODB_URI) return;
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
  if (!process.env.MONGODB_URI) return false;
  const db = await getMongoDb();
  const count = await db
    .collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION)
    .countDocuments({ slugId }, { limit: 1 });
  return count > 0;
}

export async function getSlugsForDomain(domainId: string, repo: CmsRepository): Promise<Slug[]> {
  if (!process.env.MONGODB_URI) {
    return repo.getSlugs();
  }
  const links = await getDomainSlugLinks(domainId);
  if (!links.length) return [];
  const map = new Map(links.map((link) => [link.slugId, link]));
  const slugs = await repo.getSlugs();
  return slugs
    .filter((slug) => map.has(slug.id))
    .map((slug) => ({
      ...slug,
      isDefault: map.get(slug.id)?.isDefault ?? false,
    }));
}

export async function getSlugForDomainById(
  domainId: string,
  slugId: string,
  repo: CmsRepository
): Promise<Slug | null> {
  const slug = await repo.getSlugById(slugId);
  if (!slug) return null;
  const links = await getDomainSlugLinks(domainId);
  const link = links.find((item) => item.slugId === slugId);
  if (!link && process.env.MONGODB_URI) return null;
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
  const slug = await repo.getSlugByValue(slugValue);
  if (!slug) return null;
  const isAllowed = await isSlugAssignedToDomain(domainId, slug.id);
  if (!isAllowed) return null;
  const links = await getDomainSlugLinks(domainId);
  const link = links.find((item) => item.slugId === slug.id);
  return {
    ...slug,
    isDefault: link?.isDefault ?? false,
  };
}
