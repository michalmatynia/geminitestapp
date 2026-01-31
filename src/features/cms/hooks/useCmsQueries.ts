"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Page, Slug, CmsTheme, CmsThemeCreateInput, CmsThemeUpdateInput } from "@/features/cms/types";
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
  updateSlug,
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

const cmsKeys = {
  pages: ["cms-pages"] as const,
  page: (id: string) => ["cms-page", id] as const,
  slugs: ["cms-slugs"] as const,
  slugsAll: ["cms-slugs", "all"] as const,
  slug: (id: string) => ["cms-slug", id] as const,
  domains: ["cms-domains"] as const,
  themes: ["cms-themes"] as const,
  theme: (id: string) => ["cms-theme", id] as const,
};

export function useCmsPages(domainId?: string | null) {
  return useQuery({
    queryKey: domainId ? [...cmsKeys.pages, domainId] : cmsKeys.pages,
    queryFn: () => fetchPages(domainId),
  });
}

export function useCmsPage(id?: string) {
  return useQuery({
    queryKey: id ? cmsKeys.page(id) : cmsKeys.page(""),
    queryFn: () => fetchPage(id as string),
    enabled: !!id,
  });
}

export function useCreatePage() {
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

export function useUpdatePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Page & { slugIds?: string[] } }) => {
      const { ok, payload } = await updatePage(id, input);
      if (!ok) throw new Error("Failed to update page");
      return payload;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.pages });
      void queryClient.invalidateQueries({ queryKey: cmsKeys.page(variables.id) });
    },
  });
}

export function useDeletePage() {
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

export function useCmsSlugs(domainId?: string | null) {
  return useQuery({
    queryKey: domainId ? [...cmsKeys.slugs, domainId] : cmsKeys.slugs,
    queryFn: () => fetchSlugs(domainId),
  });
}

export function useCmsAllSlugs(enabled = true) {
  return useQuery({
    queryKey: cmsKeys.slugsAll,
    queryFn: fetchAllSlugs,
    enabled,
  });
}

export function useCmsSlug(id?: string, domainId?: string) {
  return useQuery({
    queryKey: id ? [...cmsKeys.slug(id), domainId ?? "current"] : cmsKeys.slug(""),
    queryFn: () => fetchSlug(id as string, domainId),
    enabled: !!id,
  });
}

export function useCreateSlug() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { slug: string; domainId?: string }) => {
      const { ok, payload } = await createSlug(input);
      if (!ok) throw new Error("Failed to create slug");
      return payload;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.slugs });
    },
  });
}

export function useUpdateSlug() {
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
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.slugs });
      void queryClient.invalidateQueries({ queryKey: cmsKeys.slug(variables.id) });
    },
  });
}

export function useDeleteSlug() {
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

export function useCmsDomains() {
  return useQuery({
    queryKey: cmsKeys.domains,
    queryFn: fetchDomains,
  });
}

export function useCreateCmsDomain() {
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

export function useDeleteCmsDomain() {
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

export function useUpdateCmsDomain() {
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

export function useCmsThemes() {
  return useQuery({
    queryKey: cmsKeys.themes,
    queryFn: fetchThemes,
  });
}

export function useCmsTheme(id?: string) {
  return useQuery({
    queryKey: id ? cmsKeys.theme(id) : cmsKeys.theme(""),
    queryFn: () => fetchTheme(id as string),
    enabled: !!id,
  });
}

export function useCreateTheme() {
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

export function useUpdateTheme() {
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

export function useDeleteTheme() {
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
