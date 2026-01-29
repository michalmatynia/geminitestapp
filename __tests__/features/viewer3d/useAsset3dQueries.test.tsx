import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useAssets3D, useAsset3DCategories, useAsset3DTags, useAsset3DById } from "@/features/viewer3d/hooks/useAsset3dQueries";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import React from "react";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useAsset3dQueries", () => {
  it("useAssets3D should fetch assets", async () => {
    server.use(
      http.get("/api/assets3d", () => {
        return HttpResponse.json([{ id: "1", name: "Test" }]);
      })
    );

    const { result } = renderHook(() => useAssets3D({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].name).toBe("Test");
  });

  it("useAsset3DCategories should fetch categories", async () => {
    server.use(
      http.get("/api/assets3d/categories", () => {
        return HttpResponse.json(["cat1", "cat2"]);
      })
    );

    const { result } = renderHook(() => useAsset3DCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(["cat1", "cat2"]);
  });

  it("useAsset3DTags should fetch tags", async () => {
    server.use(
      http.get("/api/assets3d/tags", () => {
        return HttpResponse.json(["tag1", "tag2"]);
      })
    );

    const { result } = renderHook(() => useAsset3DTags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(["tag1", "tag2"]);
  });

  it("useAsset3DById should fetch a single asset", async () => {
    server.use(
      http.get("/api/assets3d/1", () => {
        return HttpResponse.json({ id: "1", name: "Detail" });
      })
    );

    const { result } = renderHook(() => useAsset3DById("1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.name).toBe("Detail");
  });

  it("useAsset3DById should be disabled if id is null", () => {
    const { result } = renderHook(() => useAsset3DById(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isEnabled).toBe(false);
  });
});
