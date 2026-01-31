"use client";

import { useEffect } from "react";
import { usePageBuilder } from "./usePageBuilderContext";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

export function useBuilderKeyboardShortcuts(): void {
  const {
    state,
    dispatch,
    selectedSection,
    selectedBlock,
    selectedParentSection,
    selectedParentColumn,
    selectedParentBlock,
    selectedColumn,
    selectedColumnParentSection,
  } = usePageBuilder();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const isMod = event.metaKey || event.ctrlKey;

      if (isMod && key === "z") {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? "REDO" : "UNDO" });
        return;
      }

      if (isMod && key === "y") {
        event.preventDefault();
        dispatch({ type: "REDO" });
        return;
      }

      if (isMod && key === "c") {
        if (selectedSection) {
          event.preventDefault();
          dispatch({ type: "COPY_SECTION", sectionId: selectedSection.id });
          return;
        }
        if (selectedBlock && selectedParentSection) {
          event.preventDefault();
          dispatch({
            type: "COPY_BLOCK",
            sectionId: selectedParentSection.id,
            blockId: selectedBlock.id,
            columnId: selectedParentColumn?.id,
            parentBlockId: selectedParentBlock?.id,
          });
        }
        return;
      }

      if (isMod && key === "v") {
        if (!state.clipboard) return;
        event.preventDefault();
        if (state.clipboard.type === "section") {
          const zone = selectedSection?.zone ?? "template";
          dispatch({ type: "PASTE_SECTION", zone });
          return;
        }
        if (state.clipboard.type === "block") {
          const targetSectionId =
            selectedParentSection?.id ??
            selectedColumnParentSection?.id ??
            selectedSection?.id;
          if (!targetSectionId) return;
          dispatch({
            type: "PASTE_BLOCK",
            sectionId: targetSectionId,
            columnId: selectedParentColumn?.id ?? selectedColumn?.id,
            parentBlockId: selectedParentBlock?.id,
          });
        }
        return;
      }

      if (event.key === "Escape") {
        if (state.selectedNodeId) {
          event.preventDefault();
          dispatch({ type: "SELECT_NODE", nodeId: null });
        }
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedSection) {
          event.preventDefault();
          dispatch({ type: "REMOVE_SECTION", sectionId: selectedSection.id });
          return;
        }

        if (selectedBlock && selectedParentSection) {
          event.preventDefault();
          if (selectedParentColumn && selectedParentBlock) {
            dispatch({
              type: "REMOVE_ELEMENT_FROM_NESTED_BLOCK",
              sectionId: selectedParentSection.id,
              columnId: selectedParentColumn.id,
              parentBlockId: selectedParentBlock.id,
              elementId: selectedBlock.id,
            });
            return;
          }

          if (selectedParentColumn) {
            dispatch({
              type: "REMOVE_BLOCK_FROM_COLUMN",
              sectionId: selectedParentSection.id,
              columnId: selectedParentColumn.id,
              blockId: selectedBlock.id,
            });
            return;
          }

          dispatch({ type: "REMOVE_BLOCK", sectionId: selectedParentSection.id, blockId: selectedBlock.id });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    dispatch,
    selectedSection,
    selectedBlock,
    selectedParentSection,
    selectedParentColumn,
    selectedParentBlock,
    selectedColumn,
    selectedColumnParentSection,
    state.clipboard,
  ]);
}
