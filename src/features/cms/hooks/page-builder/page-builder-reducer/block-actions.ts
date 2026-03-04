import {
  applyTextAtomSettings,
  createBlockInstance,
  createRowBlock,
  splitGridBlocks,
  ensureGridRows,
} from '../block-helpers';
import type {
  PageBuilderState,
  PageBuilderAction,
  SectionInstance,
  BlockInstance,
} from '../../../types/page-builder';

export function reduceBlockActions(
  state: PageBuilderState,
  action: PageBuilderAction
): PageBuilderState | null {
  switch (action.type) {
    case 'ADD_BLOCK': {
      if (action.blockType === 'Row') {
        const updatedSections = state.sections.map((s: SectionInstance) => {
          if (s.id !== action.sectionId) return s;
          if (s.type !== 'Grid') return s;
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
      const newBlock = createBlockInstance(action.blockType);
      if (!newBlock) return state;
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        const blockToInsert =
          s.type === 'Grid' && newBlock.type === 'ImageElement'
            ? {
              ...newBlock,
              settings: {
                ...newBlock.settings,
                backgroundTarget: 'grid',
              },
            }
            : newBlock;
        return { ...s, blocks: [...s.blocks, blockToInsert] };
      });
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: newBlock.id,
      };
    }

    case 'REMOVE_BLOCK': {
      const updatedSections = state.sections.map((s: SectionInstance) =>
        s.id === action.sectionId
          ? {
            ...s,
            blocks: s.blocks.filter((b: BlockInstance) => b.id !== action.blockId),
          }
          : s
      );
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: state.selectedNodeId === action.blockId ? null : state.selectedNodeId,
      };
    }

    case 'UPDATE_BLOCK_SETTINGS': {
      const updatedSections = state.sections.map((s: SectionInstance) =>
        s.id === action.sectionId
          ? {
            ...s,
            blocks: s.blocks.map((b: BlockInstance) =>
              b.id === action.blockId
                ? applyTextAtomSettings(b, { ...b.settings, ...action.settings })
                : b
            ),
          }
          : s
      );
      return { ...state, sections: updatedSections };
    }

    case 'MOVE_BLOCK': {
      let movedBlock: BlockInstance | null = null;
      const sectionsAfterRemove = state.sections.map((s: SectionInstance) => {
        if (s.id === action.fromSectionId) {
          const block = s.blocks.find((b: BlockInstance) => b.id === action.blockId);
          if (block) movedBlock = block;
          return {
            ...s,
            blocks: s.blocks.filter((b: BlockInstance) => b.id !== action.blockId),
          };
        }
        return s;
      });
      if (!movedBlock) return state;
      const movedBlockValue = movedBlock;
      const sectionsAfterInsert = sectionsAfterRemove.map((s: SectionInstance) => {
        if (s.id === action.toSectionId) {
          const newBlocks = [...s.blocks];
          newBlocks.splice(action.toIndex, 0, movedBlockValue);
          return { ...s, blocks: newBlocks };
        }
        return s;
      });
      return { ...state, sections: sectionsAfterInsert };
    }

    case 'REORDER_BLOCKS': {
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

    default:
      return null;
  }
}
