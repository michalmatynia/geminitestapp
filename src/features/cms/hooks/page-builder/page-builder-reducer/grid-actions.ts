'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
 
/* eslint-disable @typescript-eslint/no-unsafe-argument */
 
 
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  createColumnBlock,
  createRowBlock,
  splitGridBlocks,
  ensureGridRows,
  updateColumnBlocks,
  updateRowBlocks,
} from '../block-helpers';
import type {
  PageBuilderState,
  PageBuilderAction,
  SectionInstance,
  BlockInstance,
} from '../../../types/page-builder';

export function reduceGridActions(
  state: PageBuilderState,
  action: PageBuilderAction
): PageBuilderState | null {
  switch (action.type) {
    case 'SET_GRID_COLUMNS': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== (action as any).sectionId || s.type !== 'Grid') return s;
        const normalized = ensureGridRows(s);
        const { rows, extras } = splitGridBlocks(normalized.blocks);
        const targetCols = Math.max(1, (action as any).columnCount);
        const nextRows = rows.map((row: BlockInstance) => {
          const cols = (row.blocks ?? []).filter((b: BlockInstance) => b.type === 'Column');
          if (cols.length < targetCols) {
            const newCols = Array.from({ length: targetCols - cols.length }, () =>
              createColumnBlock()
            );
            return { ...row, blocks: [...cols, ...newCols] };
          }
          return { ...row, blocks: cols.slice(0, targetCols) };
        });
        return {
          ...normalized,
          blocks: [...nextRows, ...extras],
          settings: { ...normalized.settings, columns: targetCols, rows: nextRows.length },
        };
      });
      return { ...state, sections: updatedSections };
    }

    case 'SET_GRID_ROWS': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== (action as any).sectionId || s.type !== 'Grid') return s;
        const normalized = ensureGridRows(s);
        const { rows, extras } = splitGridBlocks(normalized.blocks);
        const columnsPerRow =
          (normalized.settings['columns'] as number) ??
          Math.max(
            1,
            (rows[0]?.blocks ?? []).filter((b: BlockInstance) => b.type === 'Column').length || 1
          );
        const targetRows = Math.max(1, (action as any).rowCount);
        if (rows.length < targetRows) {
          const newRows = Array.from({ length: targetRows - rows.length }, () =>
            createRowBlock(columnsPerRow)
          );
          return {
            ...normalized,
            blocks: [...rows, ...newRows, ...extras],
            settings: { ...normalized.settings, rows: targetRows, columns: columnsPerRow },
          };
        }
        const nextRows = rows.slice(0, targetRows);
        return {
          ...normalized,
          blocks: [...nextRows, ...extras],
          settings: { ...normalized.settings, rows: targetRows, columns: columnsPerRow },
        };
      });
      return { ...state, sections: updatedSections };
    }

    case 'ADD_GRID_ROW': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== (action as any).sectionId || s.type !== 'Grid') return s;
        const normalized = ensureGridRows(s);
        const { rows, extras } = splitGridBlocks(normalized.blocks);
        const columnsPerRow =
          (normalized.settings['columns'] as number) ??
          Math.max(
            1,
            (rows[0]?.blocks ?? []).filter((b: BlockInstance) => b.type === 'Column').length || 1
          );
        const nextRows = [...rows, createRowBlock(columnsPerRow)];
        return {
          ...normalized,
          blocks: [...nextRows, ...extras],
          settings: { ...normalized.settings, rows: nextRows.length, columns: columnsPerRow },
        };
      });
      return { ...state, sections: updatedSections };
    }

    case 'UPDATE_GRID_BLOCKS': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== (action as any).sectionId || s.type !== 'Grid') return s;
        const nextRows = updateRowBlocks(s.blocks, (action as any).rows);
        const nextCols = updateColumnBlocks(nextRows, (action as any).columns);
        return {
          ...s,
          blocks: nextCols,
          settings: { ...s.settings, rows: (action as any).rows, columns: (action as any).columns },
        };
      });
      return { ...state, sections: updatedSections };
    }

    default:
      return null;
  }
}
