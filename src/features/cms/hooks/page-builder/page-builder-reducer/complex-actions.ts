import type {
  PageBuilderState,
  PageBuilderAction,
  SectionInstance,
  BlockInstance,
} from '@/features/cms/types/page-builder';

import {
  uid,
  findSection,
  findBlock,
  createBlockInstance,
  removeColumnFromRows,
  updateSectionNestedBlocks,
} from '../block-helpers';
import {
  buildHierarchyIndexes,
  cloneSectionSubtree,
  moveSectionSubtree,
} from '../section-hierarchy';

export function reduceComplexActions(
  state: PageBuilderState,
  action: PageBuilderAction
): PageBuilderState | null {
  switch (action.type) {
    case 'DUPLICATE_SECTION': {
      const section = state.sections.find((s: SectionInstance) => s.id === action.sectionId);
      if (!section) return state;
      const duplicates = cloneSectionSubtree(state.sections, section.id, uid);
      if (duplicates.length === 0) return state;
      const duplicatedRoot = duplicates[0];
      if (!duplicatedRoot) return state;

      const hierarchy = buildHierarchyIndexes(state.sections);
      const siblings = section.parentSectionId
        ? (hierarchy.childrenByParent.get(section.parentSectionId) ?? [])
        : (hierarchy.childrenByParent.get(null) ?? []).filter((id: string) => {
          const node = hierarchy.nodeById.get(id);
          return node?.zone === section.zone;
        });
      const sourceIndex = siblings.indexOf(section.id);
      const targetIndex = sourceIndex >= 0 ? sourceIndex + 1 : siblings.length;

      const sectionsWithDuplicate = [...state.sections, ...duplicates];
      const moveResult = moveSectionSubtree(sectionsWithDuplicate, {
        sectionId: duplicatedRoot.id,
        toZone: section.zone,
        toParentSectionId: section.parentSectionId ?? null,
        toIndex: targetIndex,
      });

      return {
        ...state,
        sections: moveResult.ok ? moveResult.sections : sectionsWithDuplicate,
        selectedNodeId: duplicatedRoot.id,
      };
    }

    case 'REMOVE_COLUMN_FROM_ROW': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId || s.type !== 'Grid') return s;
        const result = removeColumnFromRows(s.blocks, action.columnId, action.rowId);
        if (!result.removed) return s;
        const rows = result.blocks.filter((block: BlockInstance) => block.type === 'Row');
        const nextColumnCount = Math.max(
          1,
          ...rows.map(
            (row: BlockInstance) =>
              (row.blocks ?? []).filter((block: BlockInstance) => block.type === 'Column').length
          )
        );
        return {
          ...s,
          blocks: result.blocks,
          settings: { ...s.settings, columns: nextColumnCount },
        };
      });
      return { ...state, sections: updatedSections };
    }

    case 'UPDATE_NESTED_BLOCK_SETTINGS': {
      const section = findSection(state.sections, action.sectionId);
      if (!section) return state;
      const located = findBlock([section], action.blockId);
      if (!located) return state;

      const nextBlocks = updateSectionNestedBlocks(
        section.blocks,
        action.blockId,
        (current: BlockInstance) => ({
          ...current,
          settings: { ...located.block.settings, ...action.settings },
        })
      );
      const updatedSections = state.sections.map((s: SectionInstance) =>
        s.id === action.sectionId ? { ...s, blocks: nextBlocks } : s
      );
      return { ...state, sections: updatedSections };
    }

    case 'ADD_ELEMENT_TO_NESTED_BLOCK': {
      const section = findSection(state.sections, action.sectionId);
      if (!section) return state;
      if (!findBlock([section], action.parentBlockId)) return state;
      const newBlock = createBlockInstance(action.elementType);
      if (!newBlock) return state;

      const nextBlocks = updateSectionNestedBlocks(
        section.blocks,
        action.parentBlockId,
        (block: BlockInstance) => ({
          ...block,
          blocks: [...(block.blocks ?? []), newBlock],
        })
      );
      const updatedSections = state.sections.map((s: SectionInstance) =>
        s.id === action.sectionId ? { ...s, blocks: nextBlocks } : s
      );
      return { ...state, sections: updatedSections, selectedNodeId: newBlock.id };
    }

    case 'REMOVE_ELEMENT_FROM_NESTED_BLOCK': {
      const section = findSection(state.sections, action.sectionId);
      if (!section) return state;

      const nextBlocks = updateSectionNestedBlocks(
        section.blocks,
        action.parentBlockId,
        (parent: BlockInstance) => ({
          ...parent,
          blocks: (parent.blocks ?? []).filter((b: BlockInstance) => b.id !== action.elementId),
        })
      );
      const updatedSections = state.sections.map((s: SectionInstance) =>
        s.id === action.sectionId ? { ...s, blocks: nextBlocks } : s
      );
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: state.selectedNodeId === action.elementId ? null : state.selectedNodeId,
      };
    }

    case 'ADD_ELEMENT_TO_SECTION_BLOCK': {
      const section = findSection(state.sections, action.sectionId);
      if (!section) return state;
      if (!findBlock([section], action.parentBlockId)) return state;
      const newBlock = createBlockInstance(action.elementType);
      if (!newBlock) return state;

      const nextBlocks = updateSectionNestedBlocks(
        section.blocks,
        action.parentBlockId,
        (block: BlockInstance) => ({
          ...block,
          blocks: [...(block.blocks ?? []), newBlock],
        })
      );
      const updatedSections = state.sections.map((s: SectionInstance) =>
        s.id === action.sectionId ? { ...s, blocks: nextBlocks } : s
      );
      return { ...state, sections: updatedSections, selectedNodeId: newBlock.id };
    }

    case 'REMOVE_ELEMENT_FROM_SECTION_BLOCK': {
      const section = findSection(state.sections, action.sectionId);
      if (!section) return state;

      const nextBlocks = updateSectionNestedBlocks(
        section.blocks,
        action.parentBlockId,
        (parent: BlockInstance) => ({
          ...parent,
          blocks: (parent.blocks ?? []).filter((b: BlockInstance) => b.id !== action.elementId),
        })
      );
      const updatedSections = state.sections.map((s: SectionInstance) =>
        s.id === action.sectionId ? { ...s, blocks: nextBlocks } : s
      );
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: state.selectedNodeId === action.elementId ? null : state.selectedNodeId,
      };
    }

    default:
      return null;
  }
}
