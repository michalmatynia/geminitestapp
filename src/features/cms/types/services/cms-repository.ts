import type { Page, Slug, PageComponent, PageStatus, CmsTheme, CmsThemeCreateInput, CmsThemeUpdateInput } from '@/features/cms/types';

export interface PageUpdateData {
  name?: string | undefined;
  status?: PageStatus | undefined;
  publishedAt?: string | null | undefined;
  seoTitle?: string | null | undefined;
  seoDescription?: string | null | undefined;
  seoOgImage?: string | null | undefined;
  seoCanonical?: string | null | undefined;
  robotsMeta?: string | null | undefined;
  components?: PageComponent[] | undefined;
  themeId?: string | null | undefined;
  showMenu?: boolean | null | undefined;
}

export type CmsRepository = {
  // Pages
  getPages(): Promise<Page[]>;
  getPageById(id: string): Promise<Page | null>;
  getPageBySlug(slug: string): Promise<Page | null>;
  createPage(data: { name: string }): Promise<Page>;
  updatePage(id: string, data: PageUpdateData): Promise<Page | null>;
  deletePage(id: string): Promise<Page | null>;
  replacePageSlugs(pageId: string, slugIds: string[]): Promise<void>;
  replacePageComponents(pageId: string, components: PageComponent[]): Promise<void>;

  // Slugs
  getSlugs(): Promise<Slug[]>;
  getSlugById(id: string): Promise<Slug | null>;
  getSlugByValue(slug: string): Promise<Slug | null>;
  createSlug(data: { slug: string; isDefault?: boolean | undefined }): Promise<Slug>;
  updateSlug(id: string, data: { slug?: string | undefined; isDefault?: boolean | undefined }): Promise<Slug | null>;
  deleteSlug(id: string): Promise<Slug | null>;

  // Relationships
  addSlugToPage(pageId: string, slugId: string): Promise<void>;
  removeSlugFromPage(pageId: string, slugId: string): Promise<void>;

  // Themes
  getThemes(): Promise<CmsTheme[]>;
  getThemeById(id: string): Promise<CmsTheme | null>;
  createTheme(data: CmsThemeCreateInput): Promise<CmsTheme>;
  updateTheme(id: string, data: CmsThemeUpdateInput): Promise<CmsTheme | null>;
  deleteTheme(id: string): Promise<CmsTheme | null>;
};
