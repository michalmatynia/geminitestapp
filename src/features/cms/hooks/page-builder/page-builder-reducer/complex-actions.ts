'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
 
 
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  findSection,
  findBlock,
  cloneBlock,
  cloneSection,
  removeColumnFromRows,
  updateSectionNestedBlocks,
} from '../block-helpers';
import type {
  PageBuilderState,
  PageBuilderAction,
  SectionInstance,
  BlockInstance,
} from '../../../types/page-builder';

export function reduceComplexActions(
  state: PageBuilderState,
  action: PageBuilderAction
): PageBuilderState | null {
  switch (action.type) {
    case 'DUPLICATE_SECTION': {
      const section = state.sections.find((s: SectionInstance) => s.id === (action as any).sectionId);
      if (!section) return state;
      const idx = state.sections.indexOf(section);
      const newSection = cloneSection(section);
      const newSections = [...state.sections];
      newSections.splice(idx + 1, 0, newSection);
      return { ...state, sections: newSections, selectedNodeId: newSection.id };
    }

    case 'DUPLICATE_BLOCK': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== (action as any).sectionId) return s;
        const block = s.blocks.find((b: BlockInstance) => b.id === (action as any).blockId);
        if (!block) return s;
        const idx = s.blocks.indexOf(block);
        const newBlock = cloneBlock(block);
        const newBlocks = [...s.blocks];
        newBlocks.splice(idx + 1, 0, newBlock);
        return { ...s, blocks: newBlocks };
      });
      return { ...state, sections: updatedSections };
    }

    case 'REMOVE_COLUMN': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== (action as any).sectionId || s.type !== 'Grid') return s;
        const nextBlocks = removeColumnFromRows(s.blocks, (action as any).columnIndex);
        const colCount = (s.settings['columns'] as number) ?? 1;
        return {
          ...s,
          blocks: nextBlocks,
          settings: { ...s.settings, columns: Math.max(1, colCount - 1) },
        };
      });
      return { ...state, sections: updatedSections };
    }

    case 'UPDATE_NESTED_BLOCK_SETTINGS': {
      const section = findSection(state.sections, (action as any).sectionId);
      if (!section) return state;
      const block = findBlock(section.blocks, (action as any).blockId);
      if (!block) return state;

      const nextBlocks = updateSectionNestedBlocks(section.blocks, (action as any).blockId, {
        settings: { ...block.settings, ...(action as any).settings },
      });
      const updatedSections = state.sections.map((s: SectionInstance) =>
        s.id === (action as any).sectionId ? { ...s, blocks: nextBlocks } : s
      );
      return { ...state, sections: updatedSections };
    }

    case 'ADD_NESTED_BLOCK': {
      const section = findSection(state.sections, (action as any).sectionId);
      if (!section) return state;
      const parent = findBlock(section.blocks, (action as any).parentId);
      if (!parent) return state;

      const nextBlocks = updateSectionNestedBlocks(section.blocks, (action as any).parentId, {
        blocks: [...(parent.blocks ?? []), (action as any).block],
      });
      const updatedSections = state.sections.map((s: SectionInstance) =>
        s.id === (action as any).sectionId ? { ...s, blocks: nextBlocks } : s
      );
      return { ...state, sections: updatedSections, selectedNodeId: (action as any).block.id };
    }

    case 'REMOVE_NESTED_BLOCK': {
      const section = findSection(state.sections, (action as any).sectionId);
      if (!section) return state;

      const nextBlocks = updateSectionNestedBlocks(
        section.blocks,
        (action as any).parentId,
        (parent: BlockInstance) => ({
          blocks: (parent.blocks ?? []).filter((b: BlockInstance) => b.id !== (action as any).blockId),
        })
      );
      const updatedSections = state.sections.map((s: SectionInstance) =>
        s.id === (action as any).sectionId ? { ...s, blocks: nextBlocks } : s
      );
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: state.selectedNodeId === (action as any).blockId ? null : state.selectedNodeId,
      };
    }

    default:
      return null;
  }
}
