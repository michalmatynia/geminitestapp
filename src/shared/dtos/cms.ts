// CMS DTOs
export interface CmsPageDto {
  id: string;
  title: string;
  slug: string;
  content: Record<string, unknown>;
  published: boolean;
  themeId: string | null;
  createdAt: string;
  updatedAt: string;
  domainIds: string[];
}

export interface CmsSlugDto {
  id: string;
  slug: string;
  pageId: string | null;
  domainIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CmsThemeDto {
  id: string;
  name: string;
  description: string | null;
  config: Record<string, unknown>;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CmsDomainDto {
  id: string;
  domain: string;
  name: string;
  isDefault: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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
