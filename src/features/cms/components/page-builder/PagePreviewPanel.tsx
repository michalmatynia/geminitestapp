"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Undo2, Redo2, Eye, Maximize2, Minimize2 } from "lucide-react";
import { Button, useToast } from "@/shared/ui";
import { CmsDomainSelector } from "@/features/cms";
import type { SectionInstance } from "../../types/page-builder";
import type { PageZone } from "../../types/page-builder";
import { usePageBuilder } from "../../hooks/usePageBuilderContext";
import { useCmsSlugs, useUpdatePage } from "../../hooks/useCmsQueries";
import { useCmsDomainSelection } from "../../hooks/useCmsDomainSelection";
import { PreviewSection, type MediaReplaceTarget } from "./PreviewBlock";
import { MediaLibraryPanel } from "./MediaLibraryPanel";
import { PageSelectorBar } from "./PageSelectorBar";

const ZONE_ORDER: PageZone[] = ["header", "template", "footer"];
const EDIT_BUTTON_HIDE_DELAY = 1200;

const ZONE_LABELS: Record<PageZone, string> = {
  header: "Header",
  template: "Template",
  footer: "Footer",
};

export function PagePreviewPanel(): React.ReactNode {
  const { state, dispatch } = usePageBuilder();
  const { activeDomainId } = useCmsDomainSelection();
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
  const domainSlugSet = useMemo(
    () => ((slugsQuery.data ?? []).length ? new Set((slugsQuery.data ?? []).map((slug) => slug.slug)) : null),
    [slugsQuery.data]
  );
  const outOfZoneSlugs = useMemo(() => {
    if (!domainSlugSet) return [];
    const slugs = state.currentPage?.slugs ?? [];
    const values = slugs.map((link) => link.slug.slug);
    return values.filter((value) => !domainSlugSet.has(value));
  }, [state.currentPage?.slugs, domainSlugSet]);

  const handleSelectNode = useCallback(
    (nodeId: string) => {
      dispatch({ type: "SELECT_NODE", nodeId });
    },
    [dispatch]
  );

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
    try {
      await handleSave();
      const url = `/preview/${state.currentPage.id}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Failed to save before preview:", error);
      toast("Save before preview failed. Try again.", { variant: "error" });
    }
  }, [handleSave, state.currentPage, toast]);

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
              <CmsDomainSelector label="" triggerClassName="h-8 w-[180px]" />
              <PageSelectorBar variant="toolbar" />
              {outOfZoneSlugs.length > 0 && (
                <div className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] text-amber-200">
                  Cross-zone: {outOfZoneSlugs.map((slug) => `/${slug}`).join(", ")}
                </div>
              )}
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
            <div className="p-6">
              <div className="mx-auto max-w-3xl space-y-6">
                {ZONE_ORDER.map((zone: PageZone) => {
                  const zoneSections = sectionsByZone[zone];
                  if (zoneSections.length === 0) return null;

                  return (
                    <div key={zone}>
                      {/* Zone label */}
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                          {ZONE_LABELS[zone]}
                        </span>
                        <div className="h-px flex-1 bg-border/30" />
                      </div>

                      {/* Zone sections */}
                      <div className="space-y-4">
                        {zoneSections.map((section: SectionInstance) => (
                          <PreviewSection
                            key={section.id}
                            section={section}
                            selectedNodeId={state.selectedNodeId}
                            onSelect={handleSelectNode}
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
