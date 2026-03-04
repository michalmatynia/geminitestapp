import {
  createColumnBlock,
  createRowBlock,
  getCanonicalGridStructure,
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
        if (s.id !== action.sectionId || s.type !== 'Grid') return s;
        const canonical = getCanonicalGridStructure(s);
        if (!canonical) return s;
        const { rows, extras } = canonical;
        const targetCols = Math.max(1, action.columnCount);
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
          ...s,
          blocks: [...nextRows, ...extras],
          settings: { ...s.settings, columns: targetCols, rows: nextRows.length },
        };
      });
      return { ...state, sections: updatedSections };
    }

    case 'SET_GRID_ROWS': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId || s.type !== 'Grid') return s;
        const canonical = getCanonicalGridStructure(s);
        if (!canonical) return s;
        const { rows, extras, columnsPerRow } = canonical;
        const targetRows = Math.max(1, action.rowCount);
        if (rows.length < targetRows) {
          const newRows = Array.from({ length: targetRows - rows.length }, () =>
            createRowBlock(columnsPerRow)
          );
          return {
            ...s,
            blocks: [...rows, ...newRows, ...extras],
            settings: { ...s.settings, rows: targetRows, columns: columnsPerRow },
          };
        }
        const nextRows = rows.slice(0, targetRows);
        return {
          ...s,
          blocks: [...nextRows, ...extras],
          settings: { ...s.settings, rows: targetRows, columns: columnsPerRow },
        };
      });
      return { ...state, sections: updatedSections };
    }

    case 'ADD_GRID_ROW': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId || s.type !== 'Grid') return s;
        const canonical = getCanonicalGridStructure(s);
        if (!canonical) return s;
        const { rows, extras, columnsPerRow } = canonical;
        const nextRows = [...rows, createRowBlock(columnsPerRow)];
        return {
          ...s,
          blocks: [...nextRows, ...extras],
          settings: { ...s.settings, rows: nextRows.length, columns: columnsPerRow },
        };
      });
      return { ...state, sections: updatedSections };
    }

    default:
      return null;
  }
}
