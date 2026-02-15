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
import type { Page, PageSummary, Slug, CmsDomain, CmsTheme, CmsThemeCreateInput, CmsThemeUpdateInput } from '@/features/cms/types';
import {
  createListQuery,
  createSingleQuery,
  createCreateMutation,
  createUpdateMutation,
} from '@/shared/lib/query-factories';
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
import type { ImageFileRecord } from '@/shared/types/domain/files';
import type { 
  ListQuery,
  SingleQuery,
  CreateMutation, 
  UpdateMutation 
} from '@/shared/types/query-result-types';


export function useCmsPages(domainId?: string | null): ListQuery<PageSummary> {
  return createListQuery({
    queryKey: cmsKeys.pages.list(domainId),
    queryFn: () => fetchPages(domainId),
  });
}

export function useCmsPage(id?: string): SingleQuery<Page> {
  return createSingleQuery({
    id,
    queryKey: id ? cmsKeys.pages.detail(id) : cmsKeys.pages.detail(''),
    queryFn: () => fetchPage(id as string),
    options: {
      enabled: !!id,
    },
  });
}

export function useCreatePage(): CreateMutation<Page, { name: string; slugIds: string[] }> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: (input: { name: string; slugIds: string[] }) => 
      createPage(input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to create page');
        return payload;
      }),
    options: {
      onSuccess: () => {
        void invalidateCmsPages(queryClient);
      },
    },
  });
}

export function useUpdatePage(): UpdateMutation<Page, { id: string; input: Page & { slugIds?: string[] } }> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: ({ id, input }: { id: string; input: Page & { slugIds?: string[] } }) => 
      updatePage(id, input).then(({ ok, payload }) => {
        if (!ok) {
          const message = (payload as unknown as { error?: string }).error ?? 'Failed to update page';
          throw new Error(message);
        }
        return payload;
      }),
    options: {
      onSuccess: (_data: Page, variables: { id: string; input: Page & { slugIds?: string[] } }) => {
        void invalidateCmsPages(queryClient);
        void invalidateCmsPageDetail(queryClient, variables.id);
      },
    },
  });
}

export function useDeletePage(): UpdateMutation<string, string> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: (id: string) => 
      deletePage(id).then(({ ok }) => {
        if (!ok) throw new Error('Failed to delete page');
        return id;
      }),
    options: {
      onSuccess: () => {
        void invalidateCmsPages(queryClient);
      },
    },
  });
}

export function useCmsSlugs(domainId?: string | null): ListQuery<Slug> {
  return createListQuery({
    queryKey: cmsKeys.slugs.list(domainId),
    queryFn: () => fetchSlugs(domainId),
  });
}

export function useCmsAllSlugs(enabled: boolean = true): ListQuery<Slug> {
  return createListQuery({
    queryKey: cmsKeys.slugs.allSlugs(),
    queryFn: fetchAllSlugs,
    options: {
      enabled,
    },
  });
}

export function useCmsSlug(id?: string, domainId?: string): SingleQuery<Slug> {
  return createSingleQuery({
    id,
    queryKey: id ? cmsKeys.slugs.detailWithDomain(id, domainId) : cmsKeys.slugs.detail(''),
    queryFn: () => fetchSlug(id as string, domainId),
    options: {
      enabled: !!id,
    },
  });
}

export function useCmsSlugDomains(id?: string): SingleQuery<{ domainIds: string[] }> {
  return createSingleQuery({
    id,
    queryKey: id ? cmsKeys.slugs.domains(id) : cmsKeys.slugs.domains(''),
    queryFn: () => fetchSlugDomains(id as string),
    options: {
      enabled: !!id,
    },
  });
}

export function useCreateSlug(): CreateMutation<Slug, { slug: string; domainId?: string | null }> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: (input: { slug: string; domainId?: string | null }) => 
      createSlug(input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to create slug');
        return payload;
      }),
    options: {
      onSuccess: () => {
        void invalidateCmsSlugs(queryClient);
      },
    },
  });
}

export function useUpdateSlug(): UpdateMutation<Slug, { id: string; input: Partial<Slug>; domainId?: string | null }> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: ({ id, input, domainId }: { id: string; input: Partial<Slug>; domainId?: string | null }) => 
      updateSlug(id, input, domainId).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to update slug');
        return payload;
      }),
    options: {
      onSuccess: (_data: Slug, variables: { id: string; input: Partial<Slug>; domainId?: string | null }) => {
        void invalidateCmsSlugs(queryClient);
        void invalidateCmsSlugDetail(queryClient, variables.id);
      },
    },
  });
}

export function useUpdateSlugDomains(): UpdateMutation<
  { domainIds: string[] },
  { id: string; domainIds: string[] }
  > {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: ({ id, domainIds }: { id: string; domainIds: string[] }) => updateSlugDomains(id, domainIds),
    options: {
      onSuccess: (_data: { domainIds: string[] }, variables: { id: string; domainIds: string[] }) => {
        void invalidateCmsSlugDetail(queryClient, variables.id);
        void invalidateCmsSlugs(queryClient);
      },
    },
  });
}

export function useDeleteSlug(): UpdateMutation<string, { id: string; domainId?: string | null }> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: ({ id, domainId }: { id: string; domainId?: string | null }) => 
      deleteSlug(id, domainId).then(({ ok }) => {
        if (!ok) throw new Error('Failed to delete slug');
        return id;
      }),
    options: {
      onSuccess: () => {
        void invalidateCmsSlugs(queryClient);
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Domains
// ---------------------------------------------------------------------------

export function useCmsDomains(): ListQuery<CmsDomain> {
  return createListQuery({
    queryKey: cmsKeys.domains.lists(),
    queryFn: fetchDomains,
  });
}

export function useCreateCmsDomain(): CreateMutation<CmsDomain, { domain: string }> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: (input: { domain: string }) => 
      createDomain(input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to create domain');
        return payload;
      }),
    options: {
      onSuccess: () => {
        void invalidateCmsDomains(queryClient);
      },
    },
  });
}

export function useDeleteCmsDomain(): UpdateMutation<string, string> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: (id: string) => 
      deleteDomain(id).then(({ ok }) => {
        if (!ok) throw new Error('Failed to delete domain');
        return id;
      }),
    options: {
      onSuccess: () => {
        void invalidateCmsDomains(queryClient);
      },
    },
  });
}

export function useUpdateCmsDomain(): UpdateMutation<CmsDomain, { id: string; input: { aliasOf?: string | null } }> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: ({ id, input }: { id: string; input: { aliasOf?: string | null } }) => 
      updateDomain(id, input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to update domain');
        return payload;
      }),
    options: {
      onSuccess: () => {
        void invalidateCmsDomains(queryClient);
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

export function useCmsThemes(): ListQuery<CmsTheme> {
  return createListQuery({
    queryKey: cmsKeys.themes.lists(),
    queryFn: fetchThemes,
  });
}

export function useCmsTheme(id?: string): SingleQuery<CmsTheme> {
  return createSingleQuery({
    id,
    queryKey: id ? cmsKeys.themes.detail(id) : cmsKeys.themes.detail(''),
    queryFn: () => fetchTheme(id as string),
    options: {
      enabled: !!id,
    },
  });
}

export function useCreateTheme(): CreateMutation<CmsTheme, CmsThemeCreateInput> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: (input: CmsThemeCreateInput) => 
      createTheme(input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to create theme');
        return payload;
      }),
    options: {
      onSuccess: () => {
        void invalidateCmsThemes(queryClient);
      },
    },
  });
}

export function useUpdateTheme(): UpdateMutation<CmsTheme, { id: string; input: CmsThemeUpdateInput }> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: ({ id, input }: { id: string; input: CmsThemeUpdateInput }) => 
      updateTheme(id, input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to update theme');
        return payload;
      }),
    options: {
      onSuccess: (_data: CmsTheme, variables: { id: string; input: CmsThemeUpdateInput }) => {
        void invalidateCmsThemes(queryClient);
        void invalidateCmsThemeDetail(queryClient, variables.id);
      },
    },
  });
}

export function useDeleteTheme(): UpdateMutation<string, string> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: (id: string) => 
      deleteTheme(id).then(({ ok }) => {
        if (!ok) throw new Error('Failed to delete theme');
        return id;
      }),
    options: {
      onSuccess: () => {
        void invalidateCmsThemes(queryClient);
      },
    },
  });
}

export function useUploadCmsMedia(): CreateMutation<
  ImageFileRecord,
  { file: File; onProgress?: (loaded: number, total?: number) => void }
  > {
  const queryClient = useQueryClient();
  return createCreateMutation({
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
    options: {
      onSuccess: () => {
        void invalidateFiles(queryClient);
      },
    },
  });
}
      