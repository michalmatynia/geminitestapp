"use client";

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type { Page, PageSummary, Slug, CmsDomain, CmsTheme, CmsThemeCreateInput, CmsThemeUpdateInput } from "@/features/cms/types";
import {
  createPage,
  deletePage,
  fetchPage,
  fetchPages,
  updatePage,
} from "@/features/cms/api/pages";
import {
  createSlug,
  deleteSlug,
  fetchSlug,
  fetchSlugs,
  fetchAllSlugs,
  fetchSlugDomains,
  updateSlug,
  updateSlugDomains,
} from "@/features/cms/api/slugs";
import {
  createDomain,
  deleteDomain,
  fetchDomains,
  updateDomain,
} from "@/features/cms/api/domains";
import {
  createTheme,
  deleteTheme,
  fetchTheme,
  fetchThemes,
  updateTheme,
} from "@/features/cms/api/themes";
import type { ImageFileRecord } from "@/shared/types/files";

const cmsKeys = {
  pages: ["cms-pages"] as const,
  page: (id: string) => ["cms-page", id] as const,
  slugs: ["cms-slugs"] as const,
  slugsAll: ["cms-slugs", "all"] as const,
  slug: (id: string) => ["cms-slug", id] as const,
  slugDomains: (id: string) => ["cms-slug-domains", id] as const,
  domains: ["cms-domains"] as const,
  themes: ["cms-themes"] as const,
  theme: (id: string) => ["cms-theme", id] as const,
};

export function useCmsPages(domainId?: string | null): UseQueryResult<PageSummary[], Error> {
  return useQuery({
    queryKey: domainId ? [...cmsKeys.pages, domainId] : cmsKeys.pages,
    queryFn: () => fetchPages(domainId),
  });
}

export function useCmsPage(id?: string): UseQueryResult<Page, Error> {
  return useQuery({
    queryKey: id ? cmsKeys.page(id) : cmsKeys.page(""),
    queryFn: () => fetchPage(id as string),
    enabled: !!id,
  });
}

export function useCreatePage(): UseMutationResult<Page, Error, { name: string; slugIds: string[] }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; slugIds: string[] }) => {
      const { ok, payload } = await createPage(input);
      if (!ok) throw new Error("Failed to create page");
      return payload;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.pages });
    },
  });
}

export function useUpdatePage(): UseMutationResult<Page, Error, { id: string; input: Page & { slugIds?: string[] } }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Page & { slugIds?: string[] } }) => {
      const { ok, payload } = await updatePage(id, input);
      if (!ok) {
        const message =
          (payload as unknown as { error?: string }).error ?? "Failed to update page";
        throw new Error(message);
      }
      return payload;
    },
    onSuccess: (_data: Page, variables: { id: string; input: Page & { slugIds?: string[] } }) => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.pages });
      void queryClient.invalidateQueries({ queryKey: cmsKeys.page(variables.id) });
    },
  });
}

export function useDeletePage(): UseMutationResult<string, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { ok } = await deletePage(id);
      if (!ok) throw new Error("Failed to delete page");
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.pages });
    },
  });
}

export function useCmsSlugs(domainId?: string | null): UseQueryResult<Slug[], Error> {
  return useQuery({
    queryKey: domainId ? [...cmsKeys.slugs, domainId] : cmsKeys.slugs,
    queryFn: () => fetchSlugs(domainId),
  });
}

export function useCmsAllSlugs(enabled: boolean = true): UseQueryResult<Slug[], Error> {
  return useQuery({
    queryKey: cmsKeys.slugsAll,
    queryFn: fetchAllSlugs,
    enabled,
  });
}

export function useCmsSlug(id?: string, domainId?: string): UseQueryResult<Slug, Error> {
  return useQuery({
    queryKey: id ? [...cmsKeys.slug(id), domainId ?? "current"] : cmsKeys.slug(""),
    queryFn: () => fetchSlug(id as string, domainId),
    enabled: !!id,
  });
}

export function useCmsSlugDomains(id?: string): UseQueryResult<{ domainIds: string[] }, Error> {
  return useQuery({
    queryKey: id ? cmsKeys.slugDomains(id) : cmsKeys.slugDomains(""),
    queryFn: () => fetchSlugDomains(id as string),
    enabled: !!id,
  });
}

export function useCreateSlug(): UseMutationResult<Slug, Error, { slug: string; domainId?: string | null }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { slug: string; domainId?: string | null }) => {
      const { ok, payload } = await createSlug(input);
      if (!ok) throw new Error("Failed to create slug");
      return payload;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.slugs });
    },
  });
}

export function useUpdateSlug(): UseMutationResult<Slug, Error, { id: string; input: Partial<Slug>; domainId?: string | null }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
      domainId,
    }: {
      id: string;
      input: Partial<Slug>;
      domainId?: string | null;
    }) => {
      const { ok, payload } = await updateSlug(id, input, domainId);
      if (!ok) throw new Error("Failed to update slug");
      return payload;
    },
    onSuccess: (_data: Slug, variables: { id: string; input: Partial<Slug>; domainId?: string | null }) => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.slugs });
      void queryClient.invalidateQueries({ queryKey: cmsKeys.slug(variables.id) });
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
    mutationFn: async ({ id, domainIds }: { id: string; domainIds: string[] }) => {
      return updateSlugDomains(id, domainIds);
    },
    onSuccess: (_data: { domainIds: string[] }, variables: { id: string; domainIds: string[] }) => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.slugDomains(variables.id) });
      void queryClient.invalidateQueries({ queryKey: cmsKeys.slugs });
    },
  });
}

export function useDeleteSlug(): UseMutationResult<string, Error, { id: string; domainId?: string | null }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, domainId }: { id: string; domainId?: string | null }) => {
      const { ok } = await deleteSlug(id, domainId);
      if (!ok) throw new Error("Failed to delete slug");
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.slugs });
    },
  });
}

// ---------------------------------------------------------------------------
// Domains
// ---------------------------------------------------------------------------

export function useCmsDomains(): UseQueryResult<CmsDomain[], Error> {
  return useQuery({
    queryKey: cmsKeys.domains,
    queryFn: fetchDomains,
  });
}

export function useCreateCmsDomain(): UseMutationResult<CmsDomain, Error, { domain: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { domain: string }) => {
      const { ok, payload } = await createDomain(input);
      if (!ok) throw new Error("Failed to create domain");
      return payload;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.domains });
    },
  });
}

export function useDeleteCmsDomain(): UseMutationResult<string, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { ok } = await deleteDomain(id);
      if (!ok) throw new Error("Failed to delete domain");
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.domains });
    },
  });
}

export function useUpdateCmsDomain(): UseMutationResult<CmsDomain, Error, { id: string; input: { aliasOf?: string | null } }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: { aliasOf?: string | null } }) => {
      const { ok, payload } = await updateDomain(id, input);
      if (!ok) throw new Error("Failed to update domain");
      return payload;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.domains });
    },
  });
}

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

export function useCmsThemes(): UseQueryResult<CmsTheme[], Error> {
  return useQuery({
    queryKey: cmsKeys.themes,
    queryFn: fetchThemes,
  });
}

export function useCmsTheme(id?: string): UseQueryResult<CmsTheme, Error> {
  return useQuery({
    queryKey: id ? cmsKeys.theme(id) : cmsKeys.theme(""),
    queryFn: () => fetchTheme(id as string),
    enabled: !!id,
  });
}

export function useCreateTheme(): UseMutationResult<CmsTheme, Error, CmsThemeCreateInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CmsThemeCreateInput) => {
      const { ok, payload } = await createTheme(input);
      if (!ok) throw new Error("Failed to create theme");
      return payload;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.themes });
    },
  });
}

export function useUpdateTheme(): UseMutationResult<CmsTheme, Error, { id: string; input: CmsThemeUpdateInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: CmsThemeUpdateInput }) => {
      const { ok, payload } = await updateTheme(id, input);
      if (!ok) throw new Error("Failed to update theme");
      return payload;
    },
    onSuccess: (_data: CmsTheme, variables: { id: string; input: CmsThemeUpdateInput }) => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.themes });
      void queryClient.invalidateQueries({ queryKey: cmsKeys.theme(variables.id) });
    },
  });
}

export function useDeleteTheme(): UseMutationResult<string, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { ok } = await deleteTheme(id);
      if (!ok) throw new Error("Failed to delete theme");
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.themes });
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
    mutationFn: async ({ file, onProgress }) => {
      const formData = new FormData();
      formData.append("file", file);
      const { uploadWithProgress } = await import("@/shared/utils/upload-with-progress");
      const result = await uploadWithProgress<ImageFileRecord>("/api/cms/media", {
        formData,
        onProgress,
      });
      if (!result.ok) {
        const data = result.data as { error?: string };
        throw new Error(data?.error ?? "Upload failed");
      }
      return result.data as ImageFileRecord;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}
