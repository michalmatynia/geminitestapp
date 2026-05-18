import 'server-only';

import { cache } from 'react';

import type { CmsDomain } from '@/shared/contracts/cms';
import { getMongoDb } from '@/shared/lib/db/cms-builder-mongo-client';
import {
  isTransientMongoConnectionError,
  resolveCmsBuilderMongoSourceConfig,
} from '@/shared/lib/db/utils/mongo';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { getCmsDomainSettings } from './cms-domain-settings';

export type CmsDomainRecord = {
  id: string;
  name?: string;
  domain: string;
  aliasOf?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CmsDomainSlugLink = {
  domainId: string;
  slugId: string;
  isDefault?: boolean;
  assignedAt: Date;
  updatedAt?: Date;
};

export type SlugDocument = {
  id: string;
  isDefault?: boolean;
  updatedAt?: Date;
};

export const DOMAIN_COLLECTION = 'cms_domains';
export const DOMAIN_SLUGS_COLLECTION = 'cms_domain_slugs';
export const SLUGS_COLLECTION = 'cms_slugs';

export const hasMongoUri = (): boolean => {
  const config = resolveCmsBuilderMongoSourceConfig('local');
  return typeof config.uri === 'string' && config.uri.length > 0;
};

export const isDomainZoningEnabled = cache(async (): Promise<boolean> => {
  if (!hasMongoUri()) return false;
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

export const getDomainSlugLinks = cache(async (domainId: string): Promise<CmsDomainSlugLink[]> => {
  const zoningEnabled = await isDomainZoningEnabled();
  if (!zoningEnabled) return [];
  const db = await getMongoDb();
  return db.collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION).find({ domainId }).toArray();
});

export const toDomainResponse = (doc: CmsDomainRecord): CmsDomain => ({
  id: doc.id,
  name: doc.name ?? doc.domain,
  domain: doc.domain,
  aliasOf: doc.aliasOf ?? null,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});
