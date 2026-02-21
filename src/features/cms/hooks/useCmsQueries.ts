'use client';

import { useQueryClient } from '@tanstack/react-query';

import {
  createDomain,
  deleteDomain,
  fetchDomains,
  updateDomain,
} from '@/features/cms/api/domains';
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
import type { Page, PageSummary, Slug, CmsDomain, CmsTheme, CmsThemeCreateInput, CmsThemeUpdateInput } from '@/shared/contracts/cms';
import type { ImageFileRecord } from '@/shared/contracts/files';
import type { 
  ListQuery,
  SingleQuery,
  CreateMutation, 
  UpdateMutation 
} from '@/shared/contracts/ui';
import {
  createDeleteMutationV2,
  createListQueryV2,
  createSingleQueryV2,
  createCreateMutationV2,
  createUpdateMutationV2,
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
      queryKey,
      tags: ['cms', 'pages'],
    },
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
      queryKey,
      tags: ['cms', 'pages', 'detail'],
    },
  });
}

export function useCreatePage(): CreateMutation<Page, { name: string; slugIds: string[] }> {
  const queryClient = useQueryClient();
  return createCreateMutationV2({
    mutationFn: (input: { name: string; slugIds: string[] }) => 
      createPage(input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to create page');
        return payload;
      }),
    mutationKey: cmsKeys.pages.lists(),
    meta: {
      source: 'cms.hooks.useCreatePage',
      operation: 'create',
      resource: 'cms.pages',
      mutationKey: cmsKeys.pages.lists(),
      tags: ['cms', 'pages', 'create'],
    },
    onSuccess: () => {
      void invalidateCmsPages(queryClient);
    },
  });
}

export function useUpdatePage(): UpdateMutation<Page, { id: string; input: Page & { slugIds?: string[] } }> {
  const queryClient = useQueryClient();
  return createUpdateMutationV2({
    mutationFn: ({ id, input }: { id: string; input: Page & { slugIds?: string[] } }) => 
      updatePage(id, input).then(({ ok, payload }) => {
        if (!ok) {
          const message = (payload as unknown as { error?: string }).error ?? 'Failed to update page';
          throw new Error(message);
        }
        return payload;
      }),
    mutationKey: cmsKeys.pages.lists(),
    meta: {
      source: 'cms.hooks.useUpdatePage',
      operation: 'update',
      resource: 'cms.pages',
      mutationKey: cmsKeys.pages.lists(),
      tags: ['cms', 'pages', 'update'],
    },
    onSuccess: (_data: Page, variables: { id: string; input: Page & { slugIds?: string[] } }) => {
      void invalidateCmsPages(queryClient);
      void invalidateCmsPageDetail(queryClient, variables.id);
    },
  });
}

export function useDeletePage(): UpdateMutation<string, string> {
  const queryClient = useQueryClient();
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
      mutationKey: cmsKeys.pages.lists(),
      tags: ['cms', 'pages', 'delete'],
    },
    onSuccess: () => {
      void invalidateCmsPages(queryClient);
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
      queryKey,
      tags: ['cms', 'slugs'],
    },
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
      queryKey,
      tags: ['cms', 'slugs', 'all'],
    },
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
      queryKey,
      tags: ['cms', 'slugs', 'detail'],
    },
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
      queryKey,
      tags: ['cms', 'slugs', 'domains'],
    },
  });
}

export function useCreateSlug(): CreateMutation<Slug, { slug: string; domainId?: string | null }> {
  const queryClient = useQueryClient();
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
      mutationKey: cmsKeys.slugs.lists(),
      tags: ['cms', 'slugs', 'create'],
    },
    onSuccess: () => {
      void invalidateCmsSlugs(queryClient);
    },
  });
}

export function useUpdateSlug(): UpdateMutation<Slug, { id: string; input: Partial<Slug>; domainId?: string | null }> {
  const queryClient = useQueryClient();
  return createUpdateMutationV2({
    mutationFn: ({ id, input, domainId }: { id: string; input: Partial<Slug>; domainId?: string | null }) => 
      updateSlug(id, input, domainId).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to update slug');
        return payload;
      }),
    mutationKey: cmsKeys.slugs.lists(),
    meta: {
      source: 'cms.hooks.useUpdateSlug',
      operation: 'update',
      resource: 'cms.slugs',
      mutationKey: cmsKeys.slugs.lists(),
      tags: ['cms', 'slugs', 'update'],
    },
    onSuccess: (_data: Slug, variables: { id: string; input: Partial<Slug>; domainId?: string | null }) => {
      void invalidateCmsSlugs(queryClient);
      void invalidateCmsSlugDetail(queryClient, variables.id);
    },
  });
}

export function useUpdateSlugDomains(): UpdateMutation<
  { domainIds: string[] },
  { id: string; domainIds: string[] }
  > {
  const queryClient = useQueryClient();
  return createUpdateMutationV2({
    mutationFn: ({ id, domainIds }: { id: string; domainIds: string[] }) => updateSlugDomains(id, domainIds),
    mutationKey: cmsKeys.slugs.lists(),
    meta: {
      source: 'cms.hooks.useUpdateSlugDomains',
      operation: 'update',
      resource: 'cms.slugs.domains',
      mutationKey: cmsKeys.slugs.lists(),
      tags: ['cms', 'slugs', 'domains', 'update'],
    },
    onSuccess: (_data: { domainIds: string[] }, variables: { id: string; domainIds: string[] }) => {
      void invalidateCmsSlugDetail(queryClient, variables.id);
      void invalidateCmsSlugs(queryClient);
    },
  });
}

export function useDeleteSlug(): UpdateMutation<string, { id: string; domainId?: string | null }> {
  const queryClient = useQueryClient();
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
      mutationKey: cmsKeys.slugs.lists(),
      tags: ['cms', 'slugs', 'delete'],
    },
    onSuccess: () => {
      void invalidateCmsSlugs(queryClient);
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
      queryKey,
      tags: ['cms', 'domains'],
    },
  });
}

export function useCreateCmsDomain(): CreateMutation<CmsDomain, { domain: string }> {
  const queryClient = useQueryClient();
  return createCreateMutationV2({
    mutationFn: (input: { domain: string }) => 
      createDomain(input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to create domain');
        return payload;
      }),
    mutationKey: cmsKeys.domains.lists(),
    meta: {
      source: 'cms.hooks.useCreateCmsDomain',
      operation: 'create',
      resource: 'cms.domains',
      mutationKey: cmsKeys.domains.lists(),
      tags: ['cms', 'domains', 'create'],
    },
    onSuccess: () => {
      void invalidateCmsDomains(queryClient);
    },
  });
}

export function useDeleteCmsDomain(): UpdateMutation<string, string> {
  const queryClient = useQueryClient();
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
      mutationKey: cmsKeys.domains.lists(),
      tags: ['cms', 'domains', 'delete'],
    },
    onSuccess: () => {
      void invalidateCmsDomains(queryClient);
    },
  });
}

export function useUpdateCmsDomain(): UpdateMutation<CmsDomain, { id: string; input: { aliasOf?: string | null } }> {
  const queryClient = useQueryClient();
  return createUpdateMutationV2({
    mutationFn: ({ id, input }: { id: string; input: { aliasOf?: string | null } }) => 
      updateDomain(id, input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to update domain');
        return payload;
      }),
    mutationKey: cmsKeys.domains.lists(),
    meta: {
      source: 'cms.hooks.useUpdateCmsDomain',
      operation: 'update',
      resource: 'cms.domains',
      mutationKey: cmsKeys.domains.lists(),
      tags: ['cms', 'domains', 'update'],
    },
    onSuccess: () => {
      void invalidateCmsDomains(queryClient);
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
      queryKey,
      tags: ['cms', 'themes'],
    },
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
      queryKey,
      tags: ['cms', 'themes', 'detail'],
    },
  });
}

export function useCreateTheme(): CreateMutation<CmsTheme, CmsThemeCreateInput> {
  const queryClient = useQueryClient();
  return createCreateMutationV2({
    mutationFn: (input: CmsThemeCreateInput) => 
      createTheme(input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to create theme');
        return payload;
      }),
    mutationKey: cmsKeys.themes.lists(),
    meta: {
      source: 'cms.hooks.useCreateTheme',
      operation: 'create',
      resource: 'cms.themes',
      mutationKey: cmsKeys.themes.lists(),
      tags: ['cms', 'themes', 'create'],
    },
    onSuccess: () => {
      void invalidateCmsThemes(queryClient);
    },
  });
}

export function useUpdateTheme(): UpdateMutation<CmsTheme, { id: string; input: CmsThemeUpdateInput }> {
  const queryClient = useQueryClient();
  return createUpdateMutationV2({
    mutationFn: ({ id, input }: { id: string; input: CmsThemeUpdateInput }) => 
      updateTheme(id, input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to update theme');
        return payload;
      }),
    mutationKey: cmsKeys.themes.lists(),
    meta: {
      source: 'cms.hooks.useUpdateTheme',
      operation: 'update',
      resource: 'cms.themes',
      mutationKey: cmsKeys.themes.lists(),
      tags: ['cms', 'themes', 'update'],
    },
    onSuccess: (_data: CmsTheme, variables: { id: string; input: CmsThemeUpdateInput }) => {
      void invalidateCmsThemes(queryClient);
      void invalidateCmsThemeDetail(queryClient, variables.id);
    },
  });
}

export function useDeleteTheme(): UpdateMutation<string, string> {
  const queryClient = useQueryClient();
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
      mutationKey: cmsKeys.themes.lists(),
      tags: ['cms', 'themes', 'delete'],
    },
    onSuccess: () => {
      void invalidateCmsThemes(queryClient);
    },
  });
}

export function useUploadCmsMedia(): CreateMutation<
  ImageFileRecord,
  { file: File; onProgress?: (loaded: number, total?: number) => void }
  > {
  const queryClient = useQueryClient();
  return createCreateMutationV2({
    mutationFn: async ({ file, onProgress }: { file: File; onProgress?: (loaded: number, total?: number) => void }): Promise<ImageFileRecord> => {
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
      mutationKey: cmsKeys.mutation('upload-media'),
      tags: ['cms', 'media', 'upload'],
    },
    onSuccess: () => {
      void invalidateFiles(queryClient);
    },
  });
}
      
