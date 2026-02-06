// Re-export DTOs as types for backward compatibility
export type {
  CmsPageDto,
  CmsSlugDto,
  CmsThemeDto,
  CmsDomainDto,
  CreateCmsPageDto as CreatePageDto,
  UpdateCmsPageDto as UpdatePageDto,
  CreateCmsThemeDto as CreateThemeDto,
  UpdateCmsThemeDto as UpdateThemeDto
} from '@/shared/dtos';

export type {
  PageStatus,
  PageComponent,
  PageSlugLink,
  PageSeoData,
  PageSummary,
  Page,
  Slug,
  CmsDomain,
  SectionDefinition,
  BlockDefinition,
  SettingsField,
  SettingsFieldOption,
  PageZone,
  BlockInstance,
  SectionInstance
} from '@/shared/types/domain/cms';

export * from './page-builder';
export * from './event-effects';
export * from './theme';
