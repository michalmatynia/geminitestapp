"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Layers } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import type { PageSummary } from "../../types";
import { useCmsPages, useCmsPage } from "../../hooks/useCmsQueries";
import { useCmsDomainSelection } from "../../hooks/useCmsDomainSelection";
import { usePageBuilder } from "../../hooks/usePageBuilderContext";

type UserPreferencesResponse = {
  cmsLastPageId?: string | null;
};

const userPreferencesQueryKey = ["user-preferences"] as const;

type PageSelectorBarProps = {
  variant?: "bar" | "toolbar";
};

export function PageSelectorBar({ variant = "bar" }: PageSelectorBarProps): React.ReactNode {
  const isToolbar = variant === "toolbar";
  const { state, dispatch } = usePageBuilder();
  const { activeDomainId } = useCmsDomainSelection();
  const pagesQuery = useCmsPages(activeDomainId);
  const searchParams = useSearchParams();
  const pageIdParam = searchParams.get("pageId");
  const lastSavedPageIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const preferencesQuery = useQuery({
    queryKey: userPreferencesQueryKey,
    queryFn: async (): Promise<UserPreferencesResponse> => {
      const res = await fetch("/api/user/preferences");
      if (!res.ok) {
        throw new Error("Failed to load user preferences");
      }
      return (await res.json()) as UserPreferencesResponse;
    },
    staleTime: 1000 * 60 * 5,
  });
  const updatePreferencesMutation = useMutation({
    mutationFn: async (payload: UserPreferencesResponse): Promise<void> => {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to update user preferences");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userPreferencesQueryKey });
    },
    onError: (error: Error) => {
      console.warn("[CMS] Failed to persist page selection.", error);
    },
  });

  const initialPageId = useMemo((): string => {
    if (pageIdParam && pagesQuery.data?.some((page: PageSummary) => page.id === pageIdParam)) {
      return pageIdParam;
    }
    if (state.currentPage?.id) {
      return state.currentPage.id;
    }
    const preferredId = preferencesQuery.data?.cmsLastPageId ?? null;
    if (preferredId && pagesQuery.data?.some((page: PageSummary) => page.id === preferredId)) {
      return preferredId;
    }
    return "";
  }, [pageIdParam, pagesQuery.data, state.currentPage?.id, preferencesQuery.data?.cmsLastPageId]);

  const [userPageId, setUserPageId] = useState<string | null>(null);
  const selectedPageId = userPageId ?? initialPageId;

  const pageQuery = useCmsPage(selectedPageId || undefined);

  useEffect((): void => {
    if (!pagesQuery.data) return;
    if (selectedPageId && !pagesQuery.data.some((page: PageSummary) => page.id === selectedPageId)) {
      setUserPageId("");
      dispatch({ type: "CLEAR_CURRENT_PAGE" });
    }
  }, [pagesQuery.data, selectedPageId, dispatch]);

  useEffect((): void => {
    if (!pageQuery.data) return;
    if (pageQuery.data.id !== selectedPageId) return;
    if (state.currentPage?.id === pageQuery.data.id) return;
    dispatch({ type: "SET_CURRENT_PAGE", page: pageQuery.data });
  }, [pageQuery.data, selectedPageId, state.currentPage?.id, dispatch]);

  useEffect((): void => {
    if (!selectedPageId) return;
    if (selectedPageId === preferencesQuery.data?.cmsLastPageId) {
      lastSavedPageIdRef.current = selectedPageId;
      return;
    }
    if (lastSavedPageIdRef.current === selectedPageId) return;
    lastSavedPageIdRef.current = selectedPageId;
    updatePreferencesMutation.mutate({ cmsLastPageId: selectedPageId });
  }, [selectedPageId, preferencesQuery.data?.cmsLastPageId, updatePreferencesMutation]);

  const handlePageChange = useCallback((value: string): void => {
    setUserPageId((prev: string | null) => (prev === value ? prev : value));
  }, []);

  return (
    <div
      className={
        isToolbar
          ? "flex items-center gap-2"
          : "flex w-full items-center justify-center gap-3"
      }
    >
      {!isToolbar && (
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
          <Layers className="size-3.5" />
          <span>Page</span>
        </div>
      )}
      <Select value={selectedPageId} onValueChange={handlePageChange}>
        <SelectTrigger className={isToolbar ? "h-8 w-56" : "w-64"}>
          <SelectValue placeholder="Select a page..." />
        </SelectTrigger>
        <SelectContent>
          {(pagesQuery.data ?? []).map((page: PageSummary) => (
            <SelectItem key={page.id} value={page.id}>
              {page.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
