import type {
  PageBuilderState,
  PageBuilderAction,
  SectionInstance,
} from '@/features/cms/types/page-builder';
import type { Page } from '@/shared/contracts/cms';

import { syncNextIdFromSections } from '../block-helpers';

export function reducePageActions(
  state: PageBuilderState,
  action: PageBuilderAction
): PageBuilderState | null {
  switch (action.type) {
    case 'SET_PAGES':
      return { ...state, pages: action.pages as Page[] };

    case 'SET_CURRENT_PAGE': {
      const page = action.page as Page;
      const sections: SectionInstance[] = (page?.components ?? []).map(
        (comp): SectionInstance => {
          const content = comp.content;
          return {
            id: content.sectionId,
            type: comp.type,
            zone: content.zone,
            parentSectionId: content.parentSectionId,
            settings: content.settings,
            blocks: content.blocks,
          };
        }
      );
      syncNextIdFromSections(sections);
      return {
        ...state,
        currentPage: page,
        sections,
        selectedNodeId: null,
      };
    }

    case 'CLEAR_CURRENT_PAGE':
      return {
        ...state,
        currentPage: null,
        sections: [],
        selectedNodeId: null,
      };

    default:
      return null;
  }
}
