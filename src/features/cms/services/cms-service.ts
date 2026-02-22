import 'server-only';

import { ErrorSystem, logActivity, ActivityTypes } from '@/features/observability/server';
import type { 
  Page, 
  Slug, 
  PageComponent, 
  CmsTheme, 
  CmsThemeCreateInput, 
  CmsThemeUpdateInput,
  CmsDomainDto,
  CreateCmsDomainDto,
  UpdateCmsDomainDto,
} from '@/shared/contracts/cms';
import type { CmsRepository, PageUpdateData } from '@/shared/contracts/cms';

import { getCmsRepository } from './cms-repository';

/**
 * Service that wraps the CMS repository with error handling and logging.
 * All CMS domain logic and repository access should go through this service.
 */
const repoCall = async <K extends keyof CmsRepository>(
  key: K,
  ...args: Parameters<CmsRepository[K]>
): Promise<Awaited<ReturnType<CmsRepository[K]>>> => {
  try {
    const repo = await getCmsRepository();
    const fn = repo[key] as (
      ...args: Parameters<CmsRepository[K]>
    ) => ReturnType<CmsRepository[K]>;
    return await fn(...args) as Promise<Awaited<ReturnType<CmsRepository[K]>>>;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'cms-service',
      action: 'repoCall',
      method: key,
    });
    throw error;
  }
};

export const cmsService: CmsRepository = {
  // Pages
  getPages: (): Promise<Page[]> => repoCall('getPages'),
  getPageById: (id: string): Promise<Page | null> => repoCall('getPageById', id),
  getPageBySlug: (slug: string): Promise<Page | null> => repoCall('getPageBySlug', slug),
  createPage: async (data: { name: string; themeId?: string | null | undefined }): Promise<Page> => {
    const page = await repoCall('createPage', data);
    void logActivity({
      type: ActivityTypes.CMS.PAGE_CREATED,
      description: `Created page ${page.name}`,
      entityId: page.id,
      entityType: 'page',
      metadata: { name: page.name }
    }).catch(() => {});
    return page;
  },
  updatePage: async (id: string, data: PageUpdateData): Promise<Page | null> => {
    const page = await repoCall('updatePage', id, data);
    if (page) {
      void logActivity({
        type: ActivityTypes.CMS.PAGE_UPDATED,
        description: `Updated page ${page.name}`,
        entityId: page.id,
        entityType: 'page',
        metadata: { changes: Object.keys(data) }
      }).catch(() => {});
    }
    return page;
  },
  deletePage: async (id: string): Promise<Page | null> => {
    const page = await repoCall('deletePage', id);
    if (page) {
      void logActivity({
        type: ActivityTypes.CMS.PAGE_DELETED,
        description: `Deleted page ${page.name}`,
        entityId: page.id,
        entityType: 'page',
        metadata: { name: page.name }
      }).catch(() => {});
    }
    return page;
  },
  replacePageSlugs: (pageId: string, slugIds: string[]): Promise<void> => repoCall('replacePageSlugs', pageId, slugIds),
  replacePageComponents: (pageId: string, components: Array<Partial<PageComponent> & Pick<PageComponent, 'type' | 'order' | 'content'>>): Promise<void> => repoCall('replacePageComponents', pageId, components),

  // Slugs
  getSlugs: (): Promise<Slug[]> => repoCall('getSlugs'),
  getSlugById: (id: string): Promise<Slug | null> => repoCall('getSlugById', id),
  getSlugByValue: (slug: string): Promise<Slug | null> => repoCall('getSlugByValue', slug),
  createSlug: (data: { slug: string; pageId?: string | null; isDefault?: boolean }): Promise<Slug> => repoCall('createSlug', data),
  updateSlug: (id: string, data: Partial<{ slug: string; pageId: string | null; isDefault: boolean }>): Promise<Slug | null> => repoCall('updateSlug', id, data),
  deleteSlug: (id: string): Promise<Slug | null> => repoCall('deleteSlug', id),

  // Relationships
  addSlugToPage: (pageId: string, slugId: string): Promise<void> => repoCall('addSlugToPage', pageId, slugId),
  removeSlugFromPage: (pageId: string, slugId: string): Promise<void> => repoCall('removeSlugFromPage', pageId, slugId),

  // Themes
  getThemes: (): Promise<CmsTheme[]> => repoCall('getThemes'),
  getThemeById: (id: string): Promise<CmsTheme | null> => repoCall('getThemeById', id),
  createTheme: async (data: CmsThemeCreateInput): Promise<CmsTheme> => {
    const theme = await repoCall('createTheme', data);
    void logActivity({
      type: ActivityTypes.CMS.THEME_CREATED,
      description: `Created theme ${theme.name}`,
      entityId: theme.id,
      entityType: 'theme',
      metadata: { name: theme.name }
    }).catch(() => {});
    return theme;
  },
  updateTheme: async (id: string, data: CmsThemeUpdateInput): Promise<CmsTheme | null> => {
    const theme = await repoCall('updateTheme', id, data);
    if (theme) {
      void logActivity({
        type: ActivityTypes.CMS.THEME_UPDATED,
        description: `Updated theme ${theme.name}`,
        entityId: theme.id,
        entityType: 'theme',
        metadata: { changes: Object.keys(data) }
      }).catch(() => {});
    }
    return theme;
  },
  deleteTheme: async (id: string): Promise<CmsTheme | null> => {
    const theme = await repoCall('deleteTheme', id);
    if (theme) {
      void logActivity({
        type: ActivityTypes.CMS.THEME_DELETED,
        description: `Deleted theme ${theme.name}`,
        entityId: theme.id,
        entityType: 'theme',
        metadata: { name: theme.name }
      }).catch(() => {});
    }
    return theme;
  },
  getDefaultTheme: (): Promise<CmsTheme | null> => repoCall('getDefaultTheme'),
  setDefaultTheme: (id: string): Promise<void> => repoCall('setDefaultTheme', id),

  // Domains
  getDomains: (): Promise<CmsDomainDto[]> => repoCall('getDomains'),
  getDomainById: (id: string): Promise<CmsDomainDto | null> => repoCall('getDomainById', id),
  createDomain: (data: CreateCmsDomainDto): Promise<CmsDomainDto> => repoCall('createDomain', data),
  updateDomain: (id: string, data: UpdateCmsDomainDto): Promise<CmsDomainDto> => repoCall('updateDomain', id, data),
  deleteDomain: (id: string): Promise<void> => repoCall('deleteDomain', id),
};
