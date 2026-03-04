import {
  uid,
  normalizeTextAtomText,
  buildTextAtomLetterBlocks,
  applyTextAtomSettings,
  createRowBlock,
  TEXT_ATOM_BLOCK_TYPE,
} from '../block-helpers';
import { moveSectionSubtree, removeSectionSubtree } from '../section-hierarchy';
import {
  getSectionDefinition,
  getBlockDefinition,
} from '../../../components/page-builder/section-registry';
import type {
  PageBuilderState,
  PageBuilderAction,
  PageZone,
  SectionInstance,
  BlockInstance,
} from '../../../types/page-builder';

export function reduceSectionActions(
  state: PageBuilderState,
  action: PageBuilderAction
): PageBuilderState | null {
  switch (action.type) {
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.nodeId };

    case 'ADD_SECTION': {
      const sectionType = action.sectionType;
      const def = getSectionDefinition(sectionType);
      if (!def) return state;

      const settings = {
        ...def.defaultSettings,
        ...(action.initialSettings ?? {}),
      };
      let initialBlocks: BlockInstance[] = [];
      if (sectionType === 'Grid') {
        const rows = (settings['rows'] as number) ?? 1;
        const colCount = (settings['columns'] as number) ?? 2;
        initialBlocks = Array.from({ length: Math.max(1, rows) }, () => createRowBlock(colCount));
      } else if (sectionType === TEXT_ATOM_BLOCK_TYPE) {
        initialBlocks = buildTextAtomLetterBlocks(
          normalizeTextAtomText(settings['text']),
          undefined
        );
      } else if (sectionType === 'Slideshow') {
        const frameDef = getBlockDefinition('SlideshowFrame');
        if (frameDef) {
          initialBlocks = [
            {
              id: uid(),
              type: 'SlideshowFrame',
              settings: { ...frameDef.defaultSettings },
              blocks: [],
            },
          ];
        }
      }

      const newSection: SectionInstance = {
        id: uid(),
        type: sectionType,
        zone: action.zone,
        parentSectionId: null,
        settings,
        blocks: initialBlocks,
      };
      return {
        ...state,
        sections: [...state.sections, newSection],
        selectedNodeId: newSection.id,
      };
    }

    case 'REMOVE_SECTION': {
      const filtered = removeSectionSubtree(state.sections, action.sectionId);
      return {
        ...state,
        sections: filtered,
        selectedNodeId: state.selectedNodeId === action.sectionId ? null : state.selectedNodeId,
      };
    }

    case 'UPDATE_SECTION_SETTINGS': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        const nextSettings = { ...s.settings, ...action.settings };
        if (s.type === TEXT_ATOM_BLOCK_TYPE) {
          const updatedBlock = applyTextAtomSettings(
            {
              id: s.id,
              type: TEXT_ATOM_BLOCK_TYPE,
              settings: s.settings,
              blocks: s.blocks,
            },
            nextSettings
          );
          return { ...s, settings: updatedBlock.settings, blocks: updatedBlock.blocks ?? [] };
        }
        return { ...s, settings: nextSettings };
      });
      return { ...state, sections: updatedSections };
    }

    case 'REORDER_SECTIONS': {
      const zone: PageZone = action.zone;
      const rootSectionsInZone = state.sections.filter(
        (section: SectionInstance) => section.zone === zone && !section.parentSectionId
      );
      const moved = rootSectionsInZone[action.fromIndex] ?? null;
      if (!moved) return state;
      const result = moveSectionSubtree(state.sections, {
        sectionId: moved.id,
        toZone: zone,
        toParentSectionId: null,
        toIndex: action.toIndex,
      });
      if (!result.ok) return state;
      return { ...state, sections: result.sections };
    }

    default:
      return null;
  }
}
