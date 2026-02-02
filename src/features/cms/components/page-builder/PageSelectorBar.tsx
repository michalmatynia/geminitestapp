"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Layers } from "lucide-react";
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
import { useUserPreferences, useUpdateUserPreferences } from "@/shared/hooks/useUserPreferences";
import type { UserPreferences } from "@/shared/types/domain/user-preferences";

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
  
  const preferencesQuery = useUserPreferences();
  const userPreferences = preferencesQuery.data as UserPreferences | undefined;
  const updatePreferencesMutation = useUpdateUserPreferences();

  const initialPageId = useMemo((): string => {
    if (pageIdParam && pagesQuery.data?.some((page: PageSummary) => page.id === pageIdParam)) {
      return pageIdParam;
    }
    if (state.currentPage?.id) {
      return state.currentPage.id;
    }
    const preferredId = userPreferences?.cmsLastPageId ?? null;
    if (preferredId && pagesQuery.data?.some((page: PageSummary) => page.id === preferredId)) {
      return preferredId;
    }
    return "";
  }, [pageIdParam, pagesQuery.data, state.currentPage?.id, userPreferences?.cmsLastPageId]);

  const [userPageId, setUserPageId] = useState<string | null>(null);
  const selectedPageId = useMemo((): string => {
    const candidate = userPageId ?? initialPageId;
    if (!candidate) return "";
    if (!pagesQuery.data) return candidate;
    return pagesQuery.data.some((page: PageSummary) => page.id === candidate) ? candidate : "";
  }, [initialPageId, pagesQuery.data, userPageId]);

  const pageQuery = useCmsPage(selectedPageId || undefined);

  useEffect((): void => {
    if (selectedPageId) return;
    if (!state.currentPage) return;
    dispatch({ type: "CLEAR_CURRENT_PAGE" });
  }, [dispatch, selectedPageId, state.currentPage]);

  useEffect((): void => {
    if (!pageQuery.data) return;
    if (pageQuery.data.id !== selectedPageId) return;
    if (state.currentPage?.id === pageQuery.data.id) return;
    dispatch({ type: "SET_CURRENT_PAGE", page: pageQuery.data });
  }, [pageQuery.data, selectedPageId, state.currentPage?.id, dispatch]);

  useEffect((): void => {
    if (!selectedPageId) return;
    if (selectedPageId === userPreferences?.cmsLastPageId) {
      lastSavedPageIdRef.current = selectedPageId;
      return;
    }
    if (lastSavedPageIdRef.current === selectedPageId) return;
    lastSavedPageIdRef.current = selectedPageId;
    updatePreferencesMutation.mutate({ cmsLastPageId: selectedPageId });
  }, [selectedPageId, userPreferences?.cmsLastPageId, updatePreferencesMutation]);

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
