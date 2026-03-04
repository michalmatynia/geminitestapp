import { reducePageBuilderMoveActions } from './page-builder-reducer-move-actions';
import { reducePageActions } from './page-builder-reducer/page-actions';
import { reduceSectionActions } from './page-builder-reducer/section-actions';
import { reduceBlockActions } from './page-builder-reducer/block-actions';
import { reduceGridActions } from './page-builder-reducer/grid-actions';
import { reduceComplexActions } from './page-builder-reducer/complex-actions';
import {
  cloneBlock,
  uid,
  findSection,
  findBlock,
  insertBlockIntoColumnBlocks,
} from './block-helpers';
import {
  buildHierarchyIndexes,
  cloneSectionSubtree,
  moveSectionSubtree,
} from './section-hierarchy';

import type {
  PageBuilderState,
  PageBuilderAction,
  SectionInstance,
} from '../../types/page-builder';

export function reducePageBuilderStateCore(
  state: PageBuilderState,
  action: PageBuilderAction
): PageBuilderState {
  const moveActionResult = reducePageBuilderMoveActions(state, action);
  if (moveActionResult) {
    return moveActionResult;
  }

  const pageResult = reducePageActions(state, action);
  if (pageResult) return pageResult;

  const sectionResult = reduceSectionActions(state, action);
  if (sectionResult) return sectionResult;

  const blockResult = reduceBlockActions(state, action);
  if (blockResult) return blockResult;

  const gridResult = reduceGridActions(state, action);
  if (gridResult) return gridResult;

  const complexResult = reduceComplexActions(state, action);
  if (complexResult) return complexResult;

  switch (action.type) {
    case 'SET_PAGE_STATUS': {
      if (!state.currentPage) return state;
      return { ...state, currentPage: { ...state.currentPage, status: action.status } };
    }

    case 'SET_PAGE_NAME': {
      if (!state.currentPage) return state;
      return { ...state, currentPage: { ...state.currentPage, name: action.name } };
    }

    case 'UPDATE_SEO': {
      if (!state.currentPage) return state;
      return { ...state, currentPage: { ...state.currentPage, ...action.seo } };
    }

    case 'UPDATE_PAGE_SLUGS': {
      if (!state.currentPage) return state;
      const nextSlugs = state.currentPage.slugs.map((slug, index) => ({
        ...slug,
        ...(action.slugIds[index] ? { slugId: action.slugIds[index] } : {}),
        ...(action.slugValues[index] ? { slug: action.slugValues[index] } : {}),
      }));
      return { ...state, currentPage: { ...state.currentPage, slugs: nextSlugs } };
    }

    case 'SET_PAGE_MENU_VISIBILITY': {
      if (!state.currentPage) return state;
      return { ...state, currentPage: { ...state.currentPage, showMenu: action.showMenu } };
    }

    case 'SET_PAGE_THEME': {
      if (!state.currentPage) return state;
      return { ...state, currentPage: { ...state.currentPage, themeId: action.themeId } };
    }

    case 'TOGGLE_INSPECTOR':
      return { ...state, inspectorEnabled: !state.inspectorEnabled };

    case 'UPDATE_INSPECTOR_SETTINGS':
      return {
        ...state,
        inspectorSettings: { ...state.inspectorSettings, ...action.settings },
      };

    case 'SET_PREVIEW_MODE':
      return { ...state, previewMode: action.mode };

    case 'TOGGLE_LEFT_PANEL':
      return { ...state, leftPanelCollapsed: !state.leftPanelCollapsed };

    case 'TOGGLE_RIGHT_PANEL':
      return { ...state, rightPanelCollapsed: !state.rightPanelCollapsed };

    case 'COPY_SECTION': {
      const section = findSection(state.sections, action.sectionId);
      if (!section) return state;
      const hierarchy = buildHierarchyIndexes(state.sections);
      const subtree: SectionInstance[] = [];
      const visit = (sectionId: string): void => {
        const node = hierarchy.nodeById.get(sectionId);
        if (!node) return;
        subtree.push(node);
        const childIds = hierarchy.childrenByParent.get(sectionId) ?? [];
        childIds.forEach((childId: string) => visit(childId));
      };
      visit(section.id);
      return {
        ...state,
        clipboard: {
          type: 'section_hierarchy',
          data: {
            rootSectionId: section.id,
            sections: subtree,
          },
        },
      };
    }

    case 'PASTE_SECTION': {
      let sourceSections: SectionInstance[] = [];
      let sourceRootId: string | null = null;
      if (state.clipboard?.type === 'section_hierarchy') {
        sourceSections = state.clipboard.data.sections;
        sourceRootId = state.clipboard.data.rootSectionId ?? null;
      } else if (state.clipboard?.type === 'section') {
        const source = state.clipboard.data;
        sourceSections = [source];
        sourceRootId = source.id;
      } else {
        return state;
      }

      if (!sourceRootId || sourceSections.length === 0) return state;

      const clonedSubtree = cloneSectionSubtree(sourceSections, sourceRootId, uid);
      const clonedRoot = clonedSubtree[0];
      if (!clonedRoot) return state;
      const sectionsWithClone = [...state.sections, ...clonedSubtree];
      const moveResult = moveSectionSubtree(sectionsWithClone, {
        sectionId: clonedRoot.id,
        toZone: action.zone,
        toParentSectionId: null,
        toIndex: Number.MAX_SAFE_INTEGER,
      });

      return {
        ...state,
        sections: moveResult.ok ? moveResult.sections : sectionsWithClone,
        selectedNodeId: clonedRoot.id,
      };
    }

    case 'COPY_BLOCK': {
      const located = findBlock(state.sections, action.blockId);
      if (!located) return state;
      return {
        ...state,
        clipboard: {
          type: 'block',
          data: located.block,
        },
      };
    }

    case 'PASTE_BLOCK': {
      if (state.clipboard?.type !== 'block') return state;
      const nextBlock = cloneBlock(state.clipboard.data);
      const nextSections = state.sections.map((section) => {
        if (section.id !== action.sectionId) return section;
        if (action.columnId) {
          return {
            ...section,
            blocks: insertBlockIntoColumnBlocks(
              section.blocks,
              action.columnId,
              nextBlock,
              Number.MAX_SAFE_INTEGER,
              action.parentBlockId
            ),
          };
        }
        return {
          ...section,
          blocks: [...section.blocks, nextBlock],
        };
      });
      return {
        ...state,
        sections: nextSections,
        selectedNodeId: nextBlock.id,
      };
    }

    default:
      return state;
  }
}
