
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  useCmsPages,
  useCmsPage,
  useCreatePage,
  useUpdatePage,
  useDeletePage,
  useCmsSlugs,
  useCreateSlug,
  useCmsDomains,
  useCmsThemes,
} from "@/features/cms/hooks/useCmsQueries";
import * as pagesApi from "@/features/cms/api/pages";
import * as slugsApi from "@/features/cms/api/slugs";
import * as domainsApi from "@/features/cms/api/domains";
import * as themesApi from "@/features/cms/api/themes";

// Mock the API functions
vi.mock("@/features/cms/api/pages", () => ({
  fetchPages: vi.fn(),
  fetchPage: vi.fn(),
  createPage: vi.fn(),
  updatePage: vi.fn(),
  deletePage: vi.fn(),
}));

vi.mock("@/features/cms/api/slugs", () => ({
  fetchSlugs: vi.fn(),
  fetchAllSlugs: vi.fn(),
  fetchSlug: vi.fn(),
  createSlug: vi.fn(),
  updateSlug: vi.fn(),
  deleteSlug: vi.fn(),
}));

vi.mock("@/features/cms/api/domains", () => ({
  fetchDomains: vi.fn(),
  createDomain: vi.fn(),
  updateDomain: vi.fn(),
  deleteDomain: vi.fn(),
}));

vi.mock("@/features/cms/api/themes", () => ({
  fetchThemes: vi.fn(),
  fetchTheme: vi.fn(),
  createTheme: vi.fn(),
  updateTheme: vi.fn(),
  deleteTheme: vi.fn(),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe("useCmsQueries Hooks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("Pages", () => {
    describe("useCmsPages", () => {
      it("should fetch pages", async () => {
        const mockPages = [{ id: "1", name: "Home" }];
        (pagesApi.fetchPages as any).mockResolvedValue(mockPages);

        const { result } = renderHook(() => useCmsPages(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockPages);
        expect(pagesApi.fetchPages).toHaveBeenCalledWith(undefined);
      });

      it("should fetch pages for a specific domain", async () => {
        const mockPages = [{ id: "1", name: "Home" }];
        (pagesApi.fetchPages as any).mockResolvedValue(mockPages);

        const { result } = renderHook(() => useCmsPages("domain-1"), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(pagesApi.fetchPages).toHaveBeenCalledWith("domain-1");
      });
    });

    describe("useCmsPage", () => {
      it("should fetch a single page", async () => {
        const mockPage = { id: "1", name: "Home" };
        (pagesApi.fetchPage as any).mockResolvedValue(mockPage);

        const { result } = renderHook(() => useCmsPage("1"), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockPage);
        expect(pagesApi.fetchPage).toHaveBeenCalledWith("1");
      });

      it("should not fetch if id is missing", () => {
        renderHook(() => useCmsPage(undefined), { wrapper });
        expect(pagesApi.fetchPage).not.toHaveBeenCalled();
      });
    });

    describe("useCreatePage", () => {
      it("should create a page and invalidate pages query", async () => {
        const mockPage = { id: "new-1", name: "New Page" };
        (pagesApi.createPage as any).mockResolvedValue({ ok: true, payload: mockPage });
        
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

        const { result } = renderHook(() => useCreatePage(), { wrapper });

        await result.current.mutateAsync({ name: "New Page", slugIds: [] });

        expect(pagesApi.createPage).toHaveBeenCalledWith({ name: "New Page", slugIds: [] });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["cms-pages"] });
      });

      it("should throw error if create fails", async () => {
        (pagesApi.createPage as any).mockResolvedValue({ ok: false });

        const { result } = renderHook(() => useCreatePage(), { wrapper });

        await expect(result.current.mutateAsync({ name: "Fail", slugIds: [] })).rejects.toThrow("Failed to create page");
      });
    });

    describe("useUpdatePage", () => {
      it("should update a page and invalidate queries", async () => {
        const mockPage = { id: "1", name: "Updated" };
        (pagesApi.updatePage as any).mockResolvedValue({ ok: true, payload: mockPage });
        
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

        const { result } = renderHook(() => useUpdatePage(), { wrapper });

        await result.current.mutateAsync({ id: "1", input: mockPage as any });

        expect(pagesApi.updatePage).toHaveBeenCalledWith("1", mockPage);
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["cms-pages"] });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["cms-page", "1"] });
      });
    });

    describe("useDeletePage", () => {
      it("should delete a page and invalidate queries", async () => {
        (pagesApi.deletePage as any).mockResolvedValue({ ok: true });
        
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

        const { result } = renderHook(() => useDeletePage(), { wrapper });

        await result.current.mutateAsync("1");

        expect(pagesApi.deletePage).toHaveBeenCalledWith("1");
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["cms-pages"] });
      });
    });
  });

  describe("Slugs", () => {
    describe("useCmsSlugs", () => {
      it("should fetch slugs", async () => {
        const mockSlugs = [{ id: "1", slug: "test" }];
        (slugsApi.fetchSlugs as any).mockResolvedValue(mockSlugs);

        const { result } = renderHook(() => useCmsSlugs(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockSlugs);
      });
    });

    describe("useCreateSlug", () => {
      it("should create a slug", async () => {
        const mockSlug = { id: "s1", slug: "new" };
        (slugsApi.createSlug as any).mockResolvedValue({ ok: true, payload: mockSlug });
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

        const { result } = renderHook(() => useCreateSlug(), { wrapper });
        await result.current.mutateAsync({ slug: "new" });

        expect(slugsApi.createSlug).toHaveBeenCalledWith({ slug: "new" });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["cms-slugs"] });
      });
    });
  });

  describe("Domains", () => {
    describe("useCmsDomains", () => {
      it("should fetch domains", async () => {
        const mockDomains = [{ id: "d1", domain: "example.com" }];
        (domainsApi.fetchDomains as any).mockResolvedValue(mockDomains);

        const { result } = renderHook(() => useCmsDomains(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockDomains);
      });
    });
  });

  describe("Themes", () => {
    describe("useCmsThemes", () => {
      it("should fetch themes", async () => {
        const mockThemes = [{ id: "t1", name: "Default" }];
        (themesApi.fetchThemes as any).mockResolvedValue(mockThemes);

        const { result } = renderHook(() => useCmsThemes(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockThemes);
      });
    });
  });
});

