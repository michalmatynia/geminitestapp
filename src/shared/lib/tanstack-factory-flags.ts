import type { TanstackFactoryDomain } from '@/shared/lib/tanstack-factory-v2.types';

type DomainOverrideKey = Exclude<TanstackFactoryDomain, 'global'>;

const parseBoolean = (value: string | undefined): boolean | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return undefined;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
};

const GLOBAL_FLAG = parseBoolean(process.env['NEXT_PUBLIC_TANSTACK_FACTORY_V2_ENABLED']) ?? false;

const DOMAIN_OVERRIDE_ENV: Record<DomainOverrideKey, string> = {
  products: 'NEXT_PUBLIC_TANSTACK_FACTORY_V2_PRODUCTS_ENABLED',
  image_studio: 'NEXT_PUBLIC_TANSTACK_FACTORY_V2_IMAGE_STUDIO_ENABLED',
  integrations: 'NEXT_PUBLIC_TANSTACK_FACTORY_V2_INTEGRATIONS_ENABLED',
};

const DOMAIN_OVERRIDES: Record<DomainOverrideKey, boolean | undefined> = {
  products: parseBoolean(process.env[DOMAIN_OVERRIDE_ENV.products]),
  image_studio: parseBoolean(process.env[DOMAIN_OVERRIDE_ENV.image_studio]),
  integrations: parseBoolean(process.env[DOMAIN_OVERRIDE_ENV.integrations]),
};

export const isTanstackFactoryV2Enabled = (domain: TanstackFactoryDomain = 'global'): boolean => {
  if (domain === 'global') return GLOBAL_FLAG;
  const override = DOMAIN_OVERRIDES[domain];
  return typeof override === 'boolean' ? override : GLOBAL_FLAG;
};

