import {
  uid,
  normalizeTextAtomText,
  buildTextAtomLetterBlocks,
  removeBlockFromColumnBlocks,
  insertBlockIntoColumnBlocks,
  findBlock,
  TEXT_ATOM_BLOCK_TYPE,
} from './block-helpers';
import { moveSectionSubtree } from './section-hierarchy';
import { getBlockDefinition } from '../../components/page-builder/section-registry';

import type {
  PageBuilderAction,
  PageBuilderState,
  BlockInstance,
  SectionInstance,
} from '../../types/page-builder';

export function reducePageBuilderMoveActions(
  state: PageBuilderState,
  action: PageBuilderAction
): PageBuilderState | null {
  const hasChildSections = (sectionId: string): boolean =>
    state.sections.some((section: SectionInstance) => section.parentSectionId === sectionId);

  switch (action.type) {
    case 'MOVE_BLOCK_TO_COLUMN': {
      // Remove block from source (section direct, column, row, or nested inside a parent block)
      const removeFromSource = (
        sections: SectionInstance[],
        fromSectionId: string,
        fromColumnId?: string,
        fromParentBlockId?: string,
        _fromRowId?: string
      ): { sections: SectionInstance[]; moved: BlockInstance | null } => {
        let moved: BlockInstance | null = null;
        const nextSections = sections.map((s: SectionInstance) => {
          if (s.id !== fromSectionId) return s;
          if (fromColumnId) {
            const result = removeBlockFromColumnBlocks(
              s.blocks,
              fromColumnId,
              action.blockId,
              fromParentBlockId
            );
            if (result.moved) moved = result.moved;
            return { ...s, blocks: result.blocks };
          }
          // Remove from section's direct blocks (could be from a row)
          const removeFromBlocks = (blocks: BlockInstance[]): BlockInstance[] => {
            return blocks.reduce<BlockInstance[]>((next: BlockInstance[], b: BlockInstance) => {
              if (b.id === action.blockId) {
                moved = b;
                return next;
              }
              if (b.type === 'Row' && b.blocks) {
                const idx = b.blocks.findIndex((rb: BlockInstance) => rb.id === action.blockId);
                if (idx !== -1) {
                  const foundBlock = b.blocks[idx];
                  if (foundBlock) moved = foundBlock;
                  next.push({
                    ...b,
                    blocks: b.blocks.filter((rb: BlockInstance) => rb.id !== action.blockId),
                  });
                  return next;
                }
              }
              if (b.blocks) {
                next.push({ ...b, blocks: removeFromBlocks(b.blocks) });
                return next;
              }
              next.push(b);
              return next;
            }, []);
          };
          return { ...s, blocks: removeFromBlocks(s.blocks) };
        });
        return { sections: nextSections, moved };
      };

      let removal = removeFromSource(
        state.sections,
        action.fromSectionId,
        action.fromColumnId,
        action.fromParentBlockId
      );
      if (!removal.moved) {
        const found = findBlock(state.sections, action.blockId);
        if (!found) return state;
        removal = removeFromSource(
          state.sections,
          found.section.id,
          found.parentColumn?.id,
          found.parentBlock?.id,
          found.parentRow?.id
        );
      }
      if (!removal.moved) return state;
      // Insert into target (column direct or inside a parent block in a column)
      const sectionsAfterInsert = removal.sections.map((s: SectionInstance) => {
        if (s.id !== action.toSectionId) return s;
        return {
          ...s,
          blocks: insertBlockIntoColumnBlocks(
            s.blocks,
            action.toColumnId,
            removal.moved!,
            action.toIndex,
            action.toParentBlockId
          ),
        };
      });
      return { ...state, sections: sectionsAfterInsert };
    }

    case 'MOVE_BLOCK_TO_ROW': {
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
            const result = removeBlockFromColumnBlocks(
              s.blocks,
              fromColumnId,
              action.blockId,
              fromParentBlockId
            );
            if (result.moved) moved = result.moved;
            return { ...s, blocks: result.blocks };
          }
          // Remove from section's direct blocks (could be from a row)
          const removeFromBlocks = (blocks: BlockInstance[]): BlockInstance[] => {
            return blocks.reduce<BlockInstance[]>((next: BlockInstance[], b: BlockInstance) => {
              if (b.id === action.blockId) {
                moved = b;
                return next;
              }
              if (b.type === 'Row' && b.blocks) {
                const idx = b.blocks.findIndex((rb: BlockInstance) => rb.id === action.blockId);
                if (idx !== -1) {
                  const foundBlock = b.blocks[idx];
                  if (foundBlock) moved = foundBlock;
                  next.push({
                    ...b,
                    blocks: b.blocks.filter((rb: BlockInstance) => rb.id !== action.blockId),
                  });
                  return next;
                }
              }
              if (b.blocks) {
                next.push({ ...b, blocks: removeFromBlocks(b.blocks) });
                return next;
              }
              next.push(b);
              return next;
            }, []);
          };
          return { ...s, blocks: removeFromBlocks(s.blocks) };
        });
        return { sections: nextSections, moved };
      };

      let removal = removeFromSource(
        state.sections,
        action.fromSectionId,
        action.fromColumnId,
        action.fromParentBlockId
      );
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

      // Insert into target row
      const sectionsAfterInsert = removal.sections.map((s: SectionInstance) => {
        if (s.id !== action.toSectionId) return s;
        const insertIntoRow = (blocks: BlockInstance[]): BlockInstance[] => {
          return blocks.map((b: BlockInstance) => {
            if (b.id === action.toRowId && b.type === 'Row') {
              const nextBlocks = [...(b.blocks ?? [])];
              nextBlocks.splice(action.toIndex, 0, removal.moved!);
              return { ...b, blocks: nextBlocks };
            }
            if (b.blocks) {
              return { ...b, blocks: insertIntoRow(b.blocks) };
            }
            return b;
          });
        };
        return { ...s, blocks: insertIntoRow(s.blocks) };
      });
      return { ...state, sections: sectionsAfterInsert };
    }

    case 'MOVE_BLOCK_TO_SECTION': {
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
            const result = removeBlockFromColumnBlocks(
              s.blocks,
              fromColumnId,
              action.blockId,
              fromParentBlockId
            );
            if (result.moved) moved = result.moved;
            return { ...s, blocks: result.blocks };
          }
          // Remove from section's direct blocks (could be from a row)
          const removeFromBlocks = (blocks: BlockInstance[]): BlockInstance[] => {
            return blocks.reduce<BlockInstance[]>((next: BlockInstance[], b: BlockInstance) => {
              if (b.id === action.blockId) {
                moved = b;
                return next;
              }
              if (b.type === 'Row' && b.blocks) {
                const idx = b.blocks.findIndex((rb: BlockInstance) => rb.id === action.blockId);
                if (idx !== -1) {
                  const foundBlock = b.blocks[idx];
                  if (foundBlock) moved = foundBlock;
                  next.push({
                    ...b,
                    blocks: b.blocks.filter((rb: BlockInstance) => rb.id !== action.blockId),
                  });
                  return next;
                }
              }
              if (b.blocks) {
                next.push({ ...b, blocks: removeFromBlocks(b.blocks) });
                return next;
              }
              next.push(b);
              return next;
            }, []);
          };
          return { ...s, blocks: removeFromBlocks(s.blocks) };
        });
        return { sections: nextSections, moved };
      };

      let removal = removeFromSource(
        state.sections,
        action.fromSectionId,
        action.fromColumnId,
        action.fromParentBlockId
      );
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
      const sectionsAfterInsert = removal.sections.map((s: SectionInstance) => {
        if (s.id !== action.toSectionId) return s;
        const nextBlocks = [...s.blocks];
        nextBlocks.splice(action.toIndex, 0, removal.moved!);
        return { ...s, blocks: nextBlocks };
      });
      return { ...state, sections: sectionsAfterInsert };
    }

    case 'MOVE_BLOCK_TO_SLIDESHOW_FRAME': {
      // Remove block from source (similar to MOVE_BLOCK_TO_SECTION)
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
            const result = removeBlockFromColumnBlocks(
              s.blocks,
              fromColumnId,
              action.blockId,
              fromParentBlockId
            );
            if (result.moved) moved = result.moved;
            return { ...s, blocks: result.blocks };
          }
          // Remove from section's direct blocks (including from SlideshowFrames)
          const removeFromBlocks = (blocks: BlockInstance[]): BlockInstance[] => {
            return blocks.reduce<BlockInstance[]>((next: BlockInstance[], b: BlockInstance) => {
              if (b.id === action.blockId) {
                moved = b;
                return next;
              }
              if (b.blocks) {
                const idx = b.blocks.findIndex((rb: BlockInstance) => rb.id === action.blockId);
                if (idx !== -1) {
                  const foundBlock = b.blocks[idx];
                  if (foundBlock) moved = foundBlock;
                  next.push({
                    ...b,
                    blocks: b.blocks.filter((rb: BlockInstance) => rb.id !== action.blockId),
                  });
                  return next;
                }
                next.push({ ...b, blocks: removeFromBlocks(b.blocks) });
                return next;
              }
              next.push(b);
              return next;
            }, []);
          };
          return { ...s, blocks: removeFromBlocks(s.blocks) };
        });
        return { sections: nextSections, moved };
      };

      let removal = removeFromSource(
        state.sections,
        action.fromSectionId,
        action.fromColumnId,
        action.fromParentBlockId
      );
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

      // Insert into target SlideshowFrame
      const sectionsAfterInsert = removal.sections.map((s: SectionInstance) => {
        if (s.id !== action.toSectionId) return s;
        return {
          ...s,
          blocks: s.blocks.map((b: BlockInstance) => {
            if (b.id !== action.toFrameId) return b;
            const frameBlocks = [...(b.blocks ?? [])];
            frameBlocks.splice(action.toIndex, 0, removal.moved!);
            return { ...b, blocks: frameBlocks };
          }),
        };
      });
      return { ...state, sections: sectionsAfterInsert };
    }

    case 'MOVE_SECTION_TO_SLIDESHOW_FRAME': {
      const CONVERTIBLE_TYPES = [
        'ImageWithText',
        'RichText',
        'Hero',
        'Block',
        'TextElement',
        'ImageElement',
        'TextAtom',
        'ButtonElement',
        'Model3DElement',
        'Slideshow',
      ];
      const sourceSection = state.sections.find((s: SectionInstance) => s.id === action.sectionId);
      if (!sourceSection) return state;
      if (!CONVERTIBLE_TYPES.includes(sourceSection.type)) return state;
      if (hasChildSections(action.sectionId)) return state;
      // Prevent dropping into its own frames
      if (action.sectionId === action.toSectionId) return state;

      const resolvedBlockType =
        sourceSection.type === 'ButtonElement' ? 'Button' : sourceSection.type;
      const convertedBlock: BlockInstance = {
        id: uid(),
        type: resolvedBlockType,
        settings: { ...sourceSection.settings },
        blocks: sourceSection.blocks.length > 0 ? [...sourceSection.blocks] : [],
      };

      // Remove section from sections array
      const remaining = state.sections.filter((s: SectionInstance) => s.id !== action.sectionId);

      // Insert the converted block into the target SlideshowFrame
      const updatedSections = remaining.map((s: SectionInstance) => {
        if (s.id !== action.toSectionId) return s;
        return {
          ...s,
          blocks: s.blocks.map((b: BlockInstance) => {
            if (b.id !== action.toFrameId) return b;
            const frameBlocks = [...(b.blocks ?? [])];
            frameBlocks.splice(action.toIndex, 0, convertedBlock);
            return { ...b, blocks: frameBlocks };
          }),
        };
      });

      return { ...state, sections: updatedSections, selectedNodeId: convertedBlock.id };
    }

    case 'CONVERT_BLOCK_TO_SECTION': {
      const located = findBlock(state.sections, action.blockId);
      if (!located) return state;
      const blockTypeToSectionType: Record<string, string> = {
        TextElement: 'TextElement',
        TextAtom: 'TextAtom',
        ImageElement: 'ImageElement',
        Button: 'ButtonElement',
        Block: 'Block',
        Model3DElement: 'Model3DElement',
        Slideshow: 'Slideshow',
      };
      const sectionType = blockTypeToSectionType[located.block.type];
      if (!sectionType) return state;

      let didRemove = false;
      const sectionsAfterRemove = state.sections.map((s: SectionInstance) => {
        if (s.id !== located.section.id) return s;
        if (located.parentColumn) {
          const result = removeBlockFromColumnBlocks(
            s.blocks,
            located.parentColumn.id,
            action.blockId,
            located.parentBlock?.id
          );
          if (result.moved) didRemove = true;
          return { ...s, blocks: result.blocks };
        }
        // Handle blocks inside a Row (but not in a Column)
        if (located.parentRow) {
          const updatedBlocks = s.blocks.map((block: BlockInstance) => {
            if (block.id !== located.parentRow!.id) return block;
            const hasBlockInRow = (block.blocks ?? []).some(
              (b: BlockInstance) => b.id === action.blockId
            );
            if (hasBlockInRow) didRemove = true;
            return {
              ...block,
              blocks: (block.blocks ?? []).filter((b: BlockInstance) => b.id !== action.blockId),
            };
          });
          return { ...s, blocks: updatedBlocks };
        }
        // Handle blocks inside a parent block (e.g., SlideshowFrame, Carousel, etc.)
        if (located.parentBlock) {
          const updatedBlocks = s.blocks.map((block: BlockInstance) => {
            if (block.id !== located.parentBlock!.id) return block;
            const hasBlockInParent = (block.blocks ?? []).some(
              (b: BlockInstance) => b.id === action.blockId
            );
            if (hasBlockInParent) didRemove = true;
            return {
              ...block,
              blocks: (block.blocks ?? []).filter((b: BlockInstance) => b.id !== action.blockId),
            };
          });
          return { ...s, blocks: updatedBlocks };
        }
        const hasBlock = s.blocks.some((b: BlockInstance) => b.id === action.blockId);
        if (hasBlock) didRemove = true;
        return { ...s, blocks: s.blocks.filter((b: BlockInstance) => b.id !== action.blockId) };
      });

      if (!didRemove) return state;

      const baseSettings = { ...(located.block.settings ?? {}) };
      const resolvedBlocks =
        located.block.type === TEXT_ATOM_BLOCK_TYPE
          ? buildTextAtomLetterBlocks(
            normalizeTextAtomText(baseSettings['text']),
            located.block.blocks
          )
          : located.block.blocks
            ? [...located.block.blocks]
            : [];
      const newSection: SectionInstance = {
        id: uid(),
        type: sectionType,
        zone: action.toZone,
        parentSectionId: null,
        settings: baseSettings,
        blocks: resolvedBlocks,
      };
      const sectionsWithNew = [...sectionsAfterRemove, newSection];
      const moveResult = moveSectionSubtree(sectionsWithNew, {
        sectionId: newSection.id,
        toZone: action.toZone,
        toParentSectionId: null,
        toIndex: action.toIndex,
      });
      if (!moveResult.ok)
        return { ...state, sections: sectionsWithNew, selectedNodeId: newSection.id };
      return { ...state, sections: moveResult.sections, selectedNodeId: newSection.id };
    }

    case 'CONVERT_SECTION_TO_BLOCK': {
      if (action.sectionId === action.toSectionId) return state;
      const sourceSection = state.sections.find((s: SectionInstance) => s.id === action.sectionId);
      if (!sourceSection) return state;
      if (hasChildSections(action.sectionId)) return state;
      if (
        sourceSection.type !== 'TextElement' &&
        sourceSection.type !== 'ImageElement' &&
        sourceSection.type !== 'ButtonElement' &&
        sourceSection.type !== TEXT_ATOM_BLOCK_TYPE
      )
        return state;
      const targetSection = state.sections.find(
        (s: SectionInstance) => s.id === action.toSectionId
      );
      if (!targetSection) return state;

      const resolvedBlockType =
        sourceSection.type === 'ButtonElement' ? 'Button' : sourceSection.type;
      const blockDef = getBlockDefinition(resolvedBlockType);
      const baseSettings = {
        ...(blockDef?.defaultSettings ?? {}),
        ...sourceSection.settings,
      };
      const textAtomBlocks =
        sourceSection.type === TEXT_ATOM_BLOCK_TYPE
          ? buildTextAtomLetterBlocks(
            normalizeTextAtomText(baseSettings['text']),
            sourceSection.blocks
          )
          : undefined;
      const convertedBlock: BlockInstance = {
        id: uid(),
        type: resolvedBlockType,
        settings: baseSettings,
        ...(textAtomBlocks ? { blocks: textAtomBlocks } : {}),
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

    case 'MOVE_SECTION_TO_COLUMN': {
      const CONVERTIBLE_TYPES = [
        'ImageWithText',
        'RichText',
        'Hero',
        'Block',
        'TextElement',
        'ImageElement',
        'TextAtom',
        'ButtonElement',
        'Model3DElement',
        'Slideshow',
      ];
      const sourceSection = state.sections.find((s: SectionInstance) => s.id === action.sectionId);
      if (!sourceSection) return state;
      if (!CONVERTIBLE_TYPES.includes(sourceSection.type)) return state;
      if (hasChildSections(action.sectionId)) return state;
      // Prevent dropping a Grid into its own columns
      if (action.sectionId === action.toSectionId) return state;

      const resolvedBlockType =
        sourceSection.type === 'ButtonElement' ? 'Button' : sourceSection.type;
      const convertedBlock: BlockInstance = {
        id: uid(),
        type: resolvedBlockType,
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
          blocks: insertBlockIntoColumnBlocks(
            s.blocks,
            action.toColumnId,
            convertedBlock,
            action.toIndex,
            action.toParentBlockId
          ),
        };
      });

      return { ...state, sections: updatedSections, selectedNodeId: convertedBlock.id };
    }

    case 'MOVE_SECTION_TO_ZONE': {
      const moveResult = moveSectionSubtree(state.sections, {
        sectionId: action.sectionId,
        toZone: action.toZone,
        toParentSectionId: null,
        toIndex: action.toIndex,
      });
      if (!moveResult.ok) return state;
      return { ...state, sections: moveResult.sections };
    }

    case 'MOVE_SECTION_IN_TREE': {
      const moveResult = moveSectionSubtree(state.sections, {
        sectionId: action.sectionId,
        toZone: action.toZone,
        toParentSectionId: action.toParentSectionId ?? null,
        toIndex: action.toIndex,
      });
      if (!moveResult.ok) return state;
      return { ...state, sections: moveResult.sections };
    }

    default:
      return null;
  }
}
