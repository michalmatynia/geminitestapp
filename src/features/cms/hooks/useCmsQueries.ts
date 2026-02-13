'use client';

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

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


export function useCmsPages(domainId?: string | null): UseQueryResult<PageSummary[], Error> {
  return useQuery({
    queryKey: cmsKeys.pages.list(domainId),
    queryFn: () => fetchPages(domainId),
  });
}

export function useCmsPage(id?: string): UseQueryResult<Page, Error> {
  return useQuery({
    queryKey: id ? cmsKeys.pages.detail(id) : cmsKeys.pages.detail(''),
    queryFn: () => fetchPage(id as string),
    enabled: !!id,
  });
}

export function useCreatePage(): UseMutationResult<Page, Error, { name: string; slugIds: string[] }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; slugIds: string[] }) => 
      createPage(input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to create page');
        return payload;
      }),
    onSuccess: () => {
      void invalidateCmsPages(queryClient);
    },
  });
}

export function useUpdatePage(): UseMutationResult<Page, Error, { id: string; input: Page & { slugIds?: string[] } }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Page & { slugIds?: string[] } }) => 
      updatePage(id, input).then(({ ok, payload }) => {
        if (!ok) {
          const message = (payload as unknown as { error?: string }).error ?? 'Failed to update page';
          throw new Error(message);
        }
        return payload;
      }),
    onSuccess: (_data: Page, variables: { id: string; input: Page & { slugIds?: string[] } }) => {
      void invalidateCmsPages(queryClient);
      void invalidateCmsPageDetail(queryClient, variables.id);
    },
  });
}

export function useDeletePage(): UseMutationResult<string, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => 
      deletePage(id).then(({ ok }) => {
        if (!ok) throw new Error('Failed to delete page');
        return id;
      }),
    onSuccess: () => {
      void invalidateCmsPages(queryClient);
    },
  });
}

export function useCmsSlugs(domainId?: string | null): UseQueryResult<Slug[], Error> {
  return useQuery({
    queryKey: cmsKeys.slugs.list(domainId),
    queryFn: () => fetchSlugs(domainId),
  });
}

export function useCmsAllSlugs(enabled: boolean = true): UseQueryResult<Slug[], Error> {
  return useQuery({
    queryKey: cmsKeys.slugs.allSlugs(),
    queryFn: fetchAllSlugs,
    enabled,
  });
}

export function useCmsSlug(id?: string, domainId?: string): UseQueryResult<Slug, Error> {
  return useQuery({
    queryKey: id ? cmsKeys.slugs.detailWithDomain(id, domainId) : cmsKeys.slugs.detail(''),
    queryFn: () => fetchSlug(id as string, domainId),
    enabled: !!id,
  });
}

export function useCmsSlugDomains(id?: string): UseQueryResult<{ domainIds: string[] }, Error> {
  return useQuery({
    queryKey: id ? cmsKeys.slugs.domains(id) : cmsKeys.slugs.domains(''),
    queryFn: () => fetchSlugDomains(id as string),
    enabled: !!id,
  });
}

export function useCreateSlug(): UseMutationResult<Slug, Error, { slug: string; domainId?: string | null }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { slug: string; domainId?: string | null }) => 
      createSlug(input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to create slug');
        return payload;
      }),
    onSuccess: () => {
      void invalidateCmsSlugs(queryClient);
    },
  });
}

export function useUpdateSlug(): UseMutationResult<Slug, Error, { id: string; input: Partial<Slug>; domainId?: string | null }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, domainId }: { id: string; input: Partial<Slug>; domainId?: string | null }) => 
      updateSlug(id, input, domainId).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to update slug');
        return payload;
      }),
    onSuccess: (_data: Slug, variables: { id: string; input: Partial<Slug>; domainId?: string | null }) => {
      void invalidateCmsSlugs(queryClient);
      void invalidateCmsSlugDetail(queryClient, variables.id);
    },
  });
}

export function useUpdateSlugDomains(): UseMutationResult<
  { domainIds: string[] },
  Error,
  { id: string; domainIds: string[] }
  > {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, domainIds }: { id: string; domainIds: string[] }) => updateSlugDomains(id, domainIds),
    onSuccess: (_data: { domainIds: string[] }, variables: { id: string; domainIds: string[] }) => {
      void invalidateCmsSlugDetail(queryClient, variables.id);
      void invalidateCmsSlugs(queryClient);
    },
  });
}

export function useDeleteSlug(): UseMutationResult<string, Error, { id: string; domainId?: string | null }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, domainId }: { id: string; domainId?: string | null }) => 
      deleteSlug(id, domainId).then(({ ok }) => {
        if (!ok) throw new Error('Failed to delete slug');
        return id;
      }),
    onSuccess: () => {
      void invalidateCmsSlugs(queryClient);
    },
  });
}

// ---------------------------------------------------------------------------
// Domains
// ---------------------------------------------------------------------------

export function useCmsDomains(): UseQueryResult<CmsDomain[], Error> {
  return useQuery({
    queryKey: cmsKeys.domains.all,
    queryFn: fetchDomains,
  });
}

export function useCreateCmsDomain(): UseMutationResult<CmsDomain, Error, { domain: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { domain: string }) => 
      createDomain(input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to create domain');
        return payload;
      }),
    onSuccess: () => {
      void invalidateCmsDomains(queryClient);
    },
  });
}

export function useDeleteCmsDomain(): UseMutationResult<string, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => 
      deleteDomain(id).then(({ ok }) => {
        if (!ok) throw new Error('Failed to delete domain');
        return id;
      }),
    onSuccess: () => {
      void invalidateCmsDomains(queryClient);
    },
  });
}

export function useUpdateCmsDomain(): UseMutationResult<CmsDomain, Error, { id: string; input: { aliasOf?: string | null } }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { aliasOf?: string | null } }) => 
      updateDomain(id, input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to update domain');
        return payload;
      }),
    onSuccess: () => {
      void invalidateCmsDomains(queryClient);
    },
  });
}

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

export function useCmsThemes(): UseQueryResult<CmsTheme[], Error> {
  return useQuery({
    queryKey: cmsKeys.themes.all,
    queryFn: fetchThemes,
  });
}

export function useCmsTheme(id?: string): UseQueryResult<CmsTheme, Error> {
  return useQuery({
    queryKey: id ? cmsKeys.themes.detail(id) : cmsKeys.themes.detail(''),
    queryFn: () => fetchTheme(id as string),
    enabled: !!id,
  });
}

export function useCreateTheme(): UseMutationResult<CmsTheme, Error, CmsThemeCreateInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CmsThemeCreateInput) => 
      createTheme(input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to create theme');
        return payload;
      }),
    onSuccess: () => {
      void invalidateCmsThemes(queryClient);
    },
  });
}

export function useUpdateTheme(): UseMutationResult<CmsTheme, Error, { id: string; input: CmsThemeUpdateInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CmsThemeUpdateInput }) => 
      updateTheme(id, input).then(({ ok, payload }) => {
        if (!ok) throw new Error('Failed to update theme');
        return payload;
      }),
    onSuccess: (_data: CmsTheme, variables: { id: string; input: CmsThemeUpdateInput }) => {
      void invalidateCmsThemes(queryClient);
      void invalidateCmsThemeDetail(queryClient, variables.id);
    },
  });
}

export function useDeleteTheme(): UseMutationResult<string, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => 
      deleteTheme(id).then(({ ok }) => {
        if (!ok) throw new Error('Failed to delete theme');
        return id;
      }),
    onSuccess: () => {
      void invalidateCmsThemes(queryClient);
    },
  });
}

export function useUploadCmsMedia(): UseMutationResult<
  ImageFileRecord,
  Error,
  { file: File; onProgress?: (loaded: number, total?: number) => void }
  > {
  const queryClient = useQueryClient();
  return useMutation({
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
    onSuccess: () => {
      void invalidateFiles(queryClient);
    },
  });
}
      