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
} from "@/shared/dtos";

export type PageStatus = "draft" | "published" | "scheduled";

export interface PageComponent {
  type: string;
  content: Record<string, unknown>;
}

export interface PageSlugLink {
  slug: {
    slug: string;
  };
}

export interface PageSeoData {
  seoTitle?: string;
  seoDescription?: string;
  seoOgImage?: string;
  seoCanonical?: string;
  robotsMeta?: string;
}

export interface PageSummary {
  id: string;
  name: string;
  status: PageStatus;
  slugs: PageSlugLink[];
}

export interface Page {
  id: string;
  name: string;
  status: PageStatus;
  publishedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoOgImage?: string;
  seoCanonical?: string;
  robotsMeta?: string;
  themeId?: string;
  showMenu?: boolean | null;
  components: PageComponent[];
  slugs?: PageSlugLink[];
  slugIds?: string[];
}

export interface Slug {
  id: string;
  slug: string;
  createdAt?: string;
  isDefault?: boolean;
}

export interface CmsDomain {
  id: string;
  domain: string;
  aliasOf?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export * from "./page-builder";
export * from "./event-effects";
export * from "./theme";
