/* eslint-disable max-params, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/strict-boolean-expressions -- CMS slug service wraps repository methods with compatibility signatures. */
/**
 * CMS Slug Service
 * 
 * Manages slug resolution and filtering for CMS domains.
 */

import { type CmsRepository, type Slug } from '@/shared/contracts/cms';
import { type CmsDomainSlugLink } from './domain/domain-repository';

/**
 * Merges domain-specific slug link metadata with raw slug data.
 */
/**
 * Merges domain-specific slug link metadata with raw slug data.
 * @param slugs - The list of slugs to process.
 * @param links - The list of links containing the 'isDefault' flag.
 */
export const applyDefaultFlagToSlugs = (slugs: Slug[], links: CmsDomainSlugLink[]): Slug[] => {
  const linkMap = new Map(links.map((link) => [link.slugId, link]));
  
  return slugs.map((slug) => {
    const link = linkMap.get(slug.id);
    return {
      ...slug,
      isDefault: link?.isDefault ?? false,
    };
  });
};

import { internalError } from '@/shared/errors/app-error';

// ... (existing constants)

/**
 * Fetches slugs for a given domain ID, applying domain-specific filtering.
 */
export const getSlugsForDomain = async (
  domainId: string,
  repo: CmsRepository,
  getLinks: (domainId: string) => Promise<CmsDomainSlugLink[]>,
  options?: any
): Promise<Slug[]> => {
  try {
    const links = await getLinks(domainId);
    if (!links.length) return [];

    const slugIds = links.map((link) => link.slugId);
    const slugs = await repo.getSlugsByIds(slugIds, options);
    
    return applyDefaultFlagToSlugs(slugs, links);
  } catch (error) {
    throw internalError('Failed to retrieve slugs for domain.', {
      domainId,
      cause: error,
    });
  }
};

/**
 * Resolves a single slug for a domain by ID, applying domain-specific validation.
 */
import { internalError } from '@/shared/errors/app-error';

// ... (imports)

export const getSlugForDomainById = async (
  domainId: string,
  slugId: string,
  repo: CmsRepository,
  getLinks: (domainId: string) => Promise<CmsDomainSlugLink[]>,
  options?: any
): Promise<Slug | null> => {
  const [slug, links] = await Promise.all([
    repo.getSlugById(slugId, options),
    getLinks(domainId),
  ]);
  
  if (!slug) return null;
  const link = links.find((item) => item.slugId === slugId);
  
  if (!link && process.env['MONGODB_URI']) {
      throw internalError('Slug resolution failed: Link association missing for domain.', {
          domainId,
          slugId,
      });
  }
  
  return {
    ...slug,
    isDefault: link?.isDefault ?? false,
  };
};

/**
 * Resolves a single slug for a domain by value, applying domain-specific validation.
 */
export const getSlugForDomainByValue = async (
  domainId: string,
  slugValue: string,
  repo: CmsRepository,
  getLinks: (domainId: string) => Promise<CmsDomainSlugLink[]>,
  options?: any
): Promise<Slug | null> => {
  const [slug, links] = await Promise.all([
    repo.getSlugByValue(slugValue, options),
    getLinks(domainId),
  ]);
  
  if (!slug) return null;
  const link = links.find((item) => item.slugId === slug.id);
  
  if (!link) {
    throw internalError('Slug resolution failed: Link association missing for domain.', {
        domainId,
        slugValue,
    });
  }
  
  return {
    ...slug,
    isDefault: link.isDefault ?? false,
  };
};
