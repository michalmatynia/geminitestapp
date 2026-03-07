import {
  DOCUMENTATION_MODULE_IDS,
  type DocumentationEntry,
} from '@/shared/contracts/documentation';

import {
  KANGUR_DOCUMENTATION_GUIDES,
  KANGUR_TOOLTIP_CATALOG,
  type KangurDocumentationGuide,
  type KangurTooltipDocEntry,
} from '../../../../../docs/kangur/tooltip-catalog';

export type { KangurDocumentationGuide, KangurTooltipDocEntry };

export const KANGUR_DOC_CATALOG: KangurTooltipDocEntry[] = KANGUR_TOOLTIP_CATALOG;
export const KANGUR_DOCUMENTATION_LIBRARY: KangurDocumentationGuide[] = KANGUR_DOCUMENTATION_GUIDES;

export const KANGUR_DOCUMENTATION_CATALOG: DocumentationEntry[] = KANGUR_DOC_CATALOG.map(
  (entry): DocumentationEntry => ({
    id: entry.id,
    moduleId: DOCUMENTATION_MODULE_IDS.kangur,
    title: entry.title,
    content: entry.summary,
    keywords: entry.aliases,
    ...(entry.docPath ? { relatedLinks: [entry.docPath] } : {}),
  })
);
