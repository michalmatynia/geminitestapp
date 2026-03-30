import { createDomain, deleteDomain, fetchDomains, updateDomain } from '@/features/cms/api/domains';
import {
  createPage,
  deletePage,
  fetchPage,
  fetchPages,
  updatePage,
} from '@/features/cms/api/pages';
import {
  createSlug,
  deleteSlug,
  fetchSlug,
  fetchSlugs,
  fetchAllSlugs,
  fetchSlugDomains,
  updateSlug,
  updateSlugDomains,
} from '@/features/cms/api/slugs';
import {
  createTheme,
  deleteTheme,
  fetchTheme,
  fetchThemes,
  updateTheme,
} from '@/features/cms/api/themes';
import type {
  CmsDomainCreateRequestDto,
  CmsDomainUpdateRequestDto,
  CmsPageCreateRequestDto,
  CmsPageUpdateRequestDto,
  Page,
  PageSummary,
  Slug,
  CmsDomain,
  CmsTheme,
  CmsThemeCreateRequestDto,
  CmsThemeUpdateRequestDto,
} from '@/shared/contracts/cms';
import type { IdInputDto } from '@/shared/contracts/base';
import type { ImageFileRecord } from '@/shared/contracts/files';
import type { ListQuery, SingleQuery, CreateMutation, UpdateMutation } from '@/shared/contracts/ui';
import {
  createDeleteMutationV2,
  createListQueryV2,
  createSingleQueryV2,
  createCreateMutationV2,
  createUpdateMutationV2,
  createMutationV2,
} from '@/shared/lib/query-factories-v2';
import {
  invalidateCmsPages,
  invalidateCmsPageDetail,
  invalidateCmsSlugs,
  invalidateCmsSlugDetail,
  invalidateCmsDomains,
  invalidateCmsThemes,
  invalidateCmsThemeDetail,
  invalidateFiles,
} from '@/shared/lib/query-invalidation';
import { cmsKeys } from '@/shared/lib/query-key-exports';

export function useCmsPages(domainId?: string | null): ListQuery<PageSummary> {
  const queryKey = cmsKeys.pages.list(domainId);
  return createListQueryV2({
    queryKey,
    queryFn: () => fetchPages(domainId),
    meta: {
      source: 'cms.hooks.useCmsPages',
      operation: 'list',
      resource: 'cms.pages',
      domain: 'cms',

      tags: ['cms', 'pages'],
      description: 'Loads cms pages.'},
  });
}

export function useCmsPage(id?: string): SingleQuery<Page> {
  const queryKey = id ? cmsKeys.pages.detail(id) : cmsKeys.pages.detail('');
  return createSingleQueryV2({
    id,
    queryKey,
    queryFn: () => fetchPage(id as string),
    enabled: !!id,
    meta: {
      source: 'cms.hooks.useCmsPage',
      operation: 'detail',
      resource: 'cms.pages.detail',
      domain: 'cms',

      tags: ['cms', 'pages', 'detail'],
      description: 'Loads cms pages detail.'},
  });
}

export function useCreatePage(): CreateMutation<Page, CmsPageCreateRequestDto> {
  return createCreateMutationV2({
    mutationFn: (input: CmsPageCreateRequestDto) =>
      createPage(input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to create page');
        return payload;
      }),
    mutationKey: cmsKeys.pages.lists(),
    meta: {
      source: 'cms.hooks.useCreatePage',
      operation: 'create',
      resource: 'cms.pages',
      domain: 'cms',

      tags: ['cms', 'pages', 'create'],
      description: 'Creates cms pages.'},
    invalidate: async (queryClient) => {
      await invalidateCmsPages(queryClient);
    },
  });
}

export function useUpdatePage(): UpdateMutation<
  Page,
  IdInputDto<CmsPageUpdateRequestDto>
  > {
  return createUpdateMutationV2({
    mutationFn: ({ id, input }: IdInputDto<CmsPageUpdateRequestDto>) =>
      updatePage(id, input).then(({ ok, payload }) => {
        if (!ok) {
          const message = (payload as { error?: string }).error ?? 'Failed to update page';
          throw new Error(message);
        }
        return payload;
      }),
    mutationKey: cmsKeys.pages.lists(),
    meta: {
      source: 'cms.hooks.useUpdatePage',
      operation: 'update',
      resource: 'cms.pages',
      domain: 'cms',

      tags: ['cms', 'pages', 'update'],
      description: 'Updates cms pages.'},
    invalidate: async (queryClient, _data, variables) => {
      await invalidateCmsPages(queryClient);
      await invalidateCmsPageDetail(queryClient, variables.id);
    },
  });
}

export function useDeletePage(): UpdateMutation<string, string> {
  return createDeleteMutationV2({
    mutationFn: (id: string) =>
      deletePage(id).then(({ ok }) => {
        if (!ok) throw new Error('Failed to delete page');
        return id;
      }),
    mutationKey: cmsKeys.pages.lists(),
    meta: {
      source: 'cms.hooks.useDeletePage',
      operation: 'delete',
      resource: 'cms.pages',
      domain: 'cms',

      tags: ['cms', 'pages', 'delete'],
      description: 'Deletes cms pages.'},
    invalidate: async (queryClient) => {
      await invalidateCmsPages(queryClient);
    },
  });
}

export function useCmsSlugs(domainId?: string | null): ListQuery<Slug> {
  const queryKey = cmsKeys.slugs.list(domainId);
  return createListQueryV2({
    queryKey,
    queryFn: () => fetchSlugs(domainId),
    meta: {
      source: 'cms.hooks.useCmsSlugs',
      operation: 'list',
      resource: 'cms.slugs',
      domain: 'cms',

      tags: ['cms', 'slugs'],
      description: 'Loads cms slugs.'},
  });
}

export function useCmsAllSlugs(enabled: boolean = true): ListQuery<Slug> {
  const queryKey = cmsKeys.slugs.allSlugs();
  return createListQueryV2({
    queryKey,
    queryFn: fetchAllSlugs,
    enabled,
    meta: {
      source: 'cms.hooks.useCmsAllSlugs',
      operation: 'list',
      resource: 'cms.slugs.all',
      domain: 'cms',

      tags: ['cms', 'slugs', 'all'],
      description: 'Loads cms slugs all.'},
  });
}

export function useCmsSlug(id?: string, domainId?: string): SingleQuery<Slug> {
  const queryKey = id ? cmsKeys.slugs.detailWithDomain(id, domainId) : cmsKeys.slugs.detail('');
  return createSingleQueryV2({
    id,
    queryKey,
    queryFn: () => fetchSlug(id as string, domainId),
    enabled: !!id,
    meta: {
      source: 'cms.hooks.useCmsSlug',
      operation: 'detail',
      resource: 'cms.slugs.detail',
      domain: 'cms',

      tags: ['cms', 'slugs', 'detail'],
      description: 'Loads cms slugs detail.'},
  });
}

export function useCmsSlugDomains(id?: string): SingleQuery<{ domainIds: string[] }> {
  const queryKey = id ? cmsKeys.slugs.domains(id) : cmsKeys.slugs.domains('');
  return createSingleQueryV2({
    id,
    queryKey,
    queryFn: () => fetchSlugDomains(id as string),
    enabled: !!id,
    meta: {
      source: 'cms.hooks.useCmsSlugDomains',
      operation: 'detail',
      resource: 'cms.slugs.domains',
      domain: 'cms',

      tags: ['cms', 'slugs', 'domains'],
      description: 'Loads cms slugs domains.'},
  });
}

export function useCreateSlug(): CreateMutation<Slug, { slug: string; domainId?: string | null }> {
  return createCreateMutationV2({
    mutationFn: (input: { slug: string; domainId?: string | null }) =>
      createSlug(input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to create slug');
        return payload;
      }),
    mutationKey: cmsKeys.slugs.lists(),
    meta: {
      source: 'cms.hooks.useCreateSlug',
      operation: 'create',
      resource: 'cms.slugs',
      domain: 'cms',

      tags: ['cms', 'slugs', 'create'],
      description: 'Creates cms slugs.'},
    invalidate: async (queryClient) => {
      await invalidateCmsSlugs(queryClient);
    },
  });
}

export function useUpdateSlug(): UpdateMutation<
  Slug,
  IdInputDto<Partial<Slug>> & { domainId?: string | null }
  > {
  return createUpdateMutationV2({
    mutationFn: ({
      id,
      input,
      domainId,
    }: IdInputDto<Partial<Slug>> & { domainId?: string | null }) =>
      updateSlug(id, input, domainId).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to update slug');
        return payload;
      }),
    mutationKey: cmsKeys.slugs.lists(),
    meta: {
      source: 'cms.hooks.useUpdateSlug',
      operation: 'update',
      resource: 'cms.slugs',
      domain: 'cms',

      tags: ['cms', 'slugs', 'update'],
      description: 'Updates cms slugs.'},
    invalidate: async (queryClient, _data, variables) => {
      await invalidateCmsSlugs(queryClient);
      await invalidateCmsSlugDetail(queryClient, variables.id);
    },
  });
}

export function useUpdateSlugDomains(): UpdateMutation<
  { domainIds: string[] },
  { id: string; domainIds: string[] }
  > {
  return createUpdateMutationV2({
    mutationFn: ({ id, domainIds }: { id: string; domainIds: string[] }) =>
      updateSlugDomains(id, domainIds),
    mutationKey: cmsKeys.slugs.lists(),
    meta: {
      source: 'cms.hooks.useUpdateSlugDomains',
      operation: 'update',
      resource: 'cms.slugs.domains',
      domain: 'cms',

      tags: ['cms', 'slugs', 'domains', 'update'],
      description: 'Updates cms slugs domains.'},
    invalidate: (queryClient, _data, variables) => {
      void invalidateCmsSlugDetail(queryClient, variables.id);
      return invalidateCmsSlugs(queryClient);
    },
  });
}

export function useDeleteSlug(): UpdateMutation<string, { id: string; domainId?: string | null }> {
  return createDeleteMutationV2({
    mutationFn: ({ id, domainId }: { id: string; domainId?: string | null }) =>
      deleteSlug(id, domainId).then(({ ok }) => {
        if (!ok) throw new Error('Failed to delete slug');
        return id;
      }),
    mutationKey: cmsKeys.slugs.lists(),
    meta: {
      source: 'cms.hooks.useDeleteSlug',
      operation: 'delete',
      resource: 'cms.slugs',
      domain: 'cms',

      tags: ['cms', 'slugs', 'delete'],
      description: 'Deletes cms slugs.'},
    invalidate: async (queryClient) => {
      await invalidateCmsSlugs(queryClient);
    },
  });
}

// ---------------------------------------------------------------------------
// Domains
// ---------------------------------------------------------------------------

export function useCmsDomains(): ListQuery<CmsDomain> {
  const queryKey = cmsKeys.domains.lists();
  return createListQueryV2({
    queryKey,
    queryFn: fetchDomains,
    meta: {
      source: 'cms.hooks.useCmsDomains',
      operation: 'list',
      resource: 'cms.domains',
      domain: 'cms',

      tags: ['cms', 'domains'],
      description: 'Loads cms domains.'},
  });
}

export function useCreateCmsDomain(): CreateMutation<CmsDomain, CmsDomainCreateRequestDto> {
  return createCreateMutationV2({
    mutationFn: (input: CmsDomainCreateRequestDto) =>
      createDomain(input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to create domain');
        return payload;
      }),
    mutationKey: cmsKeys.domains.lists(),
    meta: {
      source: 'cms.hooks.useCreateCmsDomain',
      operation: 'create',
      resource: 'cms.domains',
      domain: 'cms',

      tags: ['cms', 'domains', 'create'],
      description: 'Creates cms domains.'},
    invalidate: async (queryClient) => {
      await invalidateCmsDomains(queryClient);
    },
  });
}

export function useDeleteCmsDomain(): UpdateMutation<string, string> {
  return createDeleteMutationV2({
    mutationFn: (id: string) =>
      deleteDomain(id).then(({ ok }) => {
        if (!ok) throw new Error('Failed to delete domain');
        return id;
      }),
    mutationKey: cmsKeys.domains.lists(),
    meta: {
      source: 'cms.hooks.useDeleteCmsDomain',
      operation: 'delete',
      resource: 'cms.domains',
      domain: 'cms',

      tags: ['cms', 'domains', 'delete'],
      description: 'Deletes cms domains.'},
    invalidate: async (queryClient) => {
      await invalidateCmsDomains(queryClient);
    },
  });
}

export function useUpdateCmsDomain(): UpdateMutation<
  CmsDomain,
  IdInputDto<CmsDomainUpdateRequestDto>
  > {
  return createUpdateMutationV2({
    mutationFn: ({ id, input }: IdInputDto<CmsDomainUpdateRequestDto>) =>
      updateDomain(id, input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to update domain');
        return payload;
      }),
    mutationKey: cmsKeys.domains.lists(),
    meta: {
      source: 'cms.hooks.useUpdateCmsDomain',
      operation: 'update',
      resource: 'cms.domains',
      domain: 'cms',

      tags: ['cms', 'domains', 'update'],
      description: 'Updates cms domains.'},
    invalidate: async (queryClient) => {
      await invalidateCmsDomains(queryClient);
    },
  });
}

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

export function useCmsThemes(): ListQuery<CmsTheme> {
  const queryKey = cmsKeys.themes.lists();
  return createListQueryV2({
    queryKey,
    queryFn: fetchThemes,
    meta: {
      source: 'cms.hooks.useCmsThemes',
      operation: 'list',
      resource: 'cms.themes',
      domain: 'cms',

      tags: ['cms', 'themes'],
      description: 'Loads cms themes.'},
  });
}

export function useCmsTheme(id?: string): SingleQuery<CmsTheme> {
  const queryKey = id ? cmsKeys.themes.detail(id) : cmsKeys.themes.detail('');
  return createSingleQueryV2({
    id,
    queryKey,
    queryFn: () => fetchTheme(id as string),
    enabled: !!id,
    meta: {
      source: 'cms.hooks.useCmsTheme',
      operation: 'detail',
      resource: 'cms.themes.detail',
      domain: 'cms',

      tags: ['cms', 'themes', 'detail'],
      description: 'Loads cms themes detail.'},
  });
}

export function useCreateTheme(): CreateMutation<CmsTheme, CmsThemeCreateRequestDto> {
  return createCreateMutationV2({
    mutationFn: (input: CmsThemeCreateRequestDto) =>
      createTheme(input).then((result) => {
        if (!result.ok) throw new Error(result.error || 'Failed to create theme');
        return result.payload;
      }),
    mutationKey: cmsKeys.themes.lists(),
    meta: {
      source: 'cms.hooks.useCreateTheme',
      operation: 'create',
      resource: 'cms.themes',
      domain: 'cms',

      tags: ['cms', 'themes', 'create'],
      description: 'Creates cms themes.'},
    invalidate: async (queryClient) => {
      await invalidateCmsThemes(queryClient);
    },
  });
}

export function useUpdateTheme(): UpdateMutation<
  CmsTheme,
  IdInputDto<CmsThemeUpdateRequestDto>
  > {
  return createUpdateMutationV2({
    mutationFn: ({ id, input }: IdInputDto<CmsThemeUpdateRequestDto>) =>
      updateTheme(id, input).then((result) => {
        if (!result.ok) throw new Error(result.error || 'Failed to update theme');
        return result.payload;
      }),
    mutationKey: cmsKeys.themes.lists(),
    meta: {
      source: 'cms.hooks.useUpdateTheme',
      operation: 'update',
      resource: 'cms.themes',
      domain: 'cms',

      tags: ['cms', 'themes', 'update'],
      description: 'Updates cms themes.'},
    invalidate: async (queryClient, _data, variables) => {
      await invalidateCmsThemes(queryClient);
      await invalidateCmsThemeDetail(queryClient, variables.id);
    },
  });
}

export function useDeleteTheme(): UpdateMutation<string, string> {
  return createDeleteMutationV2({
    mutationFn: (id: string) =>
      deleteTheme(id).then(({ ok }) => {
        if (!ok) throw new Error('Failed to delete theme');
        return id;
      }),
    mutationKey: cmsKeys.themes.lists(),
    meta: {
      source: 'cms.hooks.useDeleteTheme',
      operation: 'delete',
      resource: 'cms.themes',
      domain: 'cms',

      tags: ['cms', 'themes', 'delete'],
      description: 'Deletes cms themes.'},
    invalidate: async (queryClient) => {
      await invalidateCmsThemes(queryClient);
    },
  });
}

export function useUploadCmsMedia(): CreateMutation<
  ImageFileRecord,
  { file: File; onProgress?: (loaded: number, total?: number) => void }
  > {
  return createMutationV2({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (loaded: number, total?: number) => void;
    }): Promise<ImageFileRecord> => {
      const formData = new FormData();
      formData.append('file', file);
      const { uploadWithProgress } = await import('@/shared/utils/upload-with-progress');
      const result = await uploadWithProgress<ImageFileRecord>('/api/cms/media', {
        formData,
        onProgress,
      });
      if (!result.ok) {
        const data = result.data as { error?: string };
        throw new Error(data?.error ?? 'Upload failed');
      }
      return result.data;
    },
    mutationKey: cmsKeys.mutation('upload-media'),
    meta: {
      source: 'cms.hooks.useUploadCmsMedia',
      operation: 'upload',
      resource: 'cms.media',
      domain: 'cms',

      tags: ['cms', 'media', 'upload'],
      description: 'Uploads cms media.'},
    invalidate: async (queryClient) => {
      await invalidateFiles(queryClient);
    },
  });
}
