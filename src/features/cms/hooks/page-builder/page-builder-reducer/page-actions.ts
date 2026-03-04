/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  uid,
  syncNextIdFromSections,
  normalizeSections,
  buildSectionSettings,
} from '../block-helpers';
import { sanitizeSectionHierarchy } from '../section-hierarchy';
import { normalizePageZone } from '@/features/cms/utils/page-builder-normalization';
import type {
  PageBuilderState,
  PageBuilderAction,
  SectionInstance,
  BlockInstance,
  PageZone,
} from '../../../types/page-builder';

export function reducePageActions(
  state: PageBuilderState,
  action: PageBuilderAction
): PageBuilderState | null {
  switch (action.type) {
    case 'SET_PAGES':
      return { ...state, pages: (action as any).pages };

    case 'SET_CURRENT_PAGE': {
      const page = (action as any).page;
      const normalizedPage = {
        ...page,
        showMenu: page.showMenu ?? true,
      };
      const reconstructedSections: SectionInstance[] = (page.components ?? []).map(
        (comp: any, idx: number): SectionInstance => {
          const content = (comp.content ?? {}) as {
            zone?: PageZone;
            settings?: Record<string, unknown>;
            blocks?: BlockInstance[];
            sectionId?: string;
            parentSectionId?: string | null;
          };
          const resolvedSectionId =
            typeof content.sectionId === 'string' && content.sectionId.trim().length > 0
              ? content.sectionId
              : `loaded-${idx}-${uid()}`;
          const resolvedParentSectionId =
            typeof content.parentSectionId === 'string' && content.parentSectionId.trim().length > 0
              ? content.parentSectionId
              : null;
          return {
            id: resolvedSectionId,
            type: comp.type,
            zone: normalizePageZone(content.zone),
            parentSectionId: resolvedParentSectionId,
            settings: buildSectionSettings(comp.type, content.settings ?? {}),
            blocks: content.blocks ?? [],
          };
        }
      );
      const normalizedSections = sanitizeSectionHierarchy(normalizeSections(reconstructedSections));
      syncNextIdFromSections(normalizedSections);
      return {
        ...state,
        currentPage: normalizedPage,
        sections: normalizedSections,
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
