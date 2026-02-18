import type {
  CmsThemeDto,
  CmsPageDto,
  CmsSlugDto,
  CmsDomainDto,
  CreateCmsPageDto,
  UpdateCmsPageDto,
  CreateCmsThemeDto,
  UpdateCmsThemeDto,
  CmsThemeColors,
  CmsThemeTypography,
  CmsThemeSpacing,
  CmsBlockInstanceDto,
  CmsSectionInstanceDto,
  CmsPageSeoDto,
  CmsPageStatusDto,
  CmsPageSlugLinkDto,
  CmsPageSummaryDto,
  SettingsFieldOptionDto,
  SettingsFieldDto,
  SectionDefinitionDto,
  BlockDefinitionDto,
  PageComponentDto
} from '../../dtos/cms';

export type {
  CmsThemeDto,
  CmsPageDto,
  CmsSlugDto,
  CmsDomainDto,
  CreateCmsPageDto,
  UpdateCmsPageDto,
  CreateCmsThemeDto,
  UpdateCmsThemeDto,
  CmsThemeColors,
  CmsThemeTypography,
  CmsThemeSpacing,
  CmsBlockInstanceDto,
  CmsSectionInstanceDto,
  CmsPageSeoDto,
  CmsPageStatusDto,
  CmsPageSlugLinkDto,
  CmsPageSummaryDto,
  SettingsFieldOptionDto,
  SettingsFieldDto,
  SectionDefinitionDto,
  BlockDefinitionDto,
  PageComponentDto
};

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

export type CmsTheme = CmsThemeDto;
export type CmsThemeCreateInput = CreateCmsThemeDto;
export type CmsThemeUpdateInput = UpdateCmsThemeDto;

// ---------------------------------------------------------------------------
// Pages & Core CMS
// ---------------------------------------------------------------------------
export type PageStatus = CmsPageStatusDto;

export type PageComponent = PageComponentDto;

export type PageSlugLink = CmsPageSlugLinkDto;

export type PageSeoData = CmsPageSeoDto;

export type PageSummary = CmsPageSummaryDto;

export type Page = CmsPageDto;

export type Slug = CmsSlugDto;

export type CmsDomain = CmsDomainDto;

// ---------------------------------------------------------------------------
// Page Builder Instances & Definitions
// ---------------------------------------------------------------------------
export type PageZone = 'header' | 'template' | 'footer';

export type BlockInstance = CmsBlockInstanceDto;

export type SectionInstance = CmsSectionInstanceDto;

export type SettingsFieldOption = SettingsFieldOptionDto;

export type SettingsField = SettingsFieldDto;

export type SectionDefinition = SectionDefinitionDto;

export type BlockDefinition = BlockDefinitionDto;
