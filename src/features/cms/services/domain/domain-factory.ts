/**
 * Domain Factory Service
 * 
 * Factory utilities for creating standard domain objects.
 */

import type { CmsDomain } from '@/shared/contracts/cms';
import { normalizeHost } from './domain-normalization';

const DEFAULT_DOMAIN_TIMESTAMP = '1970-01-01T00:00:00.000Z';

/**
 * Builds a default domain object.
 */
export const buildDefaultDomain = (hostHeader: string | null): CmsDomain => ({
  id: 'default-domain',
  name: 'Default domain',
  domain: normalizeHost(hostHeader),
  createdAt: DEFAULT_DOMAIN_TIMESTAMP,
  updatedAt: DEFAULT_DOMAIN_TIMESTAMP,
});

/**
 * Builds an unmapped domain object.
 */
export const buildUnmappedDomain = (hostHeader: string | null): CmsDomain => {
  const domain = normalizeHost(hostHeader);
  return {
    id: `unmapped-domain:${domain}`,
    name: domain,
    domain,
    aliasOf: null,
    createdAt: DEFAULT_DOMAIN_TIMESTAMP,
    updatedAt: DEFAULT_DOMAIN_TIMESTAMP,
  };
};
