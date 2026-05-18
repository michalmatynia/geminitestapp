import 'server-only';

import type { CmsRepository, CmsSlugLookupOptions, Slug } from '@/shared/contracts/cms';
import { getMongoDb } from '@/shared/lib/db/cms-builder-mongo-client';

import {
  deleteDomainSlugLink,
  isSlugLinkedToDomain,
  resetDomainDefaultSlug,
  setDomainDefaultSlugLink,
  upsertDomainSlugLink,
} from './domain';
import {
  DOMAIN_SLUGS_COLLECTION,
  getDomainSlugLinks,
  hasMongoUri,
  isDomainZoningEnabled,
  type CmsDomainSlugLink,
} from './cms-domain-core';

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
  if (slugId === null) return;
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
  if (links.length === 0) return [];

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
  if (slug === null) return null;
  const link = links.find((item: CmsDomainSlugLink) => item.slugId === slugId);
  if (link === undefined && hasMongoUri()) return null;
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
  if (slug === null) return null;
  const link = links.find((item: CmsDomainSlugLink) => item.slugId === slug.id);
  if (link === undefined) return null;
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
