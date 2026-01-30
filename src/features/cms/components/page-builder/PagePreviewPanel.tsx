"use client";

import React, { useCallback } from "react";
import { Monitor } from "lucide-react";
import { Button } from "@/shared/ui";
import type { SectionInstance } from "../../types/page-builder";
import type { PageZone } from "../../types/page-builder";
import { usePageBuilder } from "../../hooks/usePageBuilderContext";
import { useUpdatePage } from "../../hooks/useCmsQueries";
import { PreviewSection } from "./PreviewBlock";

const ZONE_ORDER: PageZone[] = ["header", "template", "footer"];

const ZONE_LABELS: Record<PageZone, string> = {
  header: "Header",
  template: "Template",
  footer: "Footer",
};

export function PagePreviewPanel(): React.ReactNode {
  const { state, dispatch } = usePageBuilder();
  const updatePage = useUpdatePage();

  const handleSelectNode = useCallback(
    (nodeId: string) => {
      dispatch({ type: "SELECT_NODE", nodeId });
    },
    [dispatch]
  );

  const handleSave = useCallback(async () => {
    if (!state.currentPage) return;

    const updatedPage = {
      ...state.currentPage,
      components: state.sections.map((s: SectionInstance) => ({
        type: s.type,
        content: { zone: s.zone, settings: s.settings, blocks: s.blocks },
      })),
    };

    await updatePage.mutateAsync({
      id: state.currentPage.id,
      input: updatedPage,
    });
  }, [state.currentPage, state.sections, updatePage]);

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
    <div className="flex flex-1 flex-col bg-gray-950">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <Monitor className="size-4 text-gray-400" />
          <span className="text-sm font-medium text-white">
            {state.currentPage?.name ?? "No page selected"}
          </span>
        </div>
        <Button
          onClick={() => { void handleSave(); }}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
          disabled={!state.currentPage || updatePage.isPending}
        >
          {updatePage.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-y-auto p-6">
        {!state.currentPage ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            Select a page from the left panel to preview it
          </div>
        ) : !hasSections ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            No sections yet. Use the left panel to add sections.
          </div>
        ) : (
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
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
