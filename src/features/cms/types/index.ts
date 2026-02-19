// DTO type exports
export type {
  CmsPageDto,
  CmsSlugDto,
  CmsThemeDto,
  CmsDomainDto,
  CreateCmsPageDto as CreatePageDto,
  UpdateCmsPageDto as UpdatePageDto,
  CreateCmsThemeDto as CreateThemeDto,
  UpdateCmsThemeDto as UpdateThemeDto,
  
  // From domain aliases
  CmsPageStatusDto as PageStatus,
  PageComponentDto as PageComponent,
  CmsPageSlugLinkDto as PageSlugLink,
  CmsPageSeoDto as PageSeoData,
  CmsPageSummaryDto as PageSummary,
  CmsPageDto as Page,
  CmsSlugDto as Slug,
  CmsDomainDto as CmsDomain,
  SectionDefinitionDto as SectionDefinition,
  BlockDefinitionDto as BlockDefinition,
  SettingsFieldDto as SettingsField,
  SettingsFieldOptionDto as SettingsFieldOption,
  PageZoneDto as PageZone,
  CmsBlockInstanceDto as BlockInstance,
  CmsSectionInstanceDto as SectionInstance
} from '@/shared/contracts/cms';

export * from './page-builder';
export * from './event-effects';
export * from './theme';
