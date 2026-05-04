/**
 * CMS API Validation Schemas
 * 
 * Zod validation schemas for CMS API operations.
 * Provides:
 * - Domain creation and update schemas
 * - Page creation and update schemas
 * - Slug management schemas
 * - Theme configuration schemas
 * - Type-safe API request validation
 */

export {
  cmsDomainCreateSchema,
  cmsDomainUpdateSchema,
  cmsPageCreateSchema,
  cmsPageUpdateSchema,
  cmsSlugCreateSchema,
  cmsSlugDomainsUpdateSchema,
  cmsSlugUpdateSchema,
  cmsThemeCreateSchema,
  cmsThemeUpdateSchema,
} from '@/shared/contracts/cms';
