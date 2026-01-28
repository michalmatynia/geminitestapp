"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Page, Slug } from "@/features/cms/types";
import {
  createPage,
  deletePage,
  fetchPage,
  fetchPages,
  updatePage,
} from "@/features/cms/api/pages";
import {
  createBlock,
  deleteBlock,
  fetchBlock,
  fetchBlocks,
  updateBlock,
} from "@/features/cms/api/blocks";
import {
  createSlug,
  deleteSlug,
  fetchSlug,
  fetchSlugs,
  updateSlug,
} from "@/features/cms/api/slugs";

const cmsKeys = {
  pages: ["cms-pages"] as const,
  page: (id: string) => ["cms-page", id] as const,
  blocks: ["cms-blocks"] as const,
  block: (id: string) => ["cms-block", id] as const,
  slugs: ["cms-slugs"] as const,
  slug: (id: string) => ["cms-slug", id] as const,
};

export function useCmsPages() {
  return useQuery({
    queryKey: cmsKeys.pages,
    queryFn: fetchPages,
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
    mutationFn: async ({ id, input }: { id: string; input: Page }) => {
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

export function useCmsBlocks() {
  return useQuery({
    queryKey: cmsKeys.blocks,
    queryFn: fetchBlocks,
  });
}

export function useCmsBlock(id?: string) {
  return useQuery({
    queryKey: id ? cmsKeys.block(id) : cmsKeys.block(""),
    queryFn: () => fetchBlock(id as string),
    enabled: !!id,
  });
}

export function useCreateBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; content: unknown }) => {
      const { ok, payload } = await createBlock(input);
      if (!ok) throw new Error("Failed to create block");
      return payload;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.blocks });
    },
  });
}

export function useUpdateBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: { name: string; content: unknown } }) => {
      const { ok, payload } = await updateBlock(id, input);
      if (!ok) throw new Error("Failed to update block");
      return payload;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.blocks });
      void queryClient.invalidateQueries({ queryKey: cmsKeys.block(variables.id) });
    },
  });
}

export function useDeleteBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { ok } = await deleteBlock(id);
      if (!ok) throw new Error("Failed to delete block");
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.blocks });
    },
  });
}

export function useCmsSlugs() {
  return useQuery({
    queryKey: cmsKeys.slugs,
    queryFn: fetchSlugs,
  });
}

export function useCmsSlug(id?: string) {
  return useQuery({
    queryKey: id ? cmsKeys.slug(id) : cmsKeys.slug(""),
    queryFn: () => fetchSlug(id as string),
    enabled: !!id,
  });
}

export function useCreateSlug() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { slug: string }) => {
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
    mutationFn: async ({ id, input }: { id: string; input: Partial<Slug> }) => {
      const { ok, payload } = await updateSlug(id, input);
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
    mutationFn: async (id: string) => {
      const { ok } = await deleteSlug(id);
      if (!ok) throw new Error("Failed to delete slug");
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cmsKeys.slugs });
    },
  });
}
