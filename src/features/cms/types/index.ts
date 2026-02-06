// Re-export DTOs as types for backward compatibility
export type {
  CmsPageDto,
  CmsSlugDto,
  CmsThemeDto,
  CmsDomainDto,
  CreatePageDto,
  UpdatePageDto,
  CreateThemeDto,
  UpdateThemeDto
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
