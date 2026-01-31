"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Undo2, Redo2, Eye, Maximize2, Minimize2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@/shared/ui";
import { CmsDomainSelector } from "@/features/cms";
import type { SectionInstance } from "../../types/page-builder";
import type { PageZone } from "../../types/page-builder";
import { usePageBuilder } from "../../hooks/usePageBuilderContext";
import { useCmsSlugs, useUpdatePage } from "../../hooks/useCmsQueries";
import { useCmsDomainSelection } from "../../hooks/useCmsDomainSelection";
import { PreviewSection, type MediaReplaceTarget } from "./PreviewBlock";
import { MediaLibraryPanel } from "./MediaLibraryPanel";
import { PageSelectorBar } from "./PageSelectorBar";
import { useThemeSettings } from "./ThemeSettingsContext";
import { buildColorSchemeMap } from "@/features/cms/types/theme-settings";
import { getHoverEffectVars, getMediaInlineStyles, getMediaStyleVars } from "../frontend/theme-styles";

const ZONE_ORDER: PageZone[] = ["header", "template", "footer"];
const EDIT_BUTTON_HIDE_DELAY = 1200;

const ZONE_LABELS: Record<PageZone, string> = {
  header: "Header",
  template: "Template",
  footer: "Footer",
};

type UserPreferencesResponse = {
  cmsPreviewEnabled?: boolean | null;
};

const userPreferencesQueryKey = ["user-preferences"] as const;

export function PagePreviewPanel(): React.ReactNode {
  const { state, dispatch } = usePageBuilder();
  const { theme } = useThemeSettings();
  const { activeDomainId, activeDomain } = useCmsDomainSelection();
  const slugsQuery = useCmsSlugs(activeDomainId);
  const updatePage = useUpdatePage();
  const [mediaTarget, setMediaTarget] = useState<MediaReplaceTarget | null>(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const { toast } = useToast();
  const previousPanelsRef = useRef<{ left: boolean; right: boolean } | null>(null);
  const isViewing = state.leftPanelCollapsed && state.rightPanelCollapsed;
  const [showEditButton, setShowEditButton] = useState(false);
  const showEditButtonRef = useRef(false);
  const lastPointerMoveRef = useRef(0);
  const [selectedPreviewSlug, setSelectedPreviewSlug] = useState<string | null>(null);
  const [previewDraftsEnabled, setPreviewDraftsEnabled] = useState(false);
  const previewDraftsHydratedRef = useRef(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
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
      console.warn("[CMS] Failed to persist preview toggle.", error);
    },
  });
  const domainSlugSet = useMemo(
    () => ((slugsQuery.data ?? []).length ? new Set((slugsQuery.data ?? []).map((slug) => slug.slug)) : null),
    [slugsQuery.data]
  );
  const colorSchemes = useMemo(() => (
    theme.colorSchemes.length ? buildColorSchemeMap(theme) : undefined
  ), [theme]);
  const hoverVars = useMemo(
    () => getHoverEffectVars(theme.enableAnimations ? theme.hoverEffect : undefined, theme.enableAnimations ? theme.hoverScale : undefined),
    [theme.enableAnimations, theme.hoverEffect, theme.hoverScale]
  );
  const mediaVars = useMemo(() => getMediaStyleVars(theme), [theme]);
  const mediaStyles = useMemo(() => getMediaInlineStyles(theme), [theme]);
  const outOfZoneSlugs = useMemo(() => {
    if (!domainSlugSet) return [];
    const slugs = state.currentPage?.slugs ?? [];
    const values = slugs.map((link) => link.slug.slug);
    return values.filter((value) => !domainSlugSet.has(value));
  }, [state.currentPage?.slugs, domainSlugSet]);

  const zoneSlugValues = useMemo(() => {
    const page = state.currentPage;
    const domainSlugs = slugsQuery.data ?? [];
    if (!page || domainSlugs.length === 0) return [];
    if (page.slugIds?.length) {
      const slugById = new Map(domainSlugs.map((slug) => [slug.id, slug.slug]));
      const ordered = page.slugIds
        .map((id) => slugById.get(id))
        .filter((value): value is string => Boolean(value));
      if (ordered.length) return ordered;
    }
    if (!domainSlugSet) return [];
    const values = (page.slugs ?? []).map((link) => link.slug.slug);
    return values.filter((value) => domainSlugSet.has(value));
  }, [state.currentPage, slugsQuery.data, domainSlugSet]);

  useEffect(() => {
    if (!state.currentPage || zoneSlugValues.length === 0) {
      setSelectedPreviewSlug(null);
      return;
    }
    if (selectedPreviewSlug && zoneSlugValues.includes(selectedPreviewSlug)) {
      return;
    }
    setSelectedPreviewSlug(zoneSlugValues[0]);
  }, [state.currentPage?.id, selectedPreviewSlug, zoneSlugValues]);

  const previewUrl = useMemo(() => {
    if (!selectedPreviewSlug) return null;
    if (typeof window === "undefined") return `/${selectedPreviewSlug}`;

    const protocol = window.location.protocol;
    const currentHost = window.location.host;
    const currentHostname = window.location.hostname;
    const targetHost = activeDomain?.domain ?? currentHostname;
    const resolvedHost = targetHost === currentHostname ? currentHost : targetHost;
    const path = selectedPreviewSlug.startsWith("/") ? selectedPreviewSlug : `/${selectedPreviewSlug}`;
    return `${protocol}//${resolvedHost}${path}`;
  }, [selectedPreviewSlug, activeDomain]);

  const previewHostMatches = useMemo(() => {
    if (typeof window === "undefined") return true;
    if (!previewUrl) return true;
    try {
      const url = new URL(previewUrl);
      return url.host === window.location.host;
    } catch {
      return true;
    }
  }, [previewUrl]);

  const previewFallbackUrl = useMemo(() => {
    if (!state.currentPage) return null;
    if (typeof window === "undefined") return `/preview/${state.currentPage.id}`;
    return `${window.location.origin}/preview/${state.currentPage.id}`;
  }, [state.currentPage]);

  useEffect(() => {
    if (!preferencesQuery.isFetched) return;
    if (previewDraftsHydratedRef.current) return;
    setPreviewDraftsEnabled(Boolean(preferencesQuery.data?.cmsPreviewEnabled));
    previewDraftsHydratedRef.current = true;
  }, [preferencesQuery.data?.cmsPreviewEnabled, preferencesQuery.isFetched]);

  const previewTargetLabel = useMemo(() => {
    if (!selectedPreviewSlug) return "";
    const path = selectedPreviewSlug.startsWith("/") ? selectedPreviewSlug : `/${selectedPreviewSlug}`;
    const host = activeDomain?.domain ?? "current";
    return `${host}${path}`;
  }, [selectedPreviewSlug, activeDomain]);

  const handleSelectNode = useCallback(
    (nodeId: string) => {
      dispatch({ type: "SELECT_NODE", nodeId });
    },
    [dispatch]
  );

  const handleHoverNode = useCallback(
    (nodeId: string | null) => {
      if (!state.inspectorEnabled) return;
      setHoveredNodeId((prev) => (prev === nodeId ? prev : nodeId));
    },
    [state.inspectorEnabled]
  );

  useEffect(() => {
    if (!state.inspectorEnabled) {
      setHoveredNodeId(null);
    }
  }, [state.inspectorEnabled]);

  const handleSave = useCallback(async () => {
    if (!state.currentPage) return;

    const page = state.currentPage;
    const updatedPage = {
      ...page,
      status: page.status,
      publishedAt: page.publishedAt,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      seoOgImage: page.seoOgImage,
      seoCanonical: page.seoCanonical,
      robotsMeta: page.robotsMeta,
      components: state.sections.map((s: SectionInstance) => ({
        type: s.type,
        content: { zone: s.zone, settings: s.settings, blocks: s.blocks },
      })),
      slugIds: page.slugIds,
    };

    await updatePage.mutateAsync({
      id: page.id,
      input: updatedPage,
    });
  }, [state.currentPage, state.sections, updatePage]);

  const handlePreview = useCallback(async () => {
    if (!state.currentPage) return;
    const initialTarget = previewFallbackUrl ?? "about:blank";
    const previewWindow = window.open(initialTarget, "_blank");
    if (!previewWindow) {
      toast("Popup blocked. Allow popups to open the preview.", { variant: "error" });
      return;
    }
    try {
      previewWindow.opener = null;
    } catch {
      // ignore cross-origin or browser restrictions
    }
    try {
      await handleSave();
      if (slugsQuery.isLoading) {
        toast("Loading zone slugs. Try again in a moment.", { variant: "error" });
        return;
      }
      const isPublished = state.currentPage.status === "published";
      const shouldUseSlug = Boolean(previewUrl) && (isPublished || previewDraftsEnabled) && previewHostMatches;
      const targetUrl = shouldUseSlug ? previewUrl : previewFallbackUrl;
      if (!targetUrl) {
        toast("This page has no slug in the current zone.", { variant: "error" });
        return;
      }
      if (!previewHostMatches && previewUrl) {
        toast("Previewing on current host (domain mismatch).", { variant: "info" });
      }
      previewWindow.location.href = targetUrl;
    } catch (error) {
      console.error("Failed to save before preview:", error);
      toast("Save before preview failed. Try again.", { variant: "error" });
    }
  }, [handleSave, state.currentPage, toast, previewUrl, previewFallbackUrl, slugsQuery.isLoading, previewDraftsEnabled, previewHostMatches]);


  const handleOpenMedia = useCallback((target: MediaReplaceTarget) => {
    setMediaTarget(target);
    setMediaOpen(true);
  }, []);

  const handleMediaOpenChange = useCallback((open: boolean) => {
    setMediaOpen(open);
    if (!open) {
      setMediaTarget(null);
    }
  }, []);

  const handleMediaSelect = useCallback(
    (filepaths: string[]) => {
      if (!mediaTarget) return;
      const image = filepaths[0];
      if (!image) return;

      if (mediaTarget.kind === "section") {
        dispatch({
          type: "UPDATE_SECTION_SETTINGS",
          sectionId: mediaTarget.sectionId,
          settings: { [mediaTarget.key]: image },
        });
      } else {
        if (!mediaTarget.blockId) return;
        if (mediaTarget.columnId && mediaTarget.parentBlockId) {
          dispatch({
            type: "UPDATE_NESTED_BLOCK_SETTINGS",
            sectionId: mediaTarget.sectionId,
            columnId: mediaTarget.columnId,
            parentBlockId: mediaTarget.parentBlockId,
            blockId: mediaTarget.blockId,
            settings: { [mediaTarget.key]: image },
          });
        } else if (mediaTarget.columnId) {
          dispatch({
            type: "UPDATE_BLOCK_IN_COLUMN",
            sectionId: mediaTarget.sectionId,
            columnId: mediaTarget.columnId,
            blockId: mediaTarget.blockId,
            settings: { [mediaTarget.key]: image },
          });
        } else {
          dispatch({
            type: "UPDATE_BLOCK_SETTINGS",
            sectionId: mediaTarget.sectionId,
            blockId: mediaTarget.blockId,
            settings: { [mediaTarget.key]: image },
          });
        }
      }

      setMediaOpen(false);
      setMediaTarget(null);
    },
    [dispatch, mediaTarget]
  );

  const showEdit = useCallback(() => {
    if (showEditButtonRef.current) return;
    showEditButtonRef.current = true;
    setShowEditButton(true);
  }, []);

  const hideEdit = useCallback(() => {
    if (!showEditButtonRef.current) return;
    showEditButtonRef.current = false;
    setShowEditButton(false);
  }, []);

  const setPanelsCollapsed = useCallback(
    (leftCollapsed: boolean, rightCollapsed: boolean) => {
      if (state.leftPanelCollapsed !== leftCollapsed) {
        dispatch({ type: "TOGGLE_LEFT_PANEL" });
      }
      if (state.rightPanelCollapsed !== rightCollapsed) {
        dispatch({ type: "TOGGLE_RIGHT_PANEL" });
      }
    },
    [dispatch, state.leftPanelCollapsed, state.rightPanelCollapsed]
  );

  const handleToggleViewing = useCallback(() => {
    if (!isViewing) {
      previousPanelsRef.current = {
        left: state.leftPanelCollapsed,
        right: state.rightPanelCollapsed,
      };
      setPanelsCollapsed(true, true);
      lastPointerMoveRef.current = Date.now();
      showEdit();
      return;
    }
    const previous = previousPanelsRef.current;
    if (previous) {
      setPanelsCollapsed(previous.left, previous.right);
    } else {
      setPanelsCollapsed(false, false);
    }
    previousPanelsRef.current = null;
  }, [hideEdit, isViewing, setPanelsCollapsed, showEdit, state.leftPanelCollapsed, state.rightPanelCollapsed]);

  useEffect(() => {
    if (!isViewing) {
      hideEdit();
      return;
    }

    lastPointerMoveRef.current = Date.now();
    showEdit();
    const handlePointerMove = (): void => {
      lastPointerMoveRef.current = Date.now();
      showEdit();
    };
    window.addEventListener("pointermove", handlePointerMove);
    const idleCheck = window.setInterval(() => {
      if (Date.now() - lastPointerMoveRef.current > EDIT_BUTTON_HIDE_DELAY) {
        hideEdit();
      }
    }, 200);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.clearInterval(idleCheck);
    };
  }, [hideEdit, isViewing, showEdit]);

  // Group sections by zone
  const sectionsByZone = ZONE_ORDER.reduce<Record<PageZone, SectionInstance[]>>(
    (acc: Record<PageZone, SectionInstance[]>, zone: PageZone) => {
      acc[zone] = state.sections.filter((s: SectionInstance) => s.zone === zone);
      return acc;
    },
    { header: [], template: [], footer: [] }
  );

  const hasSections = state.sections.length > 0;
  const previewWidthClass =
    state.previewMode === "mobile"
      ? "max-w-[420px]"
      : theme.fullWidth
        ? "max-w-none w-full"
        : "max-w-3xl";
  const previewFrameClass =
    state.previewMode === "mobile"
      ? "rounded-2xl border border-white/10 bg-gray-950/40 shadow-[0_0_0_1px_rgba(59,130,246,0.15)]"
      : "";

  return (
    <div className="relative flex flex-1 flex-col bg-gray-950">
      {/* Toolbar */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isViewing
            ? "max-h-0 opacity-0 -translate-y-4 pointer-events-none border-transparent"
            : "max-h-20 opacity-100 translate-y-0 border-b border-border"
        }`}
      >
        <div className="flex items-center justify-end gap-2 px-6 py-3">
          {!isViewing && (
            <>
              <CmsDomainSelector label="" triggerClassName="h-8 w-[200px]" />
              <PageSelectorBar variant="toolbar" />
              {slugsQuery.isLoading ? (
                <div className="rounded-full border border-slate-500/40 bg-slate-500/10 px-3 py-1 text-[10px] text-slate-300">
                  Loading zone slugs…
                </div>
              ) : zoneSlugValues.length > 1 ? (
                <Select
                  value={selectedPreviewSlug ?? ""}
                  onValueChange={(value) =>
                    setSelectedPreviewSlug((prev) => (prev === value ? prev : value))
                  }
                >
                  <SelectTrigger className="h-8 w-[200px] text-xs">
                    <SelectValue placeholder="Preview slug" />
                  </SelectTrigger>
                  <SelectContent>
                    {zoneSlugValues.map((slug) => (
                      <SelectItem key={slug} value={slug}>
                        /{slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : zoneSlugValues.length === 1 ? (
                <div
                  className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[10px] text-blue-200"
                  title={previewTargetLabel}
                >
                  Preview: /{zoneSlugValues[0]}
                </div>
              ) : (
                <div className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[10px] text-red-200">
                  No slug in zone
                </div>
              )}
              {outOfZoneSlugs.length > 0 && (
                <div className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] text-amber-200">
                  Cross-zone: {outOfZoneSlugs.map((slug) => `/${slug}`).join(", ")}
                </div>
              )}
              <label className="flex items-center gap-2 rounded-full border border-slate-500/40 bg-slate-500/10 px-3 py-1 text-[10px] text-slate-200">
                <Checkbox
                  checked={previewDraftsEnabled}
                  onCheckedChange={(value) => {
                    const next = value === true;
                    setPreviewDraftsEnabled(next);
                    updatePreferencesMutation.mutate({ cmsPreviewEnabled: next });
                  }}
                />
                Draft preview
              </label>
              <Button
                onClick={handlePreview}
                size="sm"
                variant="outline"
                className="text-gray-300 hover:text-white"
                disabled={!state.currentPage || updatePage.isPending}
              >
                <Eye className="mr-2 size-4" />
                {updatePage.isPending ? "Saving..." : "Preview"}
              </Button>
              <Button
                onClick={() => dispatch({ type: "UNDO" })}
                size="icon"
                variant="ghost"
                className="text-gray-400 hover:text-white"
                disabled={state.history.past.length === 0}
              >
                <Undo2 className="size-4" />
              </Button>
              <Button
                onClick={() => dispatch({ type: "REDO" })}
                size="icon"
                variant="ghost"
                className="text-gray-400 hover:text-white"
                disabled={state.history.future.length === 0}
              >
                <Redo2 className="size-4" />
              </Button>
              <Button
                onClick={() => { void handleSave(); }}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!state.currentPage || updatePage.isPending}
              >
                {updatePage.isPending ? "Saving..." : "Save"}
              </Button>
            </>
          )}
          {!isViewing && (
            <Button
              onClick={handleToggleViewing}
              size="sm"
              variant="outline"
              className="text-gray-300 hover:text-white"
              disabled={!state.currentPage}
            >
              <Maximize2 className="mr-2 size-4" />
              Show
            </Button>
          )}
        </div>
      </div>

      {isViewing && (
        <div className="pointer-events-none absolute right-6 top-4 z-20 flex justify-end">
          <div
            className={`pointer-events-auto transition-all duration-300 ease-in-out ${
              showEditButton ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
            }`}
          >
            <Button
              onClick={handleToggleViewing}
              size="sm"
              variant="outline"
              className="text-gray-300 hover:text-white opacity-60 hover:opacity-100"
              disabled={!state.currentPage}
            >
              <Minimize2 className="mr-2 size-4" />
              Edit
            </Button>
          </div>
        </div>
      )}

      {/* Preview area */}
      <div className="flex-1 overflow-y-auto">
        {!state.currentPage ? (
          <div className="flex h-full items-center justify-center p-6 text-gray-500">
            Select a page from the left panel to preview it
          </div>
        ) : !hasSections ? (
          <div className="flex h-full items-center justify-center p-6 text-gray-500">
            No sections yet. Use the left panel to add sections.
          </div>
        ) : (
          <>
            <div className="p-3 md:p-4">
              <div
                className={`cms-hover-scope mx-auto ${previewWidthClass} ${previewFrameClass} ${previewFrameClass ? "p-3" : ""}`}
                style={{ ...hoverVars, ...mediaVars }}
              >
                {ZONE_ORDER.map((zone: PageZone) => {
                  const zoneSections = sectionsByZone[zone];
                  if (zoneSections.length === 0) return null;

                  return (
                    <div key={zone}>
                      {/* Zone sections */}
                      <div>
                        {zoneSections.map((section: SectionInstance) => (
                          <PreviewSection
                            key={section.id}
                            section={section}
                            selectedNodeId={state.selectedNodeId}
                            isInspecting={state.inspectorEnabled}
                            hoveredNodeId={hoveredNodeId}
                            colorSchemes={colorSchemes}
                            mediaStyles={mediaStyles}
                            onSelect={handleSelectNode}
                            onHoverNode={handleHoverNode}
                            onOpenMedia={handleOpenMedia}
                            onRemoveSection={(sectionId: string) => dispatch({ type: "REMOVE_SECTION", sectionId })}
                            onToggleSectionVisibility={(sectionId: string, isHidden: boolean) =>
                              dispatch({ type: "UPDATE_SECTION_SETTINGS", sectionId, settings: { isHidden } })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
      <MediaLibraryPanel
        open={mediaOpen}
        onOpenChange={handleMediaOpenChange}
        onSelect={handleMediaSelect}
        selectionMode="single"
      />
    </div>
  );
}
