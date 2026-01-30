"use client";

import React, { createContext, useContext, useReducer, useMemo, type ReactNode } from "react";
import type {
  PageBuilderState,
  PageBuilderAction,
  SectionInstance,
  BlockInstance,
  PageZone,
} from "../types/page-builder";
import { getSectionDefinition, getBlockDefinition } from "../components/page-builder/section-registry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nextId = 1000;
function uid(): string {
  return `node-${nextId++}`;
}

function findSection(sections: SectionInstance[], nodeId: string): SectionInstance | null {
  for (const s of sections) {
    if (s.id === nodeId) return s;
  }
  return null;
}

function findBlock(sections: SectionInstance[], nodeId: string): { block: BlockInstance; section: SectionInstance; parentColumn?: BlockInstance; parentBlock?: BlockInstance } | null {
  for (const s of sections) {
    for (const b of s.blocks) {
      if (b.id === nodeId) return { block: b, section: s };
      // Search inside column blocks (Grid columns)
      if (b.blocks) {
        for (const cb of b.blocks) {
          if (cb.id === nodeId) return { block: cb, section: s, parentColumn: b };
          // Search inside section-type blocks inside columns (3rd level)
          if (cb.blocks) {
            for (const eb of cb.blocks) {
              if (eb.id === nodeId) return { block: eb, section: s, parentColumn: b, parentBlock: cb };
            }
          }
        }
      }
    }
  }
  return null;
}

function findColumn(sections: SectionInstance[], nodeId: string): { column: BlockInstance; section: SectionInstance } | null {
  for (const s of sections) {
    for (const b of s.blocks) {
      if (b.type === "Column" && b.id === nodeId) return { column: b, section: s };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function pageBuilderReducer(
  state: PageBuilderState,
  action: PageBuilderAction
): PageBuilderState {
  switch (action.type) {
    case "SET_PAGES":
      return { ...state, pages: action.pages };

    case "SET_CURRENT_PAGE":
      return {
        ...state,
        currentPage: action.page,
        sections: [],
        selectedNodeId: null,
      };

    case "SELECT_NODE":
      return { ...state, selectedNodeId: action.nodeId };

    case "ADD_SECTION": {
      const def = getSectionDefinition(action.sectionType);
      if (!def) return state;

      // For Grid sections, auto-create Column blocks
      let initialBlocks: BlockInstance[] = [];
      if (action.sectionType === "Grid") {
        const colDef = getBlockDefinition("Column");
        const colCount = (def.defaultSettings["columns"] as number) ?? 2;
        initialBlocks = Array.from({ length: colCount }, (): BlockInstance => ({
          id: uid(),
          type: "Column",
          settings: colDef ? { ...colDef.defaultSettings } : {},
          blocks: [],
        }));
      }

      const newSection: SectionInstance = {
        id: uid(),
        type: action.sectionType,
        zone: action.zone,
        settings: { ...def.defaultSettings },
        blocks: initialBlocks,
      };
      return {
        ...state,
        sections: [...state.sections, newSection],
        selectedNodeId: newSection.id,
      };
    }

    case "REMOVE_SECTION": {
      const filtered = state.sections.filter((s: SectionInstance) => s.id !== action.sectionId);
      return {
        ...state,
        sections: filtered,
        selectedNodeId: state.selectedNodeId === action.sectionId ? null : state.selectedNodeId,
      };
    }

    case "ADD_BLOCK": {
      const def = getBlockDefinition(action.blockType);
      if (!def) return state;
      const newBlock: BlockInstance = {
        id: uid(),
        type: action.blockType,
        settings: { ...def.defaultSettings },
      };
      const updatedSections = state.sections.map((s: SectionInstance) =>
        s.id === action.sectionId
          ? { ...s, blocks: [...s.blocks, newBlock] }
          : s
      );
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: newBlock.id,
      };
    }

    case "REMOVE_BLOCK": {
      const updatedSections = state.sections.map((s: SectionInstance) =>
        s.id === action.sectionId
          ? { ...s, blocks: s.blocks.filter((b: BlockInstance) => b.id !== action.blockId) }
          : s
      );
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: state.selectedNodeId === action.blockId ? null : state.selectedNodeId,
      };
    }

    case "UPDATE_SECTION_SETTINGS": {
      const updatedSections = state.sections.map((s: SectionInstance) =>
        s.id === action.sectionId
          ? { ...s, settings: { ...s.settings, ...action.settings } }
          : s
      );
      return { ...state, sections: updatedSections };
    }

    case "UPDATE_BLOCK_SETTINGS": {
      const updatedSections = state.sections.map((s: SectionInstance) =>
        s.id === action.sectionId
          ? {
              ...s,
              blocks: s.blocks.map((b: BlockInstance) =>
                b.id === action.blockId
                  ? { ...b, settings: { ...b.settings, ...action.settings } }
                  : b
              ),
            }
          : s
      );
      return { ...state, sections: updatedSections };
    }

    case "MOVE_BLOCK": {
      // Remove block from source section, insert into target section at index
      let movedBlock: BlockInstance | null = null;
      const sectionsAfterRemove = state.sections.map((s: SectionInstance) => {
        if (s.id === action.fromSectionId) {
          const block = s.blocks.find((b: BlockInstance) => b.id === action.blockId);
          if (block) movedBlock = block;
          return { ...s, blocks: s.blocks.filter((b: BlockInstance) => b.id !== action.blockId) };
        }
        return s;
      });
      if (!movedBlock) return state;
      const sectionsAfterInsert = sectionsAfterRemove.map((s: SectionInstance) => {
        if (s.id === action.toSectionId) {
          const newBlocks = [...s.blocks];
          newBlocks.splice(action.toIndex, 0, movedBlock!);
          return { ...s, blocks: newBlocks };
        }
        return s;
      });
      return { ...state, sections: sectionsAfterInsert };
    }

    case "REORDER_BLOCKS": {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        const newBlocks = [...s.blocks];
        const [moved] = newBlocks.splice(action.fromIndex, 1);
        if (!moved) return s;
        newBlocks.splice(action.toIndex, 0, moved);
        return { ...s, blocks: newBlocks };
      });
      return { ...state, sections: updatedSections };
    }

    case "SET_GRID_COLUMNS": {
      const colDef = getBlockDefinition("Column");
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId || s.type !== "Grid") return s;
        const currentCols = s.blocks.filter((b: BlockInstance) => b.type === "Column");
        const target = action.columnCount;
        if (target > currentCols.length) {
          // Add new columns
          const newCols: BlockInstance[] = Array.from(
            { length: target - currentCols.length },
            (): BlockInstance => ({
              id: uid(),
              type: "Column",
              settings: colDef ? { ...colDef.defaultSettings } : {},
              blocks: [],
            })
          );
          return { ...s, blocks: [...currentCols, ...newCols], settings: { ...s.settings, columns: target } };
        } else {
          // Remove columns from the end
          return { ...s, blocks: currentCols.slice(0, target), settings: { ...s.settings, columns: target } };
        }
      });
      return { ...state, sections: updatedSections };
    }

    case "ADD_BLOCK_TO_COLUMN": {
      const blockDef = getBlockDefinition(action.blockType);
      if (!blockDef) return state;
      const isSectionType = ["ImageWithText", "Hero"].includes(action.blockType);
      const newBlock: BlockInstance = {
        id: uid(),
        type: action.blockType,
        settings: { ...blockDef.defaultSettings },
        ...(isSectionType ? { blocks: [] } : {}),
      };
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: s.blocks.map((b: BlockInstance) => {
            if (b.id !== action.columnId) return b;
            return { ...b, blocks: [...(b.blocks ?? []), newBlock] };
          }),
        };
      });
      return { ...state, sections: updatedSections, selectedNodeId: newBlock.id };
    }

    case "REMOVE_BLOCK_FROM_COLUMN": {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: s.blocks.map((b: BlockInstance) => {
            if (b.id !== action.columnId) return b;
            return { ...b, blocks: (b.blocks ?? []).filter((cb: BlockInstance) => cb.id !== action.blockId) };
          }),
        };
      });
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: state.selectedNodeId === action.blockId ? null : state.selectedNodeId,
      };
    }

    case "UPDATE_COLUMN_SETTINGS": {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: s.blocks.map((b: BlockInstance) => {
            if (b.id !== action.columnId) return b;
            return { ...b, settings: { ...b.settings, ...action.settings } };
          }),
        };
      });
      return { ...state, sections: updatedSections };
    }

    case "MOVE_BLOCK_TO_COLUMN": {
      // Remove block from source (section direct, column, or nested inside a parent block in a column)
      let movedBlock: BlockInstance | null = null;
      const sectionsAfterRemove = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.fromSectionId) return s;
        if (action.fromColumnId) {
          return {
            ...s,
            blocks: s.blocks.map((col: BlockInstance) => {
              if (col.id !== action.fromColumnId) return col;
              if (action.fromParentBlockId) {
                // Remove from inside a parent block within a column
                return {
                  ...col,
                  blocks: (col.blocks ?? []).map((pb: BlockInstance) => {
                    if (pb.id !== action.fromParentBlockId) return pb;
                    const block = (pb.blocks ?? []).find((eb: BlockInstance) => eb.id === action.blockId);
                    if (block) movedBlock = block;
                    return { ...pb, blocks: (pb.blocks ?? []).filter((eb: BlockInstance) => eb.id !== action.blockId) };
                  }),
                };
              }
              // Remove from column direct
              const block = (col.blocks ?? []).find((cb: BlockInstance) => cb.id === action.blockId);
              if (block) movedBlock = block;
              return { ...col, blocks: (col.blocks ?? []).filter((cb: BlockInstance) => cb.id !== action.blockId) };
            }),
          };
        }
        // Remove from section's direct blocks
        const block = s.blocks.find((b: BlockInstance) => b.id === action.blockId);
        if (block) movedBlock = block;
        return { ...s, blocks: s.blocks.filter((b: BlockInstance) => b.id !== action.blockId) };
      });
      if (!movedBlock) return state;
      // Insert into target (column direct or inside a parent block in a column)
      const sectionsAfterInsert = sectionsAfterRemove.map((s: SectionInstance) => {
        if (s.id !== action.toSectionId) return s;
        return {
          ...s,
          blocks: s.blocks.map((col: BlockInstance) => {
            if (col.id !== action.toColumnId) return col;
            if (action.toParentBlockId) {
              // Insert into a parent block within the column
              return {
                ...col,
                blocks: (col.blocks ?? []).map((pb: BlockInstance) => {
                  if (pb.id !== action.toParentBlockId) return pb;
                  const newBlocks = [...(pb.blocks ?? [])];
                  newBlocks.splice(action.toIndex, 0, movedBlock!);
                  return { ...pb, blocks: newBlocks };
                }),
              };
            }
            // Insert into column direct
            const newBlocks = [...(col.blocks ?? [])];
            newBlocks.splice(action.toIndex, 0, movedBlock!);
            return { ...col, blocks: newBlocks };
          }),
        };
      });
      return { ...state, sections: sectionsAfterInsert };
    }

    case "UPDATE_BLOCK_IN_COLUMN": {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: s.blocks.map((col: BlockInstance) => {
            if (col.id !== action.columnId) return col;
            return {
              ...col,
              blocks: (col.blocks ?? []).map((b: BlockInstance) => {
                if (b.id !== action.blockId) return b;
                return { ...b, settings: { ...b.settings, ...action.settings } };
              }),
            };
          }),
        };
      });
      return { ...state, sections: updatedSections };
    }

    case "ADD_ELEMENT_TO_NESTED_BLOCK": {
      const elemDef = getBlockDefinition(action.elementType);
      if (!elemDef) return state;
      const newElem: BlockInstance = {
        id: uid(),
        type: action.elementType,
        settings: { ...elemDef.defaultSettings },
      };
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: s.blocks.map((col: BlockInstance) => {
            if (col.id !== action.columnId) return col;
            return {
              ...col,
              blocks: (col.blocks ?? []).map((pb: BlockInstance) => {
                if (pb.id !== action.parentBlockId) return pb;
                return { ...pb, blocks: [...(pb.blocks ?? []), newElem] };
              }),
            };
          }),
        };
      });
      return { ...state, sections: updatedSections, selectedNodeId: newElem.id };
    }

    case "REMOVE_ELEMENT_FROM_NESTED_BLOCK": {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: s.blocks.map((col: BlockInstance) => {
            if (col.id !== action.columnId) return col;
            return {
              ...col,
              blocks: (col.blocks ?? []).map((pb: BlockInstance) => {
                if (pb.id !== action.parentBlockId) return pb;
                return { ...pb, blocks: (pb.blocks ?? []).filter((eb: BlockInstance) => eb.id !== action.elementId) };
              }),
            };
          }),
        };
      });
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: state.selectedNodeId === action.elementId ? null : state.selectedNodeId,
      };
    }

    case "UPDATE_NESTED_BLOCK_SETTINGS": {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: s.blocks.map((col: BlockInstance) => {
            if (col.id !== action.columnId) return col;
            return {
              ...col,
              blocks: (col.blocks ?? []).map((pb: BlockInstance) => {
                if (pb.id !== action.parentBlockId) return pb;
                return {
                  ...pb,
                  blocks: (pb.blocks ?? []).map((eb: BlockInstance) => {
                    if (eb.id !== action.blockId) return eb;
                    return { ...eb, settings: { ...eb.settings, ...action.settings } };
                  }),
                };
              }),
            };
          }),
        };
      });
      return { ...state, sections: updatedSections };
    }

    case "REORDER_SECTIONS": {
      const zoneOrder: PageZone[] = ["header", "template", "footer"];
      // Split sections by zone
      const byZone: Record<PageZone, SectionInstance[]> = { header: [], template: [], footer: [] };
      for (const s of state.sections) {
        byZone[s.zone].push(s);
      }
      // Reorder within the target zone
      const zoneList = [...byZone[action.zone]];
      const [moved] = zoneList.splice(action.fromIndex, 1);
      if (!moved) return state;
      zoneList.splice(action.toIndex, 0, moved);
      byZone[action.zone] = zoneList;
      // Rebuild flat array in zone order
      const reordered = zoneOrder.flatMap((z: PageZone) => byZone[z]);
      return { ...state, sections: reordered };
    }

    case "MOVE_SECTION_TO_ZONE": {
      const section = state.sections.find((s: SectionInstance) => s.id === action.sectionId);
      if (!section) return state;
      const zOrder: PageZone[] = ["header", "template", "footer"];
      // Remove section from current position
      const remaining = state.sections.filter((s: SectionInstance) => s.id !== action.sectionId);
      // Split remaining by zone
      const grouped: Record<PageZone, SectionInstance[]> = { header: [], template: [], footer: [] };
      for (const s of remaining) {
        grouped[s.zone].push(s);
      }
      // Insert into target zone at index with updated zone
      const movedSection: SectionInstance = { ...section, zone: action.toZone };
      const targetList = [...grouped[action.toZone]];
      targetList.splice(action.toIndex, 0, movedSection);
      grouped[action.toZone] = targetList;
      // Rebuild flat array
      const rebuilt = zOrder.flatMap((z: PageZone) => grouped[z]);
      return { ...state, sections: rebuilt };
    }

    case "TOGGLE_LEFT_PANEL":
      return { ...state, leftPanelCollapsed: !state.leftPanelCollapsed };

    case "TOGGLE_RIGHT_PANEL":
      return { ...state, rightPanelCollapsed: !state.rightPanelCollapsed };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const initialState: PageBuilderState = {
  pages: [],
  currentPage: null,
  sections: [],
  selectedNodeId: null,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
};

interface PageBuilderContextValue {
  state: PageBuilderState;
  dispatch: React.Dispatch<PageBuilderAction>;
  selectedSection: SectionInstance | null;
  selectedBlock: BlockInstance | null;
  selectedParentSection: SectionInstance | null;
  selectedColumn: BlockInstance | null;
  selectedColumnParentSection: SectionInstance | null;
  selectedParentColumn: BlockInstance | null;
  selectedParentBlock: BlockInstance | null;
}

const PageBuilderContext = createContext<PageBuilderContextValue | undefined>(
  undefined
);

export function PageBuilderProvider({ children }: { children: ReactNode }): React.ReactNode {
  const [state, dispatch] = useReducer(pageBuilderReducer, initialState);

  const { selectedSection, selectedBlock, selectedParentSection, selectedColumn, selectedColumnParentSection, selectedParentColumn, selectedParentBlock } = useMemo(() => {
    const empty = {
      selectedSection: null as SectionInstance | null,
      selectedBlock: null as BlockInstance | null,
      selectedParentSection: null as SectionInstance | null,
      selectedColumn: null as BlockInstance | null,
      selectedColumnParentSection: null as SectionInstance | null,
      selectedParentColumn: null as BlockInstance | null,
      selectedParentBlock: null as BlockInstance | null,
    };
    if (!state.selectedNodeId) return empty;

    // Check if it's a section
    const section = findSection(state.sections, state.selectedNodeId);
    if (section) {
      return { ...empty, selectedSection: section };
    }

    // Check if it's a column
    const colResult = findColumn(state.sections, state.selectedNodeId);
    if (colResult) {
      return { ...empty, selectedColumn: colResult.column, selectedColumnParentSection: colResult.section };
    }

    // Check if it's a block (including blocks inside columns and nested blocks)
    const blockResult = findBlock(state.sections, state.selectedNodeId);
    if (blockResult) {
      return {
        ...empty,
        selectedBlock: blockResult.block,
        selectedParentSection: blockResult.section,
        selectedParentColumn: blockResult.parentColumn ?? null,
        selectedParentBlock: blockResult.parentBlock ?? null,
      };
    }

    return empty;
  }, [state.sections, state.selectedNodeId]);

  const value = useMemo(
    () => ({ state, dispatch, selectedSection, selectedBlock, selectedParentSection, selectedColumn, selectedColumnParentSection, selectedParentColumn, selectedParentBlock }),
    [state, dispatch, selectedSection, selectedBlock, selectedParentSection, selectedColumn, selectedColumnParentSection, selectedParentColumn, selectedParentBlock]
  );

  return (
    <PageBuilderContext.Provider value={value}>
      {children}
    </PageBuilderContext.Provider>
  );
}

export function usePageBuilder(): PageBuilderContextValue {
  const ctx = useContext(PageBuilderContext);
  if (!ctx) {
    throw new Error("usePageBuilder must be used within PageBuilderProvider");
  }
  return ctx;
}
