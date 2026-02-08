import 'server-only';

import type { Page, Slug, PageComponent, CmsTheme, CmsThemeCreateInput, CmsThemeUpdateInput } from '@/features/cms/types';
import type { CmsRepository, PageUpdateData } from '@/features/cms/types/services/cms-repository';
import { ErrorSystem } from '@/features/observability/server';

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
  createPage: (data: { name: string }): Promise<Page> => repoCall('createPage', data),
  updatePage: (id: string, data: PageUpdateData): Promise<Page | null> => repoCall('updatePage', id, data),
  deletePage: (id: string): Promise<Page | null> => repoCall('deletePage', id),
  replacePageSlugs: (pageId: string, slugIds: string[]): Promise<void> => repoCall('replacePageSlugs', pageId, slugIds),
  replacePageComponents: (pageId: string, components: PageComponent[]): Promise<void> => repoCall('replacePageComponents', pageId, components),

  // Slugs
  getSlugs: (): Promise<Slug[]> => repoCall('getSlugs'),
  getSlugById: (id: string): Promise<Slug | null> => repoCall('getSlugById', id),
  getSlugByValue: (slug: string): Promise<Slug | null> => repoCall('getSlugByValue', slug),
  createSlug: (data: { slug: string; isDefault?: boolean | undefined }): Promise<Slug> => repoCall('createSlug', data),
  updateSlug: (id: string, data: { slug?: string | undefined; isDefault?: boolean | undefined }): Promise<Slug | null> => repoCall('updateSlug', id, data),
  deleteSlug: (id: string): Promise<Slug | null> => repoCall('deleteSlug', id),

  // Relationships
  addSlugToPage: (pageId: string, slugId: string): Promise<void> => repoCall('addSlugToPage', pageId, slugId),
  removeSlugFromPage: (pageId: string, slugId: string): Promise<void> => repoCall('removeSlugFromPage', pageId, slugId),

  // Themes
  getThemes: (): Promise<CmsTheme[]> => repoCall('getThemes'),
  getThemeById: (id: string): Promise<CmsTheme | null> => repoCall('getThemeById', id),
  createTheme: (data: CmsThemeCreateInput): Promise<CmsTheme> => repoCall('createTheme', data),
  updateTheme: (id: string, data: CmsThemeUpdateInput): Promise<CmsTheme | null> => repoCall('updateTheme', id, data),
  deleteTheme: (id: string): Promise<CmsTheme | null> => repoCall('deleteTheme', id),
};
