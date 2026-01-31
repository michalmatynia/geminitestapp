"use client";

import React, { createContext, useContext, useReducer, useMemo, type ReactNode } from "react";
import type {
  PageBuilderState,
  PageBuilderAction,
  SectionInstance,
  BlockInstance,
  PageZone,
  PageBuilderSnapshot,
  SettingsField,
} from "../types/page-builder";
import { DEFAULT_INSPECTOR_SETTINGS } from "../types/page-builder";
import type { PageComponent } from "../types";
import { getSectionDefinition, getBlockDefinition } from "../components/page-builder/section-registry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GLOBAL_ID_KEY = "__cmsNextId";

function getNextId(): number {
  const globalScope = globalThis as { [GLOBAL_ID_KEY]?: number };
  if (typeof globalScope[GLOBAL_ID_KEY] !== "number") {
    globalScope[GLOBAL_ID_KEY] = 1000;
  }
  return globalScope[GLOBAL_ID_KEY] as number;
}

function bumpNextId(target: number): void {
  const globalScope = globalThis as { [GLOBAL_ID_KEY]?: number };
  if (typeof globalScope[GLOBAL_ID_KEY] !== "number" || (globalScope[GLOBAL_ID_KEY] as number) < target) {
    globalScope[GLOBAL_ID_KEY] = target;
  }
}

function uid(): string {
  const current = getNextId();
  bumpNextId(current + 1);
  return `node-${current}`;
}

const NODE_ID_REGEX = /node-(\d+)/;

function syncNextIdFromSections(sections: SectionInstance[]): void {
  let maxId = 999;
  const stack: Array<SectionInstance | BlockInstance> = [...sections];
  while (stack.length) {
    const item = stack.pop();
    if (!item) continue;
    const id = typeof item.id === "string" ? item.id : "";
    const match = NODE_ID_REGEX.exec(id);
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) {
        maxId = Math.max(maxId, value);
      }
    }
    const blocks = "blocks" in item ? item.blocks : undefined;
    if (blocks && blocks.length > 0) {
      stack.push(...blocks);
    }
  }
  bumpNextId(maxId + 1);
}

function ensureUniqueId(id: unknown, seen: Set<string>): string {
  let nextId = typeof id === "string" && id.length > 0 ? id : uid();
  if (!seen.has(nextId)) {
    seen.add(nextId);
    return nextId;
  }
  do {
    nextId = uid();
  } while (seen.has(nextId));
  seen.add(nextId);
  return nextId;
}

function createColumnBlock(): BlockInstance {
  const colDef = getBlockDefinition("Column");
  return {
    id: uid(),
    type: "Column",
    settings: colDef ? { ...colDef.defaultSettings } : {},
    blocks: [],
  };
}

function createRowBlock(columnCount: number): BlockInstance {
  const rowDef = getBlockDefinition("Row");
  return {
    id: uid(),
    type: "Row",
    settings: rowDef ? { ...rowDef.defaultSettings } : {},
    blocks: Array.from({ length: Math.max(1, columnCount) }, () => createColumnBlock()),
  };
}

function ensureGridRows(section: SectionInstance): SectionInstance {
  if (section.type !== "Grid") return section;
  const rows = section.blocks.filter((b: BlockInstance) => b.type === "Row");
  const columns = section.blocks.filter((b: BlockInstance) => b.type === "Column");
  if (rows.length > 0) {
    if (columns.length === 0) return section;
    const rowDef = getBlockDefinition("Row");
    const extraRow: BlockInstance = {
      id: uid(),
      type: "Row",
      settings: rowDef ? { ...rowDef.defaultSettings } : {},
      blocks: columns,
    };
    const allRows = [...rows, extraRow];
    const maxColumns = Math.max(
      1,
      ...allRows.map((row: BlockInstance) => (row.blocks ?? []).filter((b: BlockInstance) => b.type === "Column").length)
    );
    return {
      ...section,
      blocks: allRows,
      settings: { ...section.settings, rows: allRows.length, columns: maxColumns },
    };
  }
  const rowDef = getBlockDefinition("Row");
  const rowsSetting = (section.settings["rows"] as number) ?? 1;
  const columnsSetting = (section.settings["columns"] as number) ?? Math.max(1, columns.length || 1);
  if (columns.length === 0) {
    const rows = Array.from({ length: Math.max(1, rowsSetting) }, () => createRowBlock(columnsSetting));
    return { ...section, blocks: rows, settings: { ...section.settings, rows: rows.length, columns: columnsSetting } };
  }
  const row: BlockInstance = {
    id: uid(),
    type: "Row",
    settings: rowDef ? { ...rowDef.defaultSettings } : {},
    blocks: columns,
  };
  return { ...section, blocks: [row], settings: { ...section.settings, rows: 1, columns: columns.length } };
}

function updateColumnBlocks(
  blocks: BlockInstance[],
  columnId: string,
  updater: (column: BlockInstance) => BlockInstance
): BlockInstance[] {
  return blocks.map((block: BlockInstance) => {
    if (block.type === "Column") {
      return block.id === columnId ? updater(block) : block;
    }
    if (block.type === "Row" && block.blocks) {
      return { ...block, blocks: updateColumnBlocks(block.blocks, columnId, updater) };
    }
    return block;
  });
}

function updateRowBlocks(
  blocks: BlockInstance[],
  rowId: string,
  updater: (row: BlockInstance) => BlockInstance
): BlockInstance[] {
  return blocks.map((block: BlockInstance) => {
    if (block.type === "Row") {
      return block.id === rowId ? updater(block) : block;
    }
    return block;
  });
}

function removeColumnFromRows(
  blocks: BlockInstance[],
  columnId: string,
  rowId?: string
): { blocks: BlockInstance[]; removed: boolean } {
  let removed = false;
  const nextBlocks = blocks.map((block: BlockInstance) => {
    if (block.type !== "Row") return block;
    const rowBlocks = block.blocks ?? [];
    const columns = rowBlocks.filter((b: BlockInstance) => b.type === "Column");
    const isTargetRow = rowId ? block.id === rowId : rowBlocks.some((b: BlockInstance) => b.id === columnId);
    if (!isTargetRow) return block;
    if (columns.length <= 1) return block;
    const nextRowBlocks = rowBlocks.filter((b: BlockInstance) => b.id !== columnId);
    if (nextRowBlocks.length === rowBlocks.length) return block;
    removed = true;
    return { ...block, blocks: nextRowBlocks };
  });
  return { blocks: nextBlocks, removed };
}

function removeBlockFromColumnBlocks(
  blocks: BlockInstance[],
  columnId: string,
  blockId: string,
  fromParentBlockId?: string
): { blocks: BlockInstance[]; moved?: BlockInstance } {
  let moved: BlockInstance | undefined;
  const nextBlocks = blocks.map((block: BlockInstance) => {
    if (block.type === "Row" && block.blocks) {
      const result = removeBlockFromColumnBlocks(block.blocks, columnId, blockId, fromParentBlockId);
      if (result.moved) moved = result.moved;
      return { ...block, blocks: result.blocks };
    }
    if (block.type === "Column" && block.id === columnId) {
      if (fromParentBlockId) {
        return {
          ...block,
          blocks: (block.blocks ?? []).map((pb: BlockInstance) => {
            if (pb.id !== fromParentBlockId) return pb;
            const found = (pb.blocks ?? []).find((eb: BlockInstance) => eb.id === blockId);
            if (found) moved = found;
            return { ...pb, blocks: (pb.blocks ?? []).filter((eb: BlockInstance) => eb.id !== blockId) };
          }),
        };
      }
      const found = (block.blocks ?? []).find((cb: BlockInstance) => cb.id === blockId);
      if (found) moved = found;
      return { ...block, blocks: (block.blocks ?? []).filter((cb: BlockInstance) => cb.id !== blockId) };
    }
    return block;
  });
  return { blocks: nextBlocks, moved };
}

function insertBlockIntoColumnBlocks(
  blocks: BlockInstance[],
  columnId: string,
  block: BlockInstance,
  toIndex: number,
  toParentBlockId?: string
): BlockInstance[] {
  return blocks.map((blockItem: BlockInstance) => {
    if (blockItem.type === "Row" && blockItem.blocks) {
      return {
        ...blockItem,
        blocks: insertBlockIntoColumnBlocks(blockItem.blocks, columnId, block, toIndex, toParentBlockId),
      };
    }
    if (blockItem.type === "Column" && blockItem.id === columnId) {
      if (toParentBlockId) {
        return {
          ...blockItem,
          blocks: (blockItem.blocks ?? []).map((pb: BlockInstance) => {
            if (pb.id !== toParentBlockId) return pb;
            const newBlocks = [...(pb.blocks ?? [])];
            newBlocks.splice(toIndex, 0, block);
            return { ...pb, blocks: newBlocks };
          }),
        };
      }
      const newBlocks = [...(blockItem.blocks ?? [])];
      newBlocks.splice(toIndex, 0, block);
      return { ...blockItem, blocks: newBlocks };
    }
    return blockItem;
  });
}

function normalizeBlocks(blocks: BlockInstance[], seen: Set<string>): BlockInstance[] {
  return blocks.map((block: BlockInstance): BlockInstance => {
    const normalizedId = ensureUniqueId(block.id, seen);
    const nested = block.blocks ? normalizeBlocks(block.blocks, seen) : undefined;
    return {
      ...block,
      id: normalizedId,
      ...(nested ? { blocks: nested } : {}),
    };
  });
}

function normalizeSections(sections: SectionInstance[]): SectionInstance[] {
  const seen = new Set<string>();
  return sections.map((section: SectionInstance): SectionInstance => {
    const normalizedId = ensureUniqueId(section.id, seen);
    const baseSection = ensureGridRows({ ...section, id: normalizedId });
    const normalizedBlocks = normalizeBlocks(baseSection.blocks ?? [], seen);
    return {
      ...baseSection,
      blocks: normalizedBlocks,
    };
  });
}

function findSection(sections: SectionInstance[], nodeId: string): SectionInstance | null {
  for (const s of sections) {
    if (s.id === nodeId) return s;
  }
  return null;
}

function findBlock(
  sections: SectionInstance[],
  nodeId: string
): { block: BlockInstance; section: SectionInstance; parentColumn?: BlockInstance; parentBlock?: BlockInstance } | null {
  const searchBlocks = (
    blocks: BlockInstance[],
    section: SectionInstance,
    parentColumn?: BlockInstance,
    parentBlock?: BlockInstance
  ): { block: BlockInstance; section: SectionInstance; parentColumn?: BlockInstance; parentBlock?: BlockInstance } | null => {
    for (const b of blocks) {
      if (b.id === nodeId) return { block: b, section, parentColumn, parentBlock };
      if (!b.blocks || b.blocks.length === 0) continue;
      if (b.type === "Column") {
        for (const cb of b.blocks ?? []) {
          if (cb.id === nodeId) return { block: cb, section, parentColumn: b };
          if (cb.blocks) {
            for (const eb of cb.blocks) {
              if (eb.id === nodeId) return { block: eb, section, parentColumn: b, parentBlock: cb };
            }
          }
        }
        continue;
      }
      const nested = searchBlocks(b.blocks ?? [], section, parentColumn, parentBlock);
      if (nested) return nested;
    }
    return null;
  };

  for (const s of sections) {
    const result = searchBlocks(s.blocks ?? [], s);
    if (result) return result;
  }
  return null;
}

function findColumn(sections: SectionInstance[], nodeId: string): { column: BlockInstance; section: SectionInstance } | null {
  const searchColumns = (blocks: BlockInstance[], section: SectionInstance): { column: BlockInstance; section: SectionInstance } | null => {
    for (const b of blocks) {
      if (b.type === "Column" && b.id === nodeId) return { column: b, section };
      if (b.blocks) {
        const nested = searchColumns(b.blocks, section);
        if (nested) return nested;
      }
    }
    return null;
  };
  for (const s of sections) {
    const result = searchColumns(s.blocks ?? [], s);
    if (result) return result;
  }
  return null;
}

function cloneBlock(block: BlockInstance): BlockInstance {
  return {
    id: uid(),
    type: block.type,
    settings: { ...block.settings },
    ...(block.blocks ? { blocks: block.blocks.map(cloneBlock) } : {}),
  };
}

function cloneSection(section: SectionInstance): SectionInstance {
  const cloned: SectionInstance = {
    id: uid(),
    type: section.type,
    zone: section.zone,
    settings: { ...section.settings },
    blocks: section.blocks.map(cloneBlock),
  };
  return ensureGridRows(cloned);
}

function applySettingsDefaults(
  settings: Record<string, unknown>,
  schema: SettingsField[] | undefined,
  base: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base, ...settings };
  if (Array.isArray(schema)) {
    for (const field of schema) {
      if (merged[field.key] === undefined && field.defaultValue !== undefined) {
        merged[field.key] = field.defaultValue;
      }
    }
  }
  return merged;
}

function buildSectionSettings(type: string, settings: Record<string, unknown>): Record<string, unknown> {
  const def = getSectionDefinition(type);
  if (!def) return settings;
  const merged = applySettingsDefaults(settings, def.settingsSchema, def.defaultSettings);
  if (type === "AnnouncementBar") {
    const left = typeof merged.paddingLeft === "number" ? merged.paddingLeft : undefined;
    const right = typeof merged.paddingRight === "number" ? merged.paddingRight : undefined;
    return {
      ...merged,
      paddingLeft: left === 24 || left === undefined ? 0 : left,
      paddingRight: right === 24 || right === undefined ? 0 : right,
    };
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function basePageBuilderReducer(
  state: PageBuilderState,
  action: PageBuilderAction
): PageBuilderState {
  switch (action.type) {
    case "SET_PAGES":
      return { ...state, pages: action.pages };

    case "SET_CURRENT_PAGE": {
      // Reconstruct SectionInstance[] from the page's saved components
      const reconstructedSections: SectionInstance[] = (action.page.components ?? []).map(
        (comp: PageComponent, idx: number): SectionInstance => {
          const content = comp.content as {
            zone?: PageZone;
            settings?: Record<string, unknown>;
            blocks?: BlockInstance[];
          };
          return {
            id: `loaded-${idx}-${uid()}`,
            type: comp.type,
            zone: (content.zone as PageZone) ?? "template",
            settings: buildSectionSettings(comp.type, content.settings ?? {}),
            blocks: content.blocks ?? [],
          };
        }
      );
      const normalizedSections = normalizeSections(reconstructedSections);
      syncNextIdFromSections(normalizedSections);
      return {
        ...state,
        currentPage: action.page,
        sections: normalizedSections,
        selectedNodeId: null,
      };
    }

    case "CLEAR_CURRENT_PAGE":
      return {
        ...state,
        currentPage: null,
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
        const rows = (def.defaultSettings["rows"] as number) ?? 1;
        const colCount = (def.defaultSettings["columns"] as number) ?? 2;
        initialBlocks = Array.from({ length: Math.max(1, rows) }, () => createRowBlock(colCount));
      }

      const newSection: SectionInstance = {
        id: uid(),
        type: action.sectionType,
        zone: action.zone,
        settings: buildSectionSettings(action.sectionType, {}),
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
      if (action.blockType === "Row") {
        const updatedSections = state.sections.map((s: SectionInstance) => {
          if (s.id !== action.sectionId) return s;
          if (s.type !== "Grid") return s;
          const normalized = ensureGridRows(s);
          const rows = normalized.blocks.filter((b: BlockInstance) => b.type === "Row");
          const columnsPerRow =
            (normalized.settings["columns"] as number) ??
            Math.max(1, (rows[0]?.blocks ?? []).filter((b: BlockInstance) => b.type === "Column").length || 1);
          const nextRows = [...rows, createRowBlock(columnsPerRow)];
          return { ...normalized, blocks: nextRows, settings: { ...normalized.settings, rows: nextRows.length, columns: columnsPerRow } };
        });
        return { ...state, sections: updatedSections };
      }
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
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId || s.type !== "Grid") return s;
        const normalized = ensureGridRows(s);
        const rows = normalized.blocks.filter((b: BlockInstance) => b.type === "Row");
        const targetCols = Math.max(1, action.columnCount);
        const nextRows = rows.map((row: BlockInstance) => {
          const cols = (row.blocks ?? []).filter((b: BlockInstance) => b.type === "Column");
          if (cols.length < targetCols) {
            const newCols = Array.from({ length: targetCols - cols.length }, () => createColumnBlock());
            return { ...row, blocks: [...cols, ...newCols] };
          }
          return { ...row, blocks: cols.slice(0, targetCols) };
        });
        return { ...normalized, blocks: nextRows, settings: { ...normalized.settings, columns: targetCols, rows: nextRows.length } };
      });
      return { ...state, sections: updatedSections };
    }

    case "SET_GRID_ROWS": {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId || s.type !== "Grid") return s;
        const normalized = ensureGridRows(s);
        const rows = normalized.blocks.filter((b: BlockInstance) => b.type === "Row");
        const columnsPerRow =
          (normalized.settings["columns"] as number) ??
          Math.max(1, (rows[0]?.blocks ?? []).filter((b: BlockInstance) => b.type === "Column").length || 1);
        const targetRows = Math.max(1, action.rowCount);
        let nextRows = rows;
        if (targetRows > rows.length) {
          const newRows = Array.from({ length: targetRows - rows.length }, () => createRowBlock(columnsPerRow));
          nextRows = [...rows, ...newRows];
        } else {
          nextRows = rows.slice(0, targetRows);
        }
        return { ...normalized, blocks: nextRows, settings: { ...normalized.settings, rows: targetRows, columns: columnsPerRow } };
      });
      return { ...state, sections: updatedSections };
    }

    case "ADD_GRID_ROW": {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId || s.type !== "Grid") return s;
        const normalized = ensureGridRows(s);
        const rows = normalized.blocks.filter((b: BlockInstance) => b.type === "Row");
        const columnsPerRow =
          (normalized.settings["columns"] as number) ??
          Math.max(1, (rows[0]?.blocks ?? []).filter((b: BlockInstance) => b.type === "Column").length || 1);
        const nextRows = [...rows, createRowBlock(columnsPerRow)];
        return { ...normalized, blocks: nextRows, settings: { ...normalized.settings, rows: nextRows.length, columns: columnsPerRow } };
      });
      return { ...state, sections: updatedSections };
    }

    case "REMOVE_GRID_ROW": {
      let didRemove = false;
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId || s.type !== "Grid") return s;
        const normalized = ensureGridRows(s);
        const rows = normalized.blocks.filter((b: BlockInstance) => b.type === "Row");
        if (rows.length <= 1) return normalized;
        const nextRows = rows.filter((row: BlockInstance) => row.id !== action.rowId);
        if (nextRows.length === rows.length) return normalized;
        didRemove = true;
        const maxColumns = Math.max(
          1,
          ...nextRows.map((row: BlockInstance) => (row.blocks ?? []).filter((b: BlockInstance) => b.type === "Column").length)
        );
        return {
          ...normalized,
          blocks: nextRows,
          settings: { ...normalized.settings, rows: nextRows.length, columns: maxColumns },
        };
      });
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: didRemove && state.selectedNodeId === action.rowId ? null : state.selectedNodeId,
      };
    }

    case "ADD_COLUMN_TO_ROW": {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId || s.type !== "Grid") return s;
        const normalized = ensureGridRows(s);
        let maxColumns = (normalized.settings["columns"] as number) ?? 1;
        const nextBlocks = updateRowBlocks(normalized.blocks, action.rowId, (row: BlockInstance) => {
          const cols = row.blocks ?? [];
          const nextCols = [...cols, createColumnBlock()];
          maxColumns = Math.max(maxColumns, nextCols.length);
          return { ...row, blocks: nextCols };
        });
        const rowCount = nextBlocks.filter((b: BlockInstance) => b.type === "Row").length;
        return { ...normalized, blocks: nextBlocks, settings: { ...normalized.settings, rows: rowCount, columns: maxColumns } };
      });
      return { ...state, sections: updatedSections };
    }

    case "REMOVE_COLUMN_FROM_ROW": {
      let didRemove = false;
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId || s.type !== "Grid") return s;
        const normalized = ensureGridRows(s);
        const result = removeColumnFromRows(normalized.blocks, action.columnId, action.rowId);
        if (!result.removed) return normalized;
        didRemove = true;
        const rows = result.blocks.filter((b: BlockInstance) => b.type === "Row");
        const maxColumns = Math.max(
          1,
          ...rows.map((row: BlockInstance) => (row.blocks ?? []).filter((b: BlockInstance) => b.type === "Column").length)
        );
        return {
          ...normalized,
          blocks: result.blocks,
          settings: { ...normalized.settings, rows: rows.length, columns: maxColumns },
        };
      });
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: didRemove && state.selectedNodeId === action.columnId ? null : state.selectedNodeId,
      };
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
          blocks: updateColumnBlocks(s.blocks, action.columnId, (column: BlockInstance) => ({
            ...column,
            blocks: [...(column.blocks ?? []), newBlock],
          })),
        };
      });
      return { ...state, sections: updatedSections, selectedNodeId: newBlock.id };
    }

    case "REMOVE_BLOCK_FROM_COLUMN": {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: updateColumnBlocks(s.blocks, action.columnId, (column: BlockInstance) => ({
            ...column,
            blocks: (column.blocks ?? []).filter((cb: BlockInstance) => cb.id !== action.blockId),
          })),
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
          blocks: updateColumnBlocks(s.blocks, action.columnId, (column: BlockInstance) => ({
            ...column,
            settings: { ...column.settings, ...action.settings },
          })),
        };
      });
      return { ...state, sections: updatedSections };
    }

    case "MOVE_BLOCK_TO_COLUMN": {
      // Remove block from source (section direct, column, or nested inside a parent block in a column)
      const removeFromSource = (
        sections: SectionInstance[],
        fromSectionId: string,
        fromColumnId?: string,
        fromParentBlockId?: string
      ): { sections: SectionInstance[]; moved: BlockInstance | null } => {
        let moved: BlockInstance | null = null;
        const nextSections = sections.map((s: SectionInstance) => {
          if (s.id !== fromSectionId) return s;
          if (fromColumnId) {
            const result = removeBlockFromColumnBlocks(s.blocks, fromColumnId, action.blockId, fromParentBlockId);
            if (result.moved) moved = result.moved;
            return { ...s, blocks: result.blocks };
          }
          // Remove from section's direct blocks
          const block = s.blocks.find((b: BlockInstance) => b.id === action.blockId);
          if (block) moved = block;
          return { ...s, blocks: s.blocks.filter((b: BlockInstance) => b.id !== action.blockId) };
        });
        return { sections: nextSections, moved };
      };

      let removal = removeFromSource(state.sections, action.fromSectionId, action.fromColumnId, action.fromParentBlockId);
      if (!removal.moved) {
        const found = findBlock(state.sections, action.blockId);
        if (!found) return state;
        removal = removeFromSource(
          state.sections,
          found.section.id,
          found.parentColumn?.id,
          found.parentBlock?.id
        );
      }
      if (!removal.moved) return state;
      // Insert into target (column direct or inside a parent block in a column)
      const sectionsAfterInsert = removal.sections.map((s: SectionInstance) => {
        if (s.id !== action.toSectionId) return s;
        return {
          ...s,
          blocks: insertBlockIntoColumnBlocks(s.blocks, action.toColumnId, removal.moved!, action.toIndex, action.toParentBlockId),
        };
      });
      return { ...state, sections: sectionsAfterInsert };
    }

    case "CONVERT_SECTION_TO_BLOCK": {
      if (action.sectionId === action.toSectionId) return state;
      const sourceSection = state.sections.find((s: SectionInstance) => s.id === action.sectionId);
      if (!sourceSection) return state;
      if (sourceSection.type !== "TextElement") return state;
      const targetSection = state.sections.find((s: SectionInstance) => s.id === action.toSectionId);
      if (!targetSection) return state;

      const blockDef = getBlockDefinition("TextElement");
      const convertedBlock: BlockInstance = {
        id: uid(),
        type: "TextElement",
        settings: {
          ...(blockDef?.defaultSettings ?? {}),
          ...sourceSection.settings,
        },
      };

      const remaining = state.sections.filter((s: SectionInstance) => s.id !== action.sectionId);
      const updatedSections = remaining.map((s: SectionInstance) => {
        if (s.id !== action.toSectionId) return s;
        const nextBlocks = [...s.blocks];
        nextBlocks.splice(action.toIndex, 0, convertedBlock);
        return { ...s, blocks: nextBlocks };
      });

      return { ...state, sections: updatedSections, selectedNodeId: convertedBlock.id };
    }

    case "MOVE_SECTION_TO_COLUMN": {
      const CONVERTIBLE_TYPES = ["ImageWithText", "RichText", "Hero"];
      const sourceSection = state.sections.find((s: SectionInstance) => s.id === action.sectionId);
      if (!sourceSection) return state;
      if (!CONVERTIBLE_TYPES.includes(sourceSection.type)) return state;
      // Prevent dropping a Grid into its own columns
      if (action.sectionId === action.toSectionId) return state;

      const convertedBlock: BlockInstance = {
        id: uid(),
        type: sourceSection.type,
        settings: { ...sourceSection.settings },
        blocks: sourceSection.blocks.length > 0 ? [...sourceSection.blocks] : [],
      };

      // Remove section from sections array
      const remaining = state.sections.filter((s: SectionInstance) => s.id !== action.sectionId);

      // Insert the converted block into the target column
      const updatedSections = remaining.map((s: SectionInstance) => {
        if (s.id !== action.toSectionId) return s;
        return {
          ...s,
          blocks: insertBlockIntoColumnBlocks(s.blocks, action.toColumnId, convertedBlock, action.toIndex, action.toParentBlockId),
        };
      });

      return { ...state, sections: updatedSections, selectedNodeId: convertedBlock.id };
    }

    case "UPDATE_BLOCK_IN_COLUMN": {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: updateColumnBlocks(s.blocks, action.columnId, (col: BlockInstance) => ({
            ...col,
            blocks: (col.blocks ?? []).map((b: BlockInstance) =>
              b.id === action.blockId ? { ...b, settings: { ...b.settings, ...action.settings } } : b
            ),
          })),
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
          blocks: updateColumnBlocks(s.blocks, action.columnId, (col: BlockInstance) => ({
            ...col,
            blocks: (col.blocks ?? []).map((pb: BlockInstance) =>
              pb.id === action.parentBlockId ? { ...pb, blocks: [...(pb.blocks ?? []), newElem] } : pb
            ),
          })),
        };
      });
      return { ...state, sections: updatedSections, selectedNodeId: newElem.id };
    }

    case "REMOVE_ELEMENT_FROM_NESTED_BLOCK": {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: updateColumnBlocks(s.blocks, action.columnId, (col: BlockInstance) => ({
            ...col,
            blocks: (col.blocks ?? []).map((pb: BlockInstance) =>
              pb.id === action.parentBlockId
                ? { ...pb, blocks: (pb.blocks ?? []).filter((eb: BlockInstance) => eb.id !== action.elementId) }
                : pb
            ),
          })),
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
          blocks: updateColumnBlocks(s.blocks, action.columnId, (col: BlockInstance) => ({
            ...col,
            blocks: (col.blocks ?? []).map((pb: BlockInstance) =>
              pb.id === action.parentBlockId
                ? {
                    ...pb,
                    blocks: (pb.blocks ?? []).map((eb: BlockInstance) =>
                      eb.id === action.blockId ? { ...eb, settings: { ...eb.settings, ...action.settings } } : eb
                    ),
                  }
                : pb
            ),
          })),
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

    case "SET_PAGE_STATUS": {
      if (!state.currentPage) return state;
      return {
        ...state,
        currentPage: {
          ...state.currentPage,
          status: action.status,
          publishedAt: action.status === "published" ? new Date().toISOString() : state.currentPage.publishedAt,
        },
      };
    }

    case "UPDATE_SEO": {
      if (!state.currentPage) return state;
      return {
        ...state,
        currentPage: {
          ...state.currentPage,
          ...action.seo,
        },
      };
    }

    case "UPDATE_PAGE_SLUGS": {
      if (!state.currentPage) return state;
      return {
        ...state,
        currentPage: {
          ...state.currentPage,
          slugs: action.slugValues.map((slug) => ({ slug: { slug } })),
          slugIds: action.slugIds,
        },
      };
    }

    case "TOGGLE_INSPECTOR":
      return { ...state, inspectorEnabled: !state.inspectorEnabled };

    case "UPDATE_INSPECTOR_SETTINGS":
      return {
        ...state,
        inspectorSettings: {
          ...state.inspectorSettings,
          ...action.settings,
        },
      };

    case "SET_PREVIEW_MODE":
      return { ...state, previewMode: action.mode };

    case "TOGGLE_LEFT_PANEL":
      return { ...state, leftPanelCollapsed: !state.leftPanelCollapsed };

    case "TOGGLE_RIGHT_PANEL":
      return { ...state, rightPanelCollapsed: !state.rightPanelCollapsed };

    case "COPY_SECTION": {
      const section = findSection(state.sections, action.sectionId);
      if (!section) return state;
      return { ...state, clipboard: { type: "section", data: section } };
    }

    case "PASTE_SECTION": {
      if (!state.clipboard || state.clipboard.type !== "section") return state;
      const cloned = cloneSection(state.clipboard.data as SectionInstance);
      cloned.zone = action.zone;
      return {
        ...state,
        sections: [...state.sections, cloned],
        selectedNodeId: cloned.id,
      };
    }

    case "COPY_BLOCK": {
      const found = findBlock(state.sections, action.blockId);
      if (!found) return state;
      if (found.section.id !== action.sectionId) return state;
      return { ...state, clipboard: { type: "block", data: found.block } };
    }

    case "PASTE_BLOCK": {
      if (!state.clipboard || state.clipboard.type !== "block") return state;
      const cloned = cloneBlock(state.clipboard.data as BlockInstance);
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        if (action.columnId) {
          return {
            ...s,
            blocks: s.blocks.map((b: BlockInstance) => {
              if (b.id !== action.columnId) return b;
              if (action.parentBlockId) {
                return {
                  ...b,
                  blocks: (b.blocks ?? []).map((pb: BlockInstance) => {
                    if (pb.id !== action.parentBlockId) return pb;
                    return { ...pb, blocks: [...(pb.blocks ?? []), cloned] };
                  }),
                };
              }
              return { ...b, blocks: [...(b.blocks ?? []), cloned] };
            }),
          };
        }
        return { ...s, blocks: [...s.blocks, cloned] };
      });
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: cloned.id,
      };
    }

    case "DUPLICATE_SECTION": {
      const sectionIndex = state.sections.findIndex((s: SectionInstance) => s.id === action.sectionId);
      const original = state.sections[sectionIndex];
      if (sectionIndex === -1 || !original) return state;
      const cloned = cloneSection(original);
      const newSections = [...state.sections];
      newSections.splice(sectionIndex + 1, 0, cloned);
      return {
        ...state,
        sections: newSections,
        selectedNodeId: cloned.id,
      };
    }

    case "INSERT_TEMPLATE_SECTION": {
      const cloned = cloneSection(action.section);
      return {
        ...state,
        sections: [...state.sections, cloned],
        selectedNodeId: cloned.id,
      };
    }

    case "SET_PAGE_THEME": {
      if (!state.currentPage) return state;
      return {
        ...state,
        currentPage: {
          ...state.currentPage,
          themeId: action.themeId ?? undefined,
        },
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// History wrapper (undo/redo)
// ---------------------------------------------------------------------------

const HISTORY_LIMIT = 50;

const HISTORY_IGNORED_ACTIONS = new Set<PageBuilderAction["type"]>([
  "SET_PAGES",
  "CLEAR_CURRENT_PAGE",
  "SELECT_NODE",
  "TOGGLE_LEFT_PANEL",
  "TOGGLE_RIGHT_PANEL",
  "COPY_SECTION",
  "COPY_BLOCK",
  "UPDATE_PAGE_SLUGS",
  "TOGGLE_INSPECTOR",
  "UPDATE_INSPECTOR_SETTINGS",
  "SET_PREVIEW_MODE",
]);

function makeSnapshot(state: PageBuilderState): PageBuilderSnapshot {
  return {
    currentPage: state.currentPage,
    sections: state.sections,
  };
}

export function pageBuilderReducer(state: PageBuilderState, action: PageBuilderAction): PageBuilderState {
  if (action.type === "UNDO") {
    if (state.history.past.length === 0) return state;
    const previous = state.history.past[state.history.past.length - 1];
    const past = state.history.past.slice(0, -1);
    const future = [makeSnapshot(state), ...state.history.future];
    return {
      ...state,
      currentPage: previous.currentPage,
      sections: previous.sections,
      selectedNodeId: null,
      history: { past, future },
    };
  }

  if (action.type === "REDO") {
    if (state.history.future.length === 0) return state;
    const next = state.history.future[0];
    const future = state.history.future.slice(1);
    const past = [...state.history.past, makeSnapshot(state)].slice(-HISTORY_LIMIT);
    return {
      ...state,
      currentPage: next.currentPage,
      sections: next.sections,
      selectedNodeId: null,
      history: { past, future },
    };
  }

  const nextState = basePageBuilderReducer(state, action);

  if (nextState === state) return state;

  if (action.type === "SET_CURRENT_PAGE") {
    return {
      ...nextState,
      history: { past: [], future: [] },
    };
  }

  if (HISTORY_IGNORED_ACTIONS.has(action.type)) {
    return {
      ...nextState,
      history: state.history,
    };
  }

  const past = [...state.history.past, makeSnapshot(state)].slice(-HISTORY_LIMIT);
  return {
    ...nextState,
    history: { past, future: [] },
  };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const initialState: PageBuilderState = {
  pages: [],
  currentPage: null,
  sections: [],
  selectedNodeId: null,
  inspectorEnabled: false,
  inspectorSettings: DEFAULT_INSPECTOR_SETTINGS,
  previewMode: "desktop",
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  clipboard: null,
  history: { past: [], future: [] },
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
