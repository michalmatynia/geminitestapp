"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Undo2, Redo2, Eye, Maximize2, Minimize2 } from "lucide-react";
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
import type { PageZone, SectionInstance } from "../../types/page-builder";
import type { PageSlugLink, Slug } from "../../types";
import { logClientError } from "@/features/observability";
import { usePageBuilder } from "../../hooks/usePageBuilderContext";
import { useCmsSlugs, useUpdatePage } from "../../hooks/useCmsQueries";
import { useCmsDomainSelection } from "../../hooks/useCmsDomainSelection";
import { PreviewSection, type MediaReplaceTarget } from "./PreviewBlock";
import { MediaLibraryPanel } from "./MediaLibraryPanel";
import { PageSelectorBar } from "./PageSelectorBar";
import { useThemeSettings } from "./ThemeSettingsContext";
import { buildColorSchemeMap } from "@/features/cms/types/theme-settings";
import { getHoverEffectVars, getMediaInlineStyles, getMediaStyleVars } from "../frontend/theme-styles";
import { useUserPreferences, useUpdateUserPreferences } from "@/shared/hooks/useUserPreferences";

const ZONE_ORDER: PageZone[] = ["header", "template", "footer"];
const EDIT_BUTTON_HIDE_DELAY = 2000;

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
  const [showEditButton, setShowEditButton] = useState<boolean>(isViewing);
  const showEditButtonRef = useRef<boolean>(isViewing);
  const lastPointerMoveRef = useRef(0);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasWidth, setCanvasWidth] = useState<number | null>(null);
  const [canvasScaledHeight, setCanvasScaledHeight] = useState<number | null>(null);
  
  const preferencesQuery = useUserPreferences();
  const userPreferences = preferencesQuery.data;
  const updatePreferencesMutation = useUpdateUserPreferences();

  const domainSlugSet = useMemo(
    (): Set<string> | null =>
      (slugsQuery.data ?? []).length
        ? new Set((slugsQuery.data ?? []).map((slug: Slug) => slug.slug))
        : null,
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
    const values = slugs.map((link: PageSlugLink) => link.slug.slug);
    return values.filter((value: string) => !domainSlugSet.has(value));
  }, [state.currentPage?.slugs, domainSlugSet]);

  const zoneSlugValues = useMemo((): string[] => {
    const page = state.currentPage;
    const domainSlugs = slugsQuery.data ?? [];
    if (!page || domainSlugs.length === 0) return [];
    if (page.slugIds?.length) {
      const slugById = new Map(domainSlugs.map((slug: Slug) => [slug.id, slug.slug]));
      const ordered = page.slugIds
        .map((id: string) => slugById.get(id))
        .filter((value: string | undefined): value is string => Boolean(value));
      if (ordered.length) return ordered;
    }
    if (!domainSlugSet) return [];
    const values = (page.slugs ?? []).map((link: PageSlugLink) => link.slug.slug);
    return values.filter((value: string) => domainSlugSet.has(value));
  }, [state.currentPage, slugsQuery.data, domainSlugSet]);

  const initialPreviewSlug = useMemo((): string | null => {
    if (!state.currentPage || zoneSlugValues.length === 0) return null;
    return zoneSlugValues[0] || null;
  }, [state.currentPage, zoneSlugValues]);

  const [userPreviewSlug, setUserPreviewSlug] = useState<string | null>(null);
  const selectedPreviewSlug = userPreviewSlug ?? initialPreviewSlug;

  const previewUrl = useMemo((): string | null => {
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

  const previewHostMatches = useMemo((): boolean => {
    if (typeof window === "undefined") return true;
    if (!previewUrl) return true;
    try {
      const url = new URL(previewUrl);
      return url.host === window.location.host;
    } catch {
      return true;
    }
  }, [previewUrl]);

  const previewFallbackUrl = useMemo((): string | null => {
    if (!state.currentPage) return null;
    if (typeof window === "undefined") return `/preview/${state.currentPage.id}`;
    return `${window.location.origin}/preview/${state.currentPage.id}`;
  }, [state.currentPage]);

  const initialPreviewDraftsEnabled = useMemo((): boolean => {
    return Boolean(userPreferences?.cmsPreviewEnabled);
  }, [userPreferences?.cmsPreviewEnabled]);

  const [userPreviewDraftsEnabled, setUserPreviewDraftsEnabled] = useState<boolean | null>(null);
  const previewDraftsEnabled = userPreviewDraftsEnabled ?? initialPreviewDraftsEnabled;

  const previewTargetLabel = useMemo((): string => {
    if (!selectedPreviewSlug) return "";
    const path = selectedPreviewSlug.startsWith("/") ? selectedPreviewSlug : `/${selectedPreviewSlug}`;
    const host = activeDomain?.domain ?? "current";
    return `${host}${path}`;
  }, [selectedPreviewSlug, activeDomain]);

  const handleSelectNode = useCallback(
    (nodeId: string): void => {
      dispatch({ type: "SELECT_NODE", nodeId });
    },
    [dispatch]
  );

  const handleHoverNode = useCallback(
    (nodeId: string | null): void => {
      if (!state.inspectorEnabled) return;
      setHoveredNodeId((prev: string | null) => (prev === nodeId ? prev : nodeId));
    },
    [state.inspectorEnabled]
  );

  const handleCanvasPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-cms-canvas='true']")) return;
      dispatch({ type: "SELECT_NODE", nodeId: null });
    },
    [dispatch]
  );

  const effectiveHoveredNodeId = state.inspectorEnabled ? hoveredNodeId : null;

  const handleSave = useCallback(async (): Promise<void> => {
    if (!state.currentPage) return;

    const page = state.currentPage;
    const updatedPage = {
      ...page,
      showMenu: page.showMenu ?? true,
      status: page.status,
      publishedAt: page.publishedAt || "",
      seoTitle: page.seoTitle || "",
      seoDescription: page.seoDescription || "",
      seoOgImage: page.seoOgImage || "",
      seoCanonical: page.seoCanonical || "",
      robotsMeta: page.robotsMeta || "",
      components: state.sections.map((s: SectionInstance) => ({
        type: s.type,
        content: { zone: s.zone, settings: s.settings, blocks: s.blocks },
      })),
      ...(page.slugIds && { slugIds: page.slugIds }),
    };

    await updatePage.mutateAsync({
      id: page.id,
      input: updatedPage,
    });
  }, [state.currentPage, state.sections, updatePage]);

  const handlePreview = useCallback(async (): Promise<void> => {
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
      logClientError(error, { context: { source: "PagePreviewPanel", action: "saveBeforePreview", pageId: state.currentPage.id } });
      toast("Save before preview failed. Try again.", { variant: "error" });
    }
  }, [handleSave, state.currentPage, toast, previewUrl, previewFallbackUrl, slugsQuery.isLoading, previewDraftsEnabled, previewHostMatches]);

  const handleOpenMedia = useCallback((target: MediaReplaceTarget): void => {
    setMediaTarget(target);
    setMediaOpen(true);
  }, []);

  const handleMediaOpenChange = useCallback((open: boolean): void => {
    setMediaOpen(open);
    if (!open) {
      setMediaTarget(null);
    }
  }, []);

  const handleMediaSelect = useCallback(
    (filepaths: string[]): void => {
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

  const showEdit = useCallback((): void => {
    if (showEditButtonRef.current) return;
    showEditButtonRef.current = true;
    setShowEditButton(true);
  }, []);

  const hideEdit = useCallback((): void => {
    if (!showEditButtonRef.current) return;
    showEditButtonRef.current = false;
    setShowEditButton(false);
  }, []);

  const setPanelsCollapsed = useCallback(
    (leftCollapsed: boolean, rightCollapsed: boolean): void => {
      if (state.leftPanelCollapsed !== leftCollapsed) {
        dispatch({ type: "TOGGLE_LEFT_PANEL" });
      }
      if (state.rightPanelCollapsed !== rightCollapsed) {
        dispatch({ type: "TOGGLE_RIGHT_PANEL" });
      }
    },
    [dispatch, state.leftPanelCollapsed, state.rightPanelCollapsed]
  );

  const handleToggleViewing = useCallback((): void => {
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
    hideEdit();
  }, [hideEdit, isViewing, setPanelsCollapsed, showEdit, state.leftPanelCollapsed, state.rightPanelCollapsed]);

  useEffect((): (() => void) => {
    if (!isViewing) return (): void => {};

    lastPointerMoveRef.current = Date.now();
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

    return (): void => {
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
      : "w-full";
  const previewFrameClass =
    state.previewMode === "mobile"
      ? "rounded-2xl border border-white/10 bg-gray-950/40 shadow-[0_0_0_1px_rgba(59,130,246,0.15)]"
      : "";

  const basePadding = typeof theme.pagePadding === "number" ? theme.pagePadding : 0;
  const baseMargin = typeof theme.pageMargin === "number" ? theme.pageMargin : 0;
  const paddingTop = typeof theme.pagePaddingTop === "number" ? theme.pagePaddingTop : basePadding;
  const paddingRight = typeof theme.pagePaddingRight === "number" ? theme.pagePaddingRight : basePadding;
  const paddingBottom = typeof theme.pagePaddingBottom === "number" ? theme.pagePaddingBottom : basePadding;
  const paddingLeft = typeof theme.pagePaddingLeft === "number" ? theme.pagePaddingLeft : basePadding;
  const marginTop = typeof theme.pageMarginTop === "number" ? theme.pageMarginTop : baseMargin;
  const marginRight = typeof theme.pageMarginRight === "number" ? theme.pageMarginRight : baseMargin;
  const marginBottom = typeof theme.pageMarginBottom === "number" ? theme.pageMarginBottom : baseMargin;
  const marginLeft = typeof theme.pageMarginLeft === "number" ? theme.pageMarginLeft : baseMargin;
  const pageRadius = typeof theme.borderRadius === "number" ? theme.borderRadius : 0;
  const pageStyle: React.CSSProperties = {
    backgroundColor: theme.backgroundColor,
    borderRadius: pageRadius > 0 ? pageRadius : undefined,
    overflow: pageRadius > 0 ? "hidden" : undefined,
  };
  const contentStyle: React.CSSProperties = {
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
  };
  const isDesktopPreview = state.previewMode === "desktop";
  const shouldScaleCanvas = isDesktopPreview && canvasWidth !== null && canvasScale < 0.999;
  const scaledCanvasStyle: React.CSSProperties = shouldScaleCanvas
    ? {
        width: `${canvasWidth}px`,
        position: "absolute",
        left: "50%",
        top: 0,
        transform: `translateX(-50%) scale(${canvasScale})`,
        transformOrigin: "top center",
      }
    : {};
  const scaledCanvasWrapperStyle: React.CSSProperties = shouldScaleCanvas && canvasScaledHeight
    ? { height: `${canvasScaledHeight}px`, position: "relative", overflow: "hidden" }
    : {};

  useEffect((): (() => void) | void => {
    if (!isDesktopPreview) return undefined;
    const viewport = canvasRef.current?.closest(
      "[data-cms-canvas-viewport='true']"
    ) as HTMLDivElement | null;
    if (!viewport || typeof window === "undefined") return undefined;

    const updateScale = (): void => {
      const availableWidth = viewport.clientWidth;
      const targetWidth = window.innerWidth;
      if (!availableWidth || !targetWidth) return;
      const nextScale = Math.min(1, availableWidth / targetWidth);
      setCanvasScale(nextScale);
      setCanvasWidth(targetWidth);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    window.addEventListener("resize", updateScale);

    return (): void => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [isDesktopPreview]);

  useEffect((): (() => void) | void => {
    if (!isDesktopPreview) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const updateHeight = (): void => {
      const unscaledHeight = canvas.scrollHeight;
      setCanvasScaledHeight(unscaledHeight * canvasScale);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(canvas);

    return (): void => {
      observer.disconnect();
    };
  }, [isDesktopPreview, canvasScale, state.sections, previewWidthClass]);

  return (
    <div className="relative flex min-w-0 flex-1 flex-col bg-gray-950">
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
                  onValueChange={(value: string): void =>
                    setUserPreviewSlug((prev: string | null) => (prev === value ? prev : value))
                  }
                >
                  <SelectTrigger className="h-8 w-[200px] text-xs">
                    <SelectValue placeholder="Preview slug" />
                  </SelectTrigger>
                  <SelectContent>
                    {zoneSlugValues.map((slug: string) => (
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
                  Cross-zone: {outOfZoneSlugs.map((slug: string) => `/${slug}`).join(", ")}
                </div>
              )}
              <label className="flex items-center gap-2 rounded-full border border-slate-500/40 bg-slate-500/10 px-3 py-1 text-[10px] text-slate-200">
                <Checkbox
                  checked={previewDraftsEnabled}
                  onCheckedChange={(value: boolean | "indeterminate"): void => {
                    const next = value === true;
                    setUserPreviewDraftsEnabled(next);
                    updatePreferencesMutation.mutate({ cmsPreviewEnabled: next });
                  }}
                />
                Draft preview
              </label>
              <Button
                onClick={(): void => { void handlePreview(); }}
                size="sm"
                variant="outline"
                className="text-gray-300 hover:text-white"
                disabled={!state.currentPage || updatePage.isPending}
              >
                <Eye className="mr-2 size-4" />
                {updatePage.isPending ? "Saving..." : "Preview"}
              </Button>
              <Button
                onClick={(): void => dispatch({ type: "UNDO" })}
                size="icon"
                variant="ghost"
                className="text-gray-400 hover:text-white"
                disabled={state.history.past.length === 0}
              >
                <Undo2 className="size-4" />
              </Button>
              <Button
                onClick={(): void => dispatch({ type: "REDO" })}
                size="icon"
                variant="ghost"
                className="text-gray-400 hover:text-white"
                disabled={state.history.future.length === 0}
              >
                <Redo2 className="size-4" />
              </Button>
              <Button
                onClick={(): void => { void handleSave(); }}
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
      <div
        className="flex-1 overflow-y-auto"
        data-cms-canvas-viewport="true"
        onPointerDown={handleCanvasPointerDown}
      >
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
            <div className="p-0" style={scaledCanvasWrapperStyle}>
              <div
                data-cms-canvas="true"
                ref={canvasRef}
                className={`cms-hover-scope mx-auto ${previewWidthClass} ${previewFrameClass} ${previewFrameClass ? "p-3" : ""} ${
                  state.inspectorEnabled ? "cursor-crosshair" : ""
                }`}
                style={{
                  ...hoverVars,
                  ...mediaVars,
                  ...pageStyle,
                  ...scaledCanvasStyle,
                }}
              >
                <div style={contentStyle}>
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
                              layout={{ fullWidth: theme.fullWidth }}
                              selectedNodeId={state.selectedNodeId}
                              isInspecting={state.inspectorEnabled}
                              inspectorSettings={state.inspectorSettings}
                              hoveredNodeId={effectiveHoveredNodeId}
                              colorSchemes={colorSchemes || {}}
                              mediaStyles={mediaStyles}
                              onSelect={handleSelectNode}
                              onHoverNode={handleHoverNode}
                              onOpenMedia={handleOpenMedia}
                              onRemoveSection={(sectionId: string) => dispatch({ type: "REMOVE_SECTION", sectionId })}
                              onToggleSectionVisibility={(sectionId: string, isHidden: boolean) =>
                                dispatch({ type: "UPDATE_SECTION_SETTINGS", sectionId, settings: { isHidden } })
                              }
                              onRemoveRow={(sectionId: string, rowId: string) =>
                                dispatch({ type: "REMOVE_GRID_ROW", sectionId, rowId })
                              }
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
