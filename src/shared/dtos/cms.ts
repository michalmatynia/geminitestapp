import { DtoBase, NamedDto } from '../types/base';

// CMS DTOs
export interface CmsPageDto extends DtoBase {
  title: string;
  slug: string;
  content: Record<string, unknown>;
  published: boolean;
  themeId: string | null;
  domainIds: string[];
}

export interface CmsSlugDto extends DtoBase {
  slug: string;
  pageId: string | null;
  domainIds: string[];
}

export interface CmsThemeDto extends NamedDto {
  config: Record<string, unknown>;
  isDefault: boolean;
}

export interface CmsDomainDto extends NamedDto {
  domain: string;
  isDefault: boolean;
  settings: Record<string, unknown>;
}

export interface CreatePageDto {
  title: string;
  slug: string;
  content?: Record<string, unknown>;
  published?: boolean;
  themeId?: string;
  domainIds?: string[];
}

export interface UpdatePageDto {
  title?: string;
  slug?: string;
  content?: Record<string, unknown>;
  published?: boolean;
  themeId?: string;
  domainIds?: string[];
}

export interface CreateThemeDto {
  name: string;
  description?: string;
  config?: Record<string, unknown>;
  isDefault?: boolean;
}

export interface UpdateThemeDto {
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
  isDefault?: boolean;
}
