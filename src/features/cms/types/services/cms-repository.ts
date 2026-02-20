import type { Page, Slug, PageComponent, PageStatus, CmsTheme, CmsThemeCreateInput, CmsThemeUpdateInput } from '@/shared/contracts/cms';

export interface PageUpdateData {
  name?: string | undefined;
  status?: PageStatus | undefined;
  seoTitle?: string | null | undefined;
  seoDescription?: string | null | undefined;
  seoOgImage?: string | null | undefined;
  seoCanonical?: string | null | undefined;
  robotsMeta?: string | null | undefined;
  components?: Array<Partial<PageComponent> & Pick<PageComponent, 'type' | 'order' | 'content'>> | undefined;
  themeId?: string | null | undefined;
  showMenu?: boolean | null | undefined;
}

export type CmsRepository = {
  // Pages
  getPages(): Promise<Page[]>;
  getPageById(id: string): Promise<Page | null>;
  getPageBySlug(slug: string): Promise<Page | null>;
  createPage(data: { name: string; themeId?: string | null | undefined }): Promise<Page>;
  updatePage(id: string, data: PageUpdateData): Promise<Page | null>;
  deletePage(id: string): Promise<Page | null>;
  replacePageSlugs(pageId: string, slugIds: string[]): Promise<void>;
  replacePageComponents(pageId: string, components: Array<Partial<PageComponent> & Pick<PageComponent, 'type' | 'order' | 'content'>>): Promise<void>;

  // Slugs
  getSlugs(): Promise<Slug[]>;
  getSlugById(id: string): Promise<Slug | null>;
  createSlug(data: { slug: string; pageId?: string | null; isDefault?: boolean }): Promise<Slug>;
  updateSlug(id: string, data: Partial<{ slug: string; pageId: string | null; isDefault: boolean }>): Promise<Slug | null>;
  deleteSlug(id: string): Promise<Slug | null>;

  // Themes
  getThemes(): Promise<CmsTheme[]>;
  getThemeById(id: string): Promise<CmsTheme | null>;
  createTheme(data: CmsThemeCreateInput): Promise<CmsTheme>;
  updateTheme(id: string, data: CmsThemeUpdateInput): Promise<CmsTheme | null>;
  deleteTheme(id: string): Promise<CmsTheme | null>;
  getDefaultTheme(): Promise<CmsTheme | null>;
  setDefaultTheme(id: string): Promise<void>;

  // Domains
  getDomains(): Promise<any[]>;
  getDomainById(id: string): Promise<any | null>;
  createDomain(data: any): Promise<any>;
  updateDomain(id: string, data: any): Promise<any>;
  deleteDomain(id: string): Promise<void>;
};
